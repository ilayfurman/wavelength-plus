-- lock_guess only checked "is on the active team", so the psychic (who
-- already knows the target from submitting the clue) could also lock in
-- the guess for their own team. Client UI now hides the guess dial/button
-- from the psychic, but that's cosmetic only — enforce it server-side too.
create or replace function public.lock_guess(p_turn_id uuid, p_guess_position numeric)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  n_teams int;
  result public.turns_view;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'guessing' then raise exception 'Turn is not awaiting a guess'; end if;
  if not exists (
    select 1 from public.players where party_id = t.party_id and team_id = t.team_id and account_id = auth.uid()
  ) then
    raise exception 'Only the active team can lock in a guess';
  end if;
  if exists (select 1 from public.players where id = t.psychic_player_id and account_id = auth.uid()) then
    raise exception 'The psychic cannot lock in the guess';
  end if;
  if p_guess_position < 0 or p_guess_position > 1 then
    raise exception 'Guess must be between 0 and 1';
  end if;

  select count(*) into n_teams from public.teams where party_id = t.party_id;

  update public.turns set guess_position = p_guess_position, status = 'betting' where id = p_turn_id;

  if n_teams <= 1 then
    perform public.reveal_turn(p_turn_id);
  end if;

  select * into result from public.turns_view where id = p_turn_id;
  return result;
end;
$$;

grant execute on function public.lock_guess(uuid, numeric) to authenticated;
