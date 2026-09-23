create or replace function public.generate_share_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.packs where share_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create or replace function public.create_pack(p_name text)
returns public.packs
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.packs;
begin
  perform public.ensure_profile();
  insert into public.packs (owner_id, name, share_code)
  values (auth.uid(), p_name, public.generate_share_code())
  returning * into result;
  return result;
end;
$$;

grant execute on function public.create_pack(text) to authenticated;

create or replace function public.add_spectrum(p_pack_id uuid, p_left_label text, p_right_label text)
returns public.spectrums
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.spectrums;
begin
  if not exists (select 1 from public.packs where id = p_pack_id and owner_id = auth.uid()) then
    raise exception 'You do not own this pack';
  end if;
  insert into public.spectrums (pack_id, left_label, right_label)
  values (p_pack_id, p_left_label, p_right_label)
  returning * into result;
  return result;
end;
$$;

grant execute on function public.add_spectrum(uuid, text, text) to authenticated;

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

  return found_pack;
end;
$$;

grant execute on function public.add_pack_by_code(uuid, text) to authenticated;

create or replace function public.mute_player(p_party_id uuid, p_player_id uuid, p_seconds int default 30)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.players;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'Only the host can mute players';
  end if;
  update public.players
  set muted_until = now() + make_interval(secs => greatest(p_seconds, 1))
  where id = p_player_id and party_id = p_party_id
  returning * into result;
  if result.id is null then raise exception 'Player not found in this party'; end if;
  return result;
end;
$$;

grant execute on function public.mute_player(uuid, uuid, int) to authenticated;
