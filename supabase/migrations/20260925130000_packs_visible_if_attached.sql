-- Wiring up the Lobby's "Packs" picker (add_pack_by_code already existed
-- server-side, but nothing in the client ever called it — the PacksList
-- screen's own "Coming soon" copy literally says this belongs in the
-- lobby). Once a non-owner party member's client tries to show the name of
-- a pack someone else attached by share code, RLS blocks it — packs were
-- only readable by their owner or if public. Extend that to "or attached to
-- a party you're currently in", so every party member can see what packs
-- are actually in play, not just the host who added them.
drop policy "select own or public packs" on public.packs;
create policy "select own, public, or attached to my party" on public.packs for select
using (
  owner_id = auth.uid()
  or is_public
  or exists (
    select 1 from public.party_packs pp
    join public.players pl on pl.party_id = pp.party_id
    where pp.pack_id = packs.id and pl.account_id = auth.uid()
  )
);
