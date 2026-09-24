create or replace function public.set_noises_enabled(p_party_id uuid, p_noises_enabled boolean)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.parties;
begin
  update public.parties
  set noises_enabled = p_noises_enabled
  where id = p_party_id and host_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Not host, or party not found';
  end if;
  return result;
end;
$$;

grant execute on function public.set_noises_enabled(uuid, boolean) to authenticated;
