-- Lets the host restart a party (e.g. from the final scoreboard's "Play
-- again"/"New teams" buttons) by resetting status back to 'lobby' and
-- clearing turn bookkeeping, so shuffle_teams + start_game can run again.
--
-- This also deletes the party's turns (bets cascade via their own FK).
-- That's necessary, not just cosmetic: public.turns.team_id has no ON
-- DELETE behavior, so a finished party's old teams can't be deleted by a
-- subsequent shuffle_teams call while old turns still reference them,
-- which would otherwise make the "New teams" flow fail with a foreign key
-- violation. Restarting is a fresh game, so clearing turn history is the
-- correct behavior anyway, not just a workaround.
create or replace function public.restart_party(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.parties;
begin
  update public.parties
  set status = 'lobby',
      turn_order = '[]'::jsonb,
      turn_index = 0,
      used_spectrum_ids = '{}'
  where id = p_party_id and host_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Only the host can restart this party, or it was not found';
  end if;

  delete from public.turns where party_id = p_party_id;

  return result;
end;
$$;

grant execute on function public.restart_party(uuid) to authenticated;
