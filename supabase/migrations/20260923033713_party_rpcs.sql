create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;
end;
$$;

create or replace function public.generate_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.parties where room_code = code and status != 'finished') into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create or replace function public.create_party(p_team_size int default 2, p_rounds int default 3)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  new_party public.parties;
  starter_pack_id uuid;
begin
  perform public.ensure_profile();

  insert into public.parties (room_code, host_id, team_size, rounds)
  values (public.generate_room_code(), auth.uid(), greatest(p_team_size, 1), greatest(p_rounds, 1))
  returning * into new_party;

  select id into starter_pack_id from public.packs where share_code = 'STARTER';
  if starter_pack_id is not null then
    insert into public.party_packs (party_id, pack_id) values (new_party.id, starter_pack_id);
  end if;

  return new_party;
end;
$$;

grant execute on function public.create_party(int, int) to authenticated;

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

  insert into public.players (party_id, account_id, display_name, avatar)
  values (found_party.id, auth.uid(), p_display_name, p_avatar)
  on conflict (party_id, account_id)
  do update set display_name = excluded.display_name, avatar = excluded.avatar
  returning * into new_player;

  return new_player;
end;
$$;

grant execute on function public.join_party(text, text, text) to authenticated;
