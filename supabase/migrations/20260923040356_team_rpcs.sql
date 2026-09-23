create or replace function public.set_party_settings(
  p_party_id uuid, p_team_size int, p_rounds int, p_team_mode text, p_noises_enabled boolean
)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.parties;
begin
  update public.parties
  set team_size = greatest(p_team_size, 1),
      rounds = greatest(p_rounds, 1),
      team_mode = p_team_mode,
      noises_enabled = p_noises_enabled
  where id = p_party_id and host_id = auth.uid() and status = 'lobby'
  returning * into updated;

  if updated.id is null then
    raise exception 'Not host, party not in lobby, or party not found';
  end if;
  return updated;
end;
$$;

grant execute on function public.set_party_settings(uuid, int, int, text, boolean) to authenticated;

create or replace function public.shuffle_teams(p_party_id uuid)
returns setof public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  team_size int;
  player_ids uuid[];
  n_players int;
  n_teams int;
  team_names text[] := array['🌮 Tacos','😬 Yikes','🐝 Buzz','🦄 Unicorns','🦊 Foxes','🐙 Krakens','🌶️ Chili','🎈 Balloons'];
  new_team_id uuid;
  idx int := 1;
  team_idx int := 0;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby') then
    raise exception 'Not host or party not in lobby';
  end if;

  select p.team_size into team_size from public.parties p where p.id = p_party_id;

  delete from public.teams where party_id = p_party_id;

  select array_agg(id order by random()) into player_ids
  from public.players where party_id = p_party_id;
  n_players := coalesce(array_length(player_ids, 1), 0);

  if n_players = 0 then
    return;
  end if;

  n_teams := greatest(ceil(n_players::numeric / team_size)::int, 1);

  for team_idx in 0 .. n_teams - 1 loop
    insert into public.teams (party_id, name) values (p_party_id, team_names[(team_idx % array_length(team_names, 1)) + 1])
    returning id into new_team_id;

    while idx <= n_players and (idx - 1) < ((team_idx + 1) * n_players / n_teams) loop
      update public.players set team_id = new_team_id where id = player_ids[idx];
      idx := idx + 1;
    end loop;
  end loop;

  return query select * from public.teams where party_id = p_party_id;
end;
$$;

grant execute on function public.shuffle_teams(uuid) to authenticated;

create or replace function public.assign_manual_team(p_party_id uuid, p_player_id uuid, p_team_name text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_player public.players;
  target_team_id uuid;
  updated public.players;
begin
  select * into calling_player from public.players
  where id = p_player_id and party_id = p_party_id and account_id = auth.uid();
  if calling_player.id is null then
    raise exception 'Can only assign your own player row';
  end if;

  select id into target_team_id from public.teams where party_id = p_party_id and name = p_team_name;
  if target_team_id is null then
    insert into public.teams (party_id, name) values (p_party_id, p_team_name) returning id into target_team_id;
  end if;

  update public.players set team_id = target_team_id where id = p_player_id returning * into updated;
  return updated;
end;
$$;

grant execute on function public.assign_manual_team(uuid, uuid, text) to authenticated;
