-- Security fixes found in code review of Task 10/11 (place_bet, reveal_turn):
--
-- 1. place_bet checked that p_team_id != t.team_id (can't bet on your own
--    turn) and that the caller belongs to p_team_id, but never verified
--    p_team_id belongs to the SAME party as the turn. A player could pass a
--    turn_id from another party alongside their own (unrelated) team_id,
--    since both existing checks trivially pass, letting them insert a bet
--    that pollutes an unrelated party's turn/score and "have all teams bet"
--    count.
--
-- 2. reveal_turn had no caller-membership check at all: any authenticated
--    user who obtained a turn_id (regardless of party membership) could call
--    it. Add a party-membership gate using the same is_party_member() helper
--    from the Task 7 RLS-recursion fix.

create or replace function public.place_bet(p_turn_id uuid, p_team_id uuid, p_direction text)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  result public.bets;
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

  select count(*) into n_other_teams from public.teams where party_id = t.party_id and id != t.team_id;
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
