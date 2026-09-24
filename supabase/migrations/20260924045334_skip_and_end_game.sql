create or replace function public.skip_turn(p_party_id uuid)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  current_turn public.turns;
  result public.turns_view;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'Only the host can skip a turn';
  end if;

  select * into current_turn from public.turns
  where party_id = p_party_id order by created_at desc limit 1;
  if current_turn.id is null then
    raise exception 'No turn to skip';
  end if;

  if current_turn.status != 'revealed' then
    update public.turns set status = 'revealed' where id = current_turn.id;
  end if;

  select * into result from public.turns_view where id = current_turn.id;
  return result;
end;
$$;

grant execute on function public.skip_turn(uuid) to authenticated;

create or replace function public.end_game(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.parties;
begin
  update public.parties
  set status = 'finished'
  where id = p_party_id and host_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Only the host can end this party, or it was not found';
  end if;

  return result;
end;
$$;

grant execute on function public.end_game(uuid) to authenticated;
