-- A genuinely NEW player joining an already-shuffled/picked lobby left
-- everyone else's team assignment untouched, so only the newcomer sat
-- unassigned — the exact "half-assigned" state that forced us to block
-- Start and show a "reshuffle to include everyone" hint. Clearing everyone
-- back to unassigned on a real new join is cleaner: the host gets one clear
-- prompt to reshuffle/reassign with the FULL current roster, rather than a
-- partial state where some players are already set and one conspicuously
-- isn't. A rejoin under an existing account (on_conflict) leaves
-- assignments alone — nothing "new" happened there.
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

  if not already_member and exists (select 1 from public.teams where party_id = found_party.id) then
    update public.players set team_id = null where party_id = found_party.id;
  end if;

  return new_player;
end;
$$;

grant execute on function public.join_party(text, text, text) to authenticated;
