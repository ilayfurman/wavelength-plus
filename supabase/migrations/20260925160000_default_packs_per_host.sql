-- Remembers a host's last-used pack selection across parties, so they don't
-- have to re-attach the same custom packs (and re-remove the Starter deck)
-- every single time they create a new one. Saves implicitly — any time you
-- add or remove a pack while hosting, not via a separate "save as default"
-- step — matching how the rest of this app already auto-persists settings.
-- Defaults to the Starter deck's fixed seed id, so first-time hosts see
-- exactly today's current behavior.
alter table public.profiles
  add column default_pack_ids uuid[] not null default array['00000000-0000-0000-0000-000000000001']::uuid[];

create or replace function public.create_party(p_num_teams int default 2, p_rounds int default 3)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  new_party public.parties;
  starter_pack_id uuid;
  saved_pack_ids uuid[];
begin
  perform public.ensure_profile();

  insert into public.parties (room_code, host_id, num_teams, rounds)
  values (public.generate_room_code(), auth.uid(), greatest(p_num_teams, 1), greatest(p_rounds, 1))
  returning * into new_party;

  select default_pack_ids into saved_pack_ids from public.profiles where id = auth.uid();

  insert into public.party_packs (party_id, pack_id)
  select new_party.id, pid
  from unnest(coalesce(saved_pack_ids, array[]::uuid[])) as pid
  where exists (select 1 from public.packs where id = pid);

  -- Fall back to Starter if every saved pack turned out to no longer exist
  -- (deleted, etc.) — a party should never start with zero packs attached.
  if not exists (select 1 from public.party_packs where party_id = new_party.id) then
    select id into starter_pack_id from public.packs where share_code = 'STARTER';
    if starter_pack_id is not null then
      insert into public.party_packs (party_id, pack_id) values (new_party.id, starter_pack_id);
    end if;
  end if;

  return new_party;
end;
$$;

grant execute on function public.create_party(int, int) to authenticated;

create or replace function public.add_pack_by_code(p_party_id uuid, p_share_code text)
returns public.packs
language plpgsql
security definer
set search_path = public
as $$
declare
  found_pack public.packs;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'Only the host can add packs';
  end if;
  select * into found_pack from public.packs where share_code = upper(p_share_code);
  if found_pack.id is null then raise exception 'No pack with that code'; end if;

  insert into public.party_packs (party_id, pack_id) values (p_party_id, found_pack.id)
  on conflict do nothing;

  update public.profiles
  set default_pack_ids = (select coalesce(array_agg(pack_id), array[]::uuid[]) from public.party_packs where party_id = p_party_id)
  where id = auth.uid();

  return found_pack;
end;
$$;

grant execute on function public.add_pack_by_code(uuid, text) to authenticated;

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

  update public.profiles
  set default_pack_ids = (select coalesce(array_agg(pack_id), array[]::uuid[]) from public.party_packs where party_id = p_party_id)
  where id = auth.uid();
end;
$$;

grant execute on function public.remove_party_pack(uuid, uuid) to authenticated;
