-- Leaving mid-game was never handled: leave_party just deleted the player
-- unconditionally, regardless of party status. That could strand a team at
-- 1 player (or break turn_order references to a psychic who no longer
-- exists), leaving everyone else stuck with no way out short of closing the
-- tab. Rule: every team must always have at least 2 players (same
-- invariant shuffle_teams already enforces at setup) — if this player
-- leaving would drop their team below that, the game ends for everyone
-- right now, with a reason the client can show. Otherwise the game keeps
-- going; if the leaver was the current turn's psychic, that turn is forced
-- to reveal so the auto-advance flow can move past it.
alter table public.parties add column ended_reason text;

create or replace function public.leave_party(p_party_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_player_id uuid;
  my_team_id uuid;
  i_am_host boolean;
  new_host_account uuid;
  party_status text;
  team_size_before int;
  game_ended boolean := false;
begin
  select id, team_id into my_player_id, my_team_id
  from public.players where party_id = p_party_id and account_id = auth.uid();
  if my_player_id is null then
    raise exception 'Not a member of this party';
  end if;

  select status into party_status from public.parties where id = p_party_id;

  if party_status = 'playing' and my_team_id is not null then
    select count(*) into team_size_before from public.players where team_id = my_team_id;
    if team_size_before - 1 < 2 then
      update public.parties set status = 'finished', ended_reason = 'player_left' where id = p_party_id;
      game_ended := true;
    end if;
  end if;

  if party_status = 'playing' and not game_ended then
    -- Force the current turn to reveal if this player was mid-turn as
    -- psychic, so nobody's left waiting on someone who's gone. advance_turn
    -- already skips any future turn_order entries whose psychic has left.
    update public.turns
    set status = 'revealed'
    where id = (select id from public.turns where party_id = p_party_id order by created_at desc limit 1)
      and psychic_player_id = my_player_id
      and status != 'revealed';
  end if;

  select (host_id = auth.uid()) into i_am_host from public.parties where id = p_party_id;

  delete from public.players where id = my_player_id;

  if i_am_host then
    select account_id into new_host_account
    from public.players
    where party_id = p_party_id
    order by created_at asc
    limit 1;

    if new_host_account is not null then
      update public.parties set host_id = new_host_account where id = p_party_id;
    end if;
    -- If no players remain, the party is simply left orphaned — fine for a
    -- casual game, nothing else references it once nobody is present.
  end if;
end;
$$;

grant execute on function public.leave_party(uuid) to authenticated;

-- Skip any turn_order entry whose psychic has since left the party, instead
-- of creating a turn nobody can ever act on.
create or replace function public.advance_turn(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
declare
  party_row public.parties;
  current_turn public.turns;
  next_index int;
  next_entry jsonb;
  next_team_id uuid;
  next_psychic_id uuid;
  next_round int;
  next_spectrum_id uuid;
  new_turn public.turns;
begin
  select * into party_row from public.parties where id = p_party_id;
  if party_row.id is null then raise exception 'Party not found'; end if;
  if not exists (
    select 1 from public.players where party_id = p_party_id and account_id = auth.uid()
  ) then
    raise exception 'Not a member of this party';
  end if;

  select * into current_turn from public.turns
  where party_id = p_party_id order by created_at desc limit 1;
  if current_turn.id is null or current_turn.status is distinct from 'revealed' then
    raise exception 'Current turn has not been revealed yet';
  end if;

  next_index := party_row.turn_index;
  loop
    next_index := next_index + 1;
    if next_index >= jsonb_array_length(party_row.turn_order) then
      update public.parties set status = 'finished' where id = p_party_id;
      return current_turn; -- caller checks parties.status = 'finished' to know the game ended
    end if;
    next_entry := party_row.turn_order -> next_index;
    next_psychic_id := (next_entry->>'psychic_player_id')::uuid;
    exit when exists (select 1 from public.players where id = next_psychic_id);
  end loop;

  next_team_id := (next_entry->>'team_id')::uuid;
  next_round := (next_entry->>'round')::int;

  select id into next_spectrum_id from public.spectrums
  where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
    and id != all(party_row.used_spectrum_ids)
  order by random() limit 1;

  if next_spectrum_id is null then
    -- ran out of unique spectrums; allow repeats rather than dead-ending the game
    select id into next_spectrum_id from public.spectrums
    where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
    order by random() limit 1;
  end if;

  insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
  values (p_party_id, next_round, next_team_id, next_psychic_id, next_spectrum_id, random())
  returning * into new_turn;

  update public.parties
  set turn_index = next_index, used_spectrum_ids = array_append(used_spectrum_ids, next_spectrum_id)
  where id = p_party_id;

  return new_turn;
end;
$$;

grant execute on function public.advance_turn(uuid) to authenticated;

-- Clear any stale ended_reason when a rematch reopens the lobby, so it
-- doesn't linger and misdescribe how a LATER game ends.
create or replace function public.confirm_rematch(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  my_player_id uuid;
  am_host boolean;
  party_row public.parties;
begin
  select id into my_player_id from public.players where party_id = p_party_id and account_id = auth.uid();
  if my_player_id is null then
    raise exception 'Not a member of this party';
  end if;

  select * into party_row from public.parties where id = p_party_id;
  if party_row.id is null then
    raise exception 'Party not found';
  end if;

  am_host := (party_row.host_id = auth.uid());

  if am_host and party_row.status = 'finished' then
    update public.parties
    set status = 'lobby', turn_order = '[]'::jsonb, turn_index = 0, used_spectrum_ids = '{}', ended_reason = null
    where id = p_party_id
    returning * into party_row;

    delete from public.turns where party_id = p_party_id;
  end if;

  update public.players set confirmed_rematch = true where id = my_player_id;

  return party_row;
end;
$$;

grant execute on function public.confirm_rematch(uuid) to authenticated;
