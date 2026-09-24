-- Residual re-review findings, fix wave 2:
--
-- A. Nothing ever called reveal_turn for a 2+ team game. lock_guess only
--    auto-revealed in the n_teams <= 1 co-op case; for every normal
--    multi-team game the turn got stuck in 'betting' forever once all other
--    teams had bet, because no client/trigger/RPC ever called reveal_turn.
--    Fix: place_bet now checks, after recording the bet, whether every
--    other team that can actually bet (see B) has now bet, and if so calls
--    reveal_turn itself as part of the same call. Only the bet that
--    completes the set triggers a reveal; earlier bets do not, because the
--    count only reaches the required total on the last one. This is safe to
--    call more than once because reveal_turn already no-ops once the turn
--    is 'revealed', and place_bet itself refuses to run at all once the
--    turn has left 'betting' status, so a repeated/duplicate place_bet call
--    can never trigger a second reveal or double-score.
--
-- B. Empty teams (a team row with zero players, e.g. left behind by
--    assign_manual_team moving its last player elsewhere) were counted in
--    lock_guess's co-op check, place_bet's "did everyone bet" check, and
--    reveal_turn's "has everyone bet" guard. An empty team can never place
--    a bet, so any of those counts that included it could never be
--    satisfied, permanently blocking the auto-reveal from (A). Fix: all
--    three now only count teams that have at least one player, using the
--    same `exists (select 1 from public.players where team_id = teams.id)`
--    filter already established in 20260924130502_fix_empty_team_start_game.sql
--    for start_game. When every non-active team is empty, the remaining
--    "teams that need to bet" count is 1 (or 0), which lock_guess already
--    treats like the co-op case.
--
-- C. restart_party ("Play again" with the same teams) reset party status/
--    turn bookkeeping but left teams.score untouched, so a new game started
--    with carried-over scores from the previous game. Fix: reset every
--    team's score to 0 as part of restart_party.

create or replace function public.lock_guess(p_turn_id uuid, p_guess_position numeric)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  n_teams int;
  result public.turns_view;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'guessing' then raise exception 'Turn is not awaiting a guess'; end if;
  if not exists (
    select 1 from public.players where party_id = t.party_id and team_id = t.team_id and account_id = auth.uid()
  ) then
    raise exception 'Only the active team can lock in a guess';
  end if;
  if p_guess_position < 0 or p_guess_position > 1 then
    raise exception 'Guess must be between 0 and 1';
  end if;

  -- Only count teams that actually have players: an empty team (left behind
  -- by assign_manual_team) can never bet, so it must not count toward
  -- whether this is effectively a co-op (<=1 team) game.
  select count(*) into n_teams
  from public.teams
  where party_id = t.party_id
    and exists (select 1 from public.players where team_id = teams.id);

  update public.turns set guess_position = p_guess_position, status = 'betting' where id = p_turn_id;

  if n_teams <= 1 then
    perform public.reveal_turn(p_turn_id);
  end if;

  select * into result from public.turns_view where id = p_turn_id;
  return result;
end;
$$;

grant execute on function public.lock_guess(uuid, numeric) to authenticated;

create or replace function public.place_bet(p_turn_id uuid, p_team_id uuid, p_direction text)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  result public.bets;
  n_required_teams int;
  n_bets int;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'betting' then raise exception 'Turn is not accepting bets'; end if;
  if p_team_id = t.team_id then raise exception 'The active team cannot bet on its own turn'; end if;
  if p_direction not in ('left', 'right') then raise exception 'Direction must be left or right'; end if;
  if not exists (select 1 from public.teams where id = p_team_id and party_id = t.party_id) then
    raise exception 'That team is not part of this turn''s party';
  end if;
  if not exists (select 1 from public.players where team_id = p_team_id and account_id = auth.uid()) then
    raise exception 'You are not on that team';
  end if;

  insert into public.bets (turn_id, team_id, direction)
  values (p_turn_id, p_team_id, p_direction)
  on conflict (turn_id, team_id) do update set direction = excluded.direction
  returning * into result;

  -- Auto-reveal: if this bet was the last one needed from a team that can
  -- actually bet (i.e. has players), reveal the turn as part of this same
  -- call instead of leaving it stuck in 'betting' forever. Teams with no
  -- players are excluded from the count, matching lock_guess/reveal_turn.
  select count(*) into n_required_teams
  from public.teams
  where party_id = t.party_id
    and id != t.team_id
    and exists (select 1 from public.players where team_id = teams.id);

  select count(*) into n_bets from public.bets where turn_id = p_turn_id;

  if n_required_teams > 0 and n_bets >= n_required_teams then
    perform public.reveal_turn(p_turn_id);
  end if;

  return result;
end;
$$;

create or replace function public.reveal_turn(p_turn_id uuid)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  turn_score int;
  n_other_teams int;
  n_bets int;
  bet_rec record;
  target_side text;
  result public.turns_view;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if not public.is_party_member(t.party_id) then
    raise exception 'Not a member of this party';
  end if;
  if t.status = 'revealed' then
    select * into result from public.turns_view where id = p_turn_id;
    return result;
  end if;
  if t.status != 'betting' then
    raise exception 'Turn is not ready to reveal';
  end if;

  -- Only teams with players are required to bet; an empty team left behind
  -- by assign_manual_team can never place one.
  select count(*) into n_other_teams
  from public.teams
  where party_id = t.party_id
    and id != t.team_id
    and exists (select 1 from public.players where team_id = teams.id);
  select count(*) into n_bets from public.bets where turn_id = p_turn_id;

  if n_other_teams > 0 and n_bets < n_other_teams then
    raise exception 'Not all teams have bet yet';
  end if;

  turn_score := public.compute_score(t.target_position, t.guess_position);
  update public.teams set score = score + turn_score where id = t.team_id;

  target_side := case when t.target_position < t.guess_position then 'left' else 'right' end;

  for bet_rec in select * from public.bets where turn_id = p_turn_id loop
    update public.bets set correct = (bet_rec.direction = target_side) where id = bet_rec.id;
    if bet_rec.direction = target_side then
      update public.teams set score = score + 1 where id = bet_rec.team_id;
    end if;
  end loop;

  update public.turns set status = 'revealed' where id = p_turn_id;

  select * into result from public.turns_view where id = p_turn_id;
  return result;
end;
$$;

create or replace function public.restart_party(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.parties;
begin
  update public.parties
  set status = 'lobby',
      turn_order = '[]'::jsonb,
      turn_index = 0,
      used_spectrum_ids = '{}'
  where id = p_party_id and host_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Only the host can restart this party, or it was not found';
  end if;

  delete from public.turns where party_id = p_party_id;

  -- "Play again" with the same teams should start a fresh scoreboard, not
  -- carry over the previous game's cumulative scores.
  update public.teams set score = 0 where party_id = p_party_id;

  return result;
end;
$$;

grant execute on function public.restart_party(uuid) to authenticated;
