alter table public.profiles enable row level security;
alter table public.packs enable row level security;
alter table public.spectrums enable row level security;
alter table public.parties enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.party_packs enable row level security;
alter table public.turns enable row level security;
alter table public.bets enable row level security;

-- profiles: only your own row
create policy "select own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());

-- packs: your own, or public (starter deck)
create policy "select own or public packs" on public.packs for select
  using (owner_id = auth.uid() or is_public);

-- spectrums: readable if you can read the parent pack, or the pack is
-- attached to a party you're a player in
create policy "select spectrums via pack or party" on public.spectrums for select
  using (
    exists (select 1 from public.packs pk where pk.id = spectrums.pack_id and (pk.owner_id = auth.uid() or pk.is_public))
    or exists (
      select 1 from public.party_packs pp
      join public.players pl on pl.party_id = pp.party_id
      where pp.pack_id = spectrums.pack_id and pl.account_id = auth.uid()
    )
  );

-- parties: readable if you're the host or a player
create policy "select party if member" on public.parties for select
  using (host_id = auth.uid() or exists (
    select 1 from public.players pl where pl.party_id = parties.id and pl.account_id = auth.uid()
  ));

-- teams: readable if you're a member of that party
create policy "select teams if party member" on public.teams for select
  using (exists (
    select 1 from public.players pl where pl.party_id = teams.party_id and pl.account_id = auth.uid()
  ));

-- players: readable if you're a member of that party
create policy "select players if party member" on public.players for select
  using (exists (
    select 1 from public.players self where self.party_id = players.party_id and self.account_id = auth.uid()
  ));

-- party_packs: readable if party member
create policy "select party_packs if member" on public.party_packs for select
  using (exists (
    select 1 from public.players pl where pl.party_id = party_packs.party_id and pl.account_id = auth.uid()
  ));

-- turns: base table is NOT selectable directly by clients (only via
-- turns_view, and only writable via SECURITY DEFINER RPCs) — no select
-- policy is added, so RLS denies all client reads/writes by default.

-- bets: your own team's bet always visible; other teams' bets only after reveal
create policy "select own team bet or revealed" on public.bets for select
  using (
    exists (select 1 from public.turns t where t.id = bets.turn_id and t.status = 'revealed')
    or exists (
      select 1 from public.players pl where pl.team_id = bets.team_id and pl.account_id = auth.uid()
    )
  );

-- Hidden-target view: target_position only visible to the current
-- psychic (by account) or once the turn is revealed. Owned by the
-- migration role (postgres), which bypasses RLS on the base `turns`
-- table, so this view is the only read path for turn state.
create view public.turns_view as
select
  t.id,
  t.party_id,
  t.round_number,
  t.team_id,
  t.psychic_player_id,
  t.spectrum_id,
  case
    when t.status = 'revealed' then t.target_position
    when exists (
      select 1 from public.players p
      where p.id = t.psychic_player_id and p.account_id = auth.uid()
    ) then t.target_position
    else null
  end as target_position,
  t.clue_text,
  t.guess_position,
  t.status,
  t.created_at
from public.turns t
where exists (
  select 1 from public.players pl where pl.party_id = t.party_id and pl.account_id = auth.uid()
);

grant select on public.turns_view to authenticated;
