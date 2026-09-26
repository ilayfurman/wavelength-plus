-- The shuffle-reveal animation was broadcast to other players over an
-- ephemeral realtime broadcast message, sent only once at click time. If a
-- guest's socket wasn't in exactly the right state at that instant, the
-- message was just gone — no retry, no way to recover it. Everything else
-- in this app that needs to reliably reach every client goes through a
-- durable row change on `parties` (already proven solid all session, via
-- the same postgres_changes subscription Lobby already has for settings).
-- Piggybacking the shuffle signal on that same mechanism, instead of a
-- separate ephemeral channel, means a client can never simply miss it.
alter table public.parties add column shuffle_nonce bigint not null default 0;

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
    update public.parties set shuffle_nonce = shuffle_nonce + 1 where id = p_party_id;
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

  update public.parties set shuffle_nonce = shuffle_nonce + 1 where id = p_party_id;

  return query select * from public.teams where party_id = p_party_id;
end;
$$;

grant execute on function public.shuffle_teams(uuid) to authenticated;
