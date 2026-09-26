-- Lets the host detach any pack (including the Starter deck — it's just a
-- normal party_packs row, nothing special) as long as the party would still
-- have at least one spectrum available afterward. Removing the last one
-- would leave start_game with no card to deal at all.
create or replace function public.remove_party_pack(p_party_id uuid, p_pack_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_count int;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'Only the host can remove packs';
  end if;

  select count(*) into remaining_count
  from public.spectrums s
  where s.pack_id in (
    select pack_id from public.party_packs where party_id = p_party_id and pack_id != p_pack_id
  );

  if remaining_count = 0 then
    raise exception 'Can''t remove the last pack — the party needs at least one card available';
  end if;

  delete from public.party_packs where party_id = p_party_id and pack_id = p_pack_id;
end;
$$;

grant execute on function public.remove_party_pack(uuid, uuid) to authenticated;
