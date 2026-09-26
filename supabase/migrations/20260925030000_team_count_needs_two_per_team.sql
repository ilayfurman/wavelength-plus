-- num_teams previously floored at 2 real teams whenever there were >=2
-- players, which could still produce a 1-player team (e.g. 3 players, 2
-- teams -> a team of 2 and a team of 1). A single team should be a valid
-- choice (co-op / everyone together), and no team should ever end up with
-- only one player. Capping n_teams at floor(n_players / 2) guarantees every
-- team gets at least 2 players: with n_teams <= n_players/2, the nearly-even
-- split (each team gets floor(n_players/n_teams) or ceil of it) can never
-- round down below 2. That cap, plus never exceeding the host's configured
-- num_teams, IS the validation — there's no separate check needed because
-- the arithmetic can't produce a singleton team.
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

  n_teams := least(num_teams, greatest(1, n_players / 2));

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

  n_teams := least(num_teams, greatest(1, n_players / 2));

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
