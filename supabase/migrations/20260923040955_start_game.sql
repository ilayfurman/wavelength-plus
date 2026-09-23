create or replace function public.start_game(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
declare
  party_row public.parties;
  order_entries jsonb := '[]'::jsonb;
  team_rec record;
  team_players uuid[];
  player_id uuid;
  round_num int;
  first_spectrum_id uuid;
  first_turn public.turns;
  first_team_id uuid;
  first_psychic_id uuid;
begin
  select * into party_row from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby';
  if party_row.id is null then
    raise exception 'Not host or party not in lobby';
  end if;

  if not exists (select 1 from public.teams where party_id = p_party_id) then
    raise exception 'No teams assigned yet';
  end if;

  for round_num in 1 .. party_row.rounds loop
    for team_rec in select id from public.teams where party_id = p_party_id order by id loop
      select array_agg(id order by created_at) into team_players
      from public.players where team_id = team_rec.id;

      foreach player_id in array team_players loop
        order_entries := order_entries || jsonb_build_object(
          'round', round_num, 'team_id', team_rec.id, 'psychic_player_id', player_id
        );
      end loop;
    end loop;
  end loop;

  select (order_entries->0->>'team_id')::uuid, (order_entries->0->>'psychic_player_id')::uuid
  into first_team_id, first_psychic_id;

  select id into first_spectrum_id from public.spectrums
  where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
  order by random() limit 1;

  if first_spectrum_id is null then
    raise exception 'No spectrums available in the selected packs';
  end if;

  update public.parties
  set status = 'playing', turn_order = order_entries, turn_index = 0
  where id = p_party_id;

  insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
  values (p_party_id, 1, first_team_id, first_psychic_id, first_spectrum_id, random())
  returning * into first_turn;

  update public.parties set used_spectrum_ids = array_append(used_spectrum_ids, first_spectrum_id) where id = p_party_id;

  return first_turn;
end;
$$;

grant execute on function public.start_game(uuid) to authenticated;
