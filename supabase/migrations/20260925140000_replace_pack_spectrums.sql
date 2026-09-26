-- Lets a pack owner paste a complete replacement list (e.g. after editing it
-- with an AI) instead of manually deleting dozens of cards one at a time.
-- turns.spectrum_id has no ON DELETE clause (default RESTRICT), so a
-- spectrum that's actually been played in some game's history can't be
-- deleted without corrupting that history — this silently keeps those
-- instead of failing the whole operation, and reports how many it had to
-- leave in place so the owner isn't left wondering why the count doesn't
-- match exactly.
create or replace function public.replace_pack_spectrums(p_pack_id uuid, p_pairs jsonb)
returns table(removed int, added int, skipped_in_use int)
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_keys text[];
  existing_row record;
  pair jsonb;
  removed_count int := 0;
  added_count int := 0;
  skipped_count int := 0;
begin
  if not exists (select 1 from public.packs where id = p_pack_id and owner_id = auth.uid()) then
    raise exception 'You do not own this pack';
  end if;

  select array_agg(lower(elem->>'left') || '||' || lower(elem->>'right'))
  into wanted_keys
  from jsonb_array_elements(p_pairs) elem;
  wanted_keys := coalesce(wanted_keys, array[]::text[]);

  for existing_row in
    select id, left_label, right_label from public.spectrums where pack_id = p_pack_id
  loop
    if (lower(existing_row.left_label) || '||' || lower(existing_row.right_label)) = any(wanted_keys) then
      continue; -- already in the wanted list — keep as-is, don't re-insert it either
    end if;
    if exists (select 1 from public.turns where spectrum_id = existing_row.id) then
      skipped_count := skipped_count + 1;
      continue;
    end if;
    delete from public.spectrums where id = existing_row.id;
    removed_count := removed_count + 1;
  end loop;

  for pair in select * from jsonb_array_elements(p_pairs) loop
    if not exists (
      select 1 from public.spectrums
      where pack_id = p_pack_id
        and lower(left_label) = lower(pair->>'left')
        and lower(right_label) = lower(pair->>'right')
    ) then
      insert into public.spectrums (pack_id, left_label, right_label)
      values (p_pack_id, pair->>'left', pair->>'right');
      added_count := added_count + 1;
    end if;
  end loop;

  return query select removed_count, added_count, skipped_count;
end;
$$;

grant execute on function public.replace_pack_spectrums(uuid, jsonb) to authenticated;
