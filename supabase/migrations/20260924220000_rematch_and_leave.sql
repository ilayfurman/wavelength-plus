-- Supports the post-game "Play again" / "Leave game" flow:
--   * Any player (not just host) can trigger a rematch reset by confirming.
--   * Each player's own confirmation is independent — it only flips THEIR
--     avatar from grey to normal in the lobby, never forces anyone else's
--     screen. The shared reset (scores/turns cleared, status -> 'lobby')
--     only happens once, on whoever confirms first.
--   * Leaving removes that player outright; if the host leaves, another
--     remaining player is auto-promoted — this is an explicit action, so no
--     presence/disconnect detection is needed to make it safe.

alter table public.players add column if not exists confirmed_rematch boolean not null default false;
alter table public.parties add column if not exists has_started boolean not null default false;

create or replace function public.confirm_rematch(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  my_player_id uuid;
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

  -- First confirmer triggers the shared reset (same effect as restart_party,
  -- but callable by any member, not just the host).
  if party_row.status = 'finished' then
    update public.parties
    set status = 'lobby', turn_order = '[]'::jsonb, turn_index = 0, used_spectrum_ids = '{}'
    where id = p_party_id
    returning * into party_row;

    delete from public.turns where party_id = p_party_id;
    update public.teams set score = 0 where party_id = p_party_id;
  end if;

  update public.players set confirmed_rematch = true where id = my_player_id;

  return party_row;
end;
$$;

grant execute on function public.confirm_rematch(uuid) to authenticated;

create or replace function public.leave_party(p_party_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_player_id uuid;
  i_am_host boolean;
  new_host_account uuid;
begin
  select id into my_player_id from public.players where party_id = p_party_id and account_id = auth.uid();
  if my_player_id is null then
    raise exception 'Not a member of this party';
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

-- start_game marks the party as having played at least once (so the client
-- knows to show the rematch grey/confirmed avatar UI only for a REmatch
-- lobby, not the very first pre-game lobby), and resets everyone's
-- confirmed_rematch flag so it's ready to track the round after this one.
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
    for team_rec in
      select id from public.teams t
      where t.party_id = p_party_id
        and exists (select 1 from public.players pl where pl.team_id = t.id)
      order by id
    loop
      select array_agg(id order by created_at) into team_players
      from public.players where team_id = team_rec.id;

      foreach player_id in array team_players loop
        order_entries := order_entries || jsonb_build_object(
          'round', round_num, 'team_id', team_rec.id, 'psychic_player_id', player_id
        );
      end loop;
    end loop;
  end loop;

  if jsonb_array_length(order_entries) = 0 then
    raise exception 'No teams have players yet';
  end if;

  select (order_entries->0->>'team_id')::uuid, (order_entries->0->>'psychic_player_id')::uuid
  into first_team_id, first_psychic_id;

  select id into first_spectrum_id from public.spectrums
  where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
  order by random() limit 1;

  if first_spectrum_id is null then
    raise exception 'No spectrums available in the selected packs';
  end if;

  update public.parties
  set status = 'playing', turn_order = order_entries, turn_index = 0, has_started = true
  where id = p_party_id;

  update public.players set confirmed_rematch = false where party_id = p_party_id;

  insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
  values (p_party_id, 1, first_team_id, first_psychic_id, first_spectrum_id, random())
  returning * into first_turn;

  update public.parties set used_spectrum_ids = array_append(used_spectrum_ids, first_spectrum_id) where id = p_party_id;

  return first_turn;
end;
$$;

grant execute on function public.start_game(uuid) to authenticated;
