-- A brand-new player row defaulted confirmed_rematch to false (the column's
-- own default). That's correct for someone who was already in the finished
-- game and hasn't personally decided to continue — but it also applied to
-- someone joining completely fresh via room code while the lobby happened
-- to already be mid-rematch-reopen, which incorrectly showed them the OLD
-- game's final scoreboard ("hasn't decided yet") even though they were
-- never part of that game. Joining at all IS the decision, so a genuinely
-- new row starts out confirmed; on_conflict (rejoining under the same
-- account) still leaves an existing row's real decision untouched.
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

  insert into public.players (party_id, account_id, display_name, avatar, confirmed_rematch)
  values (found_party.id, auth.uid(), p_display_name, p_avatar, true)
  on conflict (party_id, account_id)
  do update set display_name = excluded.display_name, avatar = excluded.avatar
  returning * into new_player;

  return new_player;
end;
$$;

grant execute on function public.join_party(text, text, text) to authenticated;
