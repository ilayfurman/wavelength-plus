-- Nulling out team_id left the stale `teams` rows themselves in place
-- (now empty), which the host's own screen would still render as leftover
-- empty team boxes above the "everyone's waiting" list — and a joining
-- player could still see a fleeting team assignment before that clear took
-- effect. Deleting the teams outright (team_id's FK is ON DELETE SET NULL,
-- so this still clears every player's assignment) means there's simply
-- nothing team-related to show anyone until the host actually reshuffles or
-- sets up Pick mode again — no stale boxes, no flicker, no "wait, what team
-- am I on now" moment for someone who just joined.
create or replace function public.join_party(p_room_code text, p_display_name text, p_avatar text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  found_party public.parties;
  new_player public.players;
  already_member boolean;
begin
  perform public.ensure_profile();

  select * into found_party from public.parties where room_code = upper(p_room_code) and status = 'lobby';
  if found_party.id is null then
    raise exception 'No open party with that code';
  end if;

  delete from public.players
  where account_id = auth.uid()
    and party_id != found_party.id
    and party_id in (select id from public.parties where status != 'finished');

  select exists(
    select 1 from public.players where party_id = found_party.id and account_id = auth.uid()
  ) into already_member;

  insert into public.players (party_id, account_id, display_name, avatar, confirmed_rematch)
  values (found_party.id, auth.uid(), p_display_name, p_avatar, true)
  on conflict (party_id, account_id)
  do update set display_name = excluded.display_name, avatar = excluded.avatar
  returning * into new_player;

  if not already_member then
    delete from public.teams where party_id = found_party.id;
  end if;

  return new_player;
end;
$$;

grant execute on function public.join_party(text, text, text) to authenticated;
