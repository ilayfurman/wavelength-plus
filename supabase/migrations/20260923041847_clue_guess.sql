create or replace function public.submit_clue(p_turn_id uuid, p_clue_text text, p_skipped boolean default false)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  result public.turns_view;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'clue' then raise exception 'Turn is not awaiting a clue'; end if;
  if not exists (select 1 from public.players where id = t.psychic_player_id and account_id = auth.uid()) then
    raise exception 'Only the psychic can submit the clue';
  end if;

  update public.turns
  set clue_text = case when p_skipped then 'Said it out loud' else p_clue_text end,
      status = 'guessing'
  where id = p_turn_id;

  select * into result from public.turns_view where id = p_turn_id;
  return result;
end;
$$;

grant execute on function public.submit_clue(uuid, text, boolean) to authenticated;

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
