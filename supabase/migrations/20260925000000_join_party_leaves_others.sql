-- An account could end up as a player in many different non-finished
-- parties at once (create a party, never leave, create/join another,
-- repeat) — nothing ever cleaned up the old memberships. The client's
-- session-rehydration logic then picks essentially an arbitrary one of
-- those leftover parties on refresh, which looks like "leaving doesn't
-- work" even when leave_party itself is fine. An account should only ever
-- be an active member of one party at a time: joining or creating a new
-- one now first removes that account's player row from every other party
-- that isn't finished yet.
create or replace function public.join_party(p_room_code text, p_display_name text, p_avatar text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  found_party public.parties;
  new_player public.players;
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

  insert into public.players (party_id, account_id, display_name, avatar)
  values (found_party.id, auth.uid(), p_display_name, p_avatar)
  on conflict (party_id, account_id)
  do update set display_name = excluded.display_name, avatar = excluded.avatar
  returning * into new_player;

  return new_player;
end;
$$;

grant execute on function public.join_party(text, text, text) to authenticated;
