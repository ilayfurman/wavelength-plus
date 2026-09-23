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

  next_index := party_row.turn_index + 1;

  if next_index >= jsonb_array_length(party_row.turn_order) then
    update public.parties set status = 'finished' where id = p_party_id;
    return current_turn; -- caller checks parties.status = 'finished' to know the game ended
  end if;

  next_entry := party_row.turn_order -> next_index;
  next_team_id := (next_entry->>'team_id')::uuid;
  next_psychic_id := (next_entry->>'psychic_player_id')::uuid;
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
