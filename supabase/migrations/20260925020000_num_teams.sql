-- "Team size" was a confusing setting: with 2 players and a configured
-- team_size of 2, shuffle_teams computed ceil(2/2)=1 team, then a separate
-- "never just one team" floor bumped it back up to 2 teams of 1 player each
-- — which doesn't match what "team size 2" sounds like it should produce.
-- Renaming the concept to "number of teams" removes the ambiguity: the
-- setting IS the team count (clamped to sane bounds), so the resulting
-- split is always exactly what the setting says, and remainder players
-- naturally land in teams of different sizes without contradicting it.
alter table public.parties rename column team_size to num_teams;

-- Postgres won't let CREATE OR REPLACE rename a parameter — these three
-- must be dropped first.
drop function public.create_party(int, int);
drop function public.create_and_join_party(text, text, int, int);
drop function public.set_party_settings(uuid, int, int, text, boolean);

create or replace function public.create_party(p_num_teams int default 2, p_rounds int default 3)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  new_party public.parties;
  starter_pack_id uuid;
begin
  perform public.ensure_profile();

  insert into public.parties (room_code, host_id, num_teams, rounds)
  values (public.generate_room_code(), auth.uid(), greatest(p_num_teams, 1), greatest(p_rounds, 1))
  returning * into new_party;

  select id into starter_pack_id from public.packs where share_code = 'STARTER';
  if starter_pack_id is not null then
    insert into public.party_packs (party_id, pack_id) values (new_party.id, starter_pack_id);
  end if;

  return new_party;
end;
$$;

grant execute on function public.create_party(int, int) to authenticated;

create or replace function public.create_and_join_party(
  p_display_name text, p_avatar text, p_num_teams int default 2, p_rounds int default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_party public.parties;
  new_player public.players;
begin
  new_party := public.create_party(p_num_teams, p_rounds);
  new_player := public.join_party(new_party.room_code, p_display_name, p_avatar);
  return jsonb_build_object('party_id', new_party.id, 'room_code', new_party.room_code, 'player_id', new_player.id);
end;
$$;

grant execute on function public.create_and_join_party(text, text, int, int) to authenticated;

create or replace function public.set_party_settings(
  p_party_id uuid, p_num_teams int, p_rounds int, p_team_mode text, p_noises_enabled boolean
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
  set num_teams = greatest(p_num_teams, 1),
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
  num_teams int;
  player_ids uuid[];
  n_players int;
  n_teams int;
  team_names text[] := array['Pink Team','Sky Team','Violet Team','Gold Team'];
  new_team_id uuid;
  idx int := 1;
  team_idx int := 0;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby') then
    raise exception 'Not host or party not in lobby';
  end if;

  select p.num_teams into num_teams from public.parties p where p.id = p_party_id;

  delete from public.teams where party_id = p_party_id;

  select array_agg(id order by random()) into player_ids
  from public.players where party_id = p_party_id;
  n_players := coalesce(array_length(player_ids, 1), 0);

  if n_players = 0 then
    return;
  end if;

  -- The configured team count, but never more than there are players
  -- (no empty teams) and never fewer than 2 as long as at least 2 players
  -- exist (a single team can't compete against itself).
  n_teams := greatest(least(num_teams, n_players), least(n_players, 2));

  for team_idx in 0 .. n_teams - 1 loop
    insert into public.teams (party_id, name) values (
      p_party_id,
      case when team_idx < array_length(team_names, 1) then team_names[team_idx + 1]
           else team_names[(team_idx % array_length(team_names, 1)) + 1] || ' ' || (team_idx / array_length(team_names, 1) + 1)
      end
    )
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

create or replace function public.create_pick_teams(p_party_id uuid)
returns setof public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  num_teams int;
  n_players int;
  n_teams int;
  team_names text[] := array['Pink Team','Sky Team','Violet Team','Gold Team'];
  team_idx int := 0;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby') then
    raise exception 'Not host or party not in lobby';
  end if;

  if exists (
    select 1 from public.teams t
    where t.party_id = p_party_id and exists (select 1 from public.players pl where pl.team_id = t.id)
  ) then
    return query select * from public.teams where party_id = p_party_id;
    return;
  end if;

  select p.num_teams into num_teams from public.parties p where p.id = p_party_id;
  select count(*) into n_players from public.players where party_id = p_party_id;

  if n_players = 0 then
    return;
  end if;

  n_teams := greatest(least(num_teams, n_players), least(n_players, 2));

  delete from public.teams where party_id = p_party_id;

  for team_idx in 0 .. n_teams - 1 loop
    insert into public.teams (party_id, name) values (
      p_party_id,
      case when team_idx < array_length(team_names, 1) then team_names[team_idx + 1]
           else team_names[(team_idx % array_length(team_names, 1)) + 1] || ' ' || (team_idx / array_length(team_names, 1) + 1)
      end
    );
  end loop;

  return query select * from public.teams where party_id = p_party_id;
end;
$$;

grant execute on function public.create_pick_teams(uuid) to authenticated;
