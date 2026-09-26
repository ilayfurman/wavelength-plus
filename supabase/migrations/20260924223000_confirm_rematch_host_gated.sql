-- Correction: confirm_rematch previously let ANY player's confirmation
-- trigger the shared reset (status -> 'lobby'), which forced every other
-- player's screen to change too, even players who hadn't decided anything
-- yet. A non-host player's confirmation must be purely personal — it only
-- flips their own avatar to "confirmed" and never affects anyone else's
-- screen. Only the host's own confirmation actually opens the shared lobby,
-- since only the host can meaningfully run team setup anyway.
create or replace function public.confirm_rematch(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  my_player_id uuid;
  am_host boolean;
  party_row public.parties;
begin
  select id into my_player_id from public.players where party_id = p_party_id and account_id = auth.uid();
  if my_player_id is null then
    raise exception 'Not a member of this party';
  end if;

  select * into party_row from public.parties where id = p_party_id;
  if party_row.id is null then
    raise exception 'Party not found';
  end if;

  am_host := (party_row.host_id = auth.uid());

  if am_host and party_row.status = 'finished' then
    update public.parties
    set status = 'lobby', turn_order = '[]'::jsonb, turn_index = 0, used_spectrum_ids = '{}'
    where id = p_party_id
    returning * into party_row;

    delete from public.turns where party_id = p_party_id;
    update public.teams set score = 0 where party_id = p_party_id;
  end if;

  update public.players set confirmed_rematch = true where id = my_player_id;

  return party_row;
end;
$$;

grant execute on function public.confirm_rematch(uuid) to authenticated;
