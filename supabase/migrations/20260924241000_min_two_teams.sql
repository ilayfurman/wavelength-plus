-- shuffle_teams allowed collapsing to a single combined team (co-op mode)
-- whenever team_size >= player count, e.g. 2 players + team_size 2. That's
-- not really playable — there's no second team to bet against — and it
-- didn't match create_pick_teams, which always floors at 2. Both now floor
-- at 2 whenever there are at least 2 players, and only collapse to 1 team
-- when there's genuinely a single player in the whole party.
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
  team_names text[] := array['Pink Team','Sky Team','Violet Team','Gold Team'];
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

  n_teams := greatest(ceil(n_players::numeric / team_size)::int, least(n_players, 2));

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
