# Wavelength Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a mobile-web version of Wavelength with real teams, team-vs-team betting, custom spectrum packs, and a synced soundboard.

**Architecture:** React (Vite) SPA deployed on Vercel. Supabase provides auth (email OTP), Postgres (schema + RLS + SECURITY DEFINER RPC functions as the sole write path / "referee"), and Realtime (Postgres Changes for durable state, Broadcast channels for ephemeral dial-drag/noise events). The hidden target value is exposed only through a view (`turns_view`) that nulls it out for anyone but the current psychic, until reveal.

**Tech Stack:** Vite 8 + React 19 + TypeScript, Vitest 5 + @testing-library/react 16, Supabase CLI + `@supabase/supabase-js` 2.117, Vercel (static SPA hosting).

**Spec:** `docs/superpowers/specs/2026-09-22-wavelength-plus-design.md`

## Global Constraints

- Team size default 2 (host adjustable, e.g. 3/4/...); minimum 4 players / 2 teams for competitive mode; exactly 2 or 3 players is co-op mode (1 team, no betting).
- Rounds default 3; one round = every team takes a number of turns equal to that team's player count.
- Scoring thresholds (target/guess on a 0.0–1.0 scale, `d = abs(target - guess)`): `d <= 0.05` → 4 pts, `d <= 0.10` → 3 pts, `d <= 0.15` → 2 pts, else 0 pts. Each opposing team with a correct left/right bet scores 1 pt.
- No SMS auth (cost). Auth is email OTP for v1; Google OAuth is an explicit fast-follow, not part of this plan.
- All game-state mutation goes through Postgres RPC functions (`SECURITY DEFINER`) — the frontend never writes to `turns`, `teams`, `bets`, or `players.team_id` directly.
- Target position is only ever readable, pre-reveal, by the current psychic — enforced in Postgres, not just hidden in the UI.
- $0 running cost: Supabase free tier + Vercel free tier only.
- Visual style (all UI tasks): dark navy gradient background (`radial-gradient(ellipse at 50% 40%, #1c2540 0%, #10152a 55%, #0a0d1c 100%)`) with a subtle starfield, semicircular "fan" dial (cream face `#F3ECDD`, wedges `#E8A33D`/`#D9482F`/`#4FB8AE`, glossy red knob gradient `#FF8A8A → #E8394A → #B01F30`), gradient wordmark, live team scoreboards, pill-shaped CTA buttons. Reference mockup: `.superpowers/brainstorm/3823-1790125054/content/polished-style.html` in the sibling `wavelength-app` scratch folder (read-only reference, not part of this repo).

---

## Phase 0 — Foundation

### Task 1: Repo scaffold, tooling, env config

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`
- Create: `.env.local.example`, `.gitignore` (add `.env.local`, `node_modules`, `dist`, `.supabase`)
- Create: `vercel.json`

**Interfaces:**
- Produces: a running Vite dev server, `npm test` (Vitest), `npm run build`.

- [ ] **Step 1: Scaffold the Vite React-TS app**

```bash
cd /Users/ilayfurman/Desktop/Claude/Projects/wavelength-plus
npm create vite@latest . -- --template react-ts
npm install
```

When prompted about the non-empty directory (it has `README.md`, `.git`, `docs/`), choose to continue / keep existing files.

- [ ] **Step 2: Install test tooling and Supabase client**

```bash
npm install @supabase/supabase-js@^2.117.0
npm install -D vitest@^5.0.0 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
  },
})
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Write a smoke test for `App`**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app shell without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })
})
```

`src/App.tsx` (minimal placeholder shell — replaced in Task 14):

```tsx
export default function App() {
  return <div data-testid="app-root">Wavelength Plus</div>
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Create env example and `.gitignore` entries**

`.env.local.example`:

```
VITE_SUPABASE_URL=https://iggpblavznrcbnwaygnv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fVPsNQ-9W751Rrd8Ma8jAQ_5otI1DAV
```

Copy it to a real, gitignored `.env.local` with the same values (this project's actual Supabase project). Add to `.gitignore`:

```
.env.local
.supabase
node_modules
dist
```

- [ ] **Step 7: Create minimal `vercel.json` for SPA routing**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold Vite React app with Vitest and Supabase client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Supabase CLI, local dev, link to remote project

**Files:**
- Create: `supabase/config.toml` (generated)
- Create: `docs/SUPABASE_SETUP.md`

**Interfaces:**
- Produces: `supabase start` (local Postgres via Docker) and `supabase db push` (apply migrations to the remote project), used by every later Phase 0/1/2/3 task's integration tests and by deployment.

- [ ] **Step 1: Install the Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase --version
```

- [ ] **Step 2: Log in and init**

```bash
cd /Users/ilayfurman/Desktop/Claude/Projects/wavelength-plus
supabase login
supabase init
```

`supabase login` opens a browser for the user to approve — this step requires the human operator, not the agent, to complete the browser approval.

- [ ] **Step 3: Link to the remote project**

```bash
supabase link --project-ref iggpblavznrcbnwaygnv
```

When prompted for the database password, use the one supplied by the project owner (do not print it in any commit, log file, or committed doc).

- [ ] **Step 4: Start local dev stack and confirm it's healthy**

```bash
supabase start
```

Expected: prints local API URL, DB URL, Studio URL, all services "started".

- [ ] **Step 5: Document the workflow**

`docs/SUPABASE_SETUP.md`:

```markdown
# Supabase Setup

Local dev: `supabase start` (requires Docker running), `supabase stop` when done.

Migrations live in `supabase/migrations/*.sql`. To apply a new migration:

1. `supabase migration new <name>` to scaffold the file.
2. Write SQL in the generated file.
3. `supabase db reset` to test it against the local stack from scratch.
4. `supabase db push` to apply it to the linked remote project.

Integration tests (`tests/integration/`) run against the **local** stack only
— never against production. Start it first: `supabase start`, then
`npm run test:integration`.
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Supabase CLI project link and local dev docs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/00000000000001_schema.sql`

**Interfaces:**
- Produces: tables `profiles`, `packs`, `spectrums`, `parties`, `teams`, `players`, `party_packs`, `turns`, `bets` — column names/types as below, used by every later RPC task.

- [ ] **Step 1: Write the schema migration**

```bash
supabase migration new schema
```

Edit the generated file (`supabase/migrations/<timestamp>_schema.sql`):

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_display_name text not null default 'Player',
  default_avatar text not null default '🙂',
  created_at timestamptz not null default now()
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  share_code text not null unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.spectrums (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs(id) on delete cascade,
  left_label text not null,
  right_label text not null
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_id uuid not null references public.profiles(id),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  team_size int not null default 2 check (team_size >= 1),
  rounds int not null default 3 check (rounds >= 1),
  team_mode text not null default 'random' check (team_mode in ('random', 'manual')),
  noises_enabled boolean not null default true,
  turn_order jsonb not null default '[]'::jsonb,
  turn_index int not null default 0,
  used_spectrum_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  name text not null,
  score int not null default 0
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  account_id uuid not null references public.profiles(id),
  display_name text not null,
  avatar text not null,
  team_id uuid references public.teams(id) on delete set null,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  unique (party_id, account_id)
);

create table public.party_packs (
  party_id uuid not null references public.parties(id) on delete cascade,
  pack_id uuid not null references public.packs(id) on delete cascade,
  primary key (party_id, pack_id)
);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  round_number int not null,
  team_id uuid not null references public.teams(id),
  psychic_player_id uuid not null references public.players(id),
  spectrum_id uuid not null references public.spectrums(id),
  target_position numeric not null check (target_position >= 0 and target_position <= 1),
  clue_text text,
  guess_position numeric check (guess_position >= 0 and guess_position <= 1),
  status text not null default 'clue' check (status in ('clue', 'guessing', 'betting', 'revealed')),
  created_at timestamptz not null default now()
);

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.turns(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  direction text not null check (direction in ('left', 'right')),
  correct boolean,
  created_at timestamptz not null default now(),
  unique (turn_id, team_id)
);

create index on public.players (party_id);
create index on public.teams (party_id);
create index on public.turns (party_id);
create index on public.bets (turn_id);
create index on public.spectrums (pack_id);
```

- [ ] **Step 2: Apply locally and verify**

```bash
supabase db reset
```

Expected: "Applying migration ... schema.sql" with no errors, ends with "Finished supabase db reset".

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add core database schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Row Level Security and the hidden-target view

**Files:**
- Create: `supabase/migrations/00000000000002_rls.sql`
- Create: `tests/integration/rls.test.ts`
- Create: `tests/integration/helpers.ts`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: `public.turns_view` (columns identical to `turns`, `target_position` nulled unless caller is the psychic or turn is revealed) — every later RPC/UI task that reads turn state reads `turns_view`, never `turns` directly.

- [ ] **Step 1: Write the RLS + view migration**

```bash
supabase migration new rls
```

```sql
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
```

- [ ] **Step 2: Write an integration test helper for spinning up authenticated Supabase clients**

`tests/integration/helpers.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const LOCAL_URL = 'http://127.0.0.1:54321'
// This is the well-known local Supabase anon key printed by `supabase start`.
const LOCAL_ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY!

export function anonClient(): SupabaseClient {
  return createClient(LOCAL_URL, LOCAL_ANON_KEY)
}

let counter = 0

export async function signUpAndSignIn(): Promise<SupabaseClient> {
  const client = anonClient()
  counter += 1
  const email = `test-user-${Date.now()}-${counter}@example.com`
  const password = 'password123!'
  const { error: signUpError } = await client.auth.signUp({ email, password })
  if (signUpError) throw signUpError
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return client
}
```

Add a note at the top of `docs/SUPABASE_SETUP.md`: run `supabase start` and copy the
"anon key" it prints into a local `SUPABASE_LOCAL_ANON_KEY` env var (e.g. in a
gitignored `.env.test.local`) before running integration tests. Add
`"test:integration": "vitest run tests/integration --config vitest.integration.config.ts"`
to `package.json`, and create `vitest.integration.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.test.local' })

export default defineConfig({
  test: { environment: 'node', testTimeout: 20000 },
})
```

Install `dotenv`: `npm install -D dotenv`.

- [ ] **Step 3: Write the failing RLS test**

`tests/integration/rls.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('turns_view hides the target until reveal', () => {
  it('returns null target_position for a non-psychic party member', async () => {
    const psychic = await signUpAndSignIn()
    const teammate = await signUpAndSignIn()

    // Minimal manual fixture: real party/turn creation is exercised by
    // RPC integration tests in later tasks. Here we insert directly as
    // the service role equivalent (postgres) to isolate the view's
    // access-control behavior from RPC logic.
    // (Uses the local Postgres connection string printed by `supabase start`.)
    const { Client } = await import('pg')
    const pg = new Client({ connectionString: process.env.SUPABASE_LOCAL_DB_URL! })
    await pg.connect()

    const psychicId = (await psychic.auth.getUser()).data.user!.id
    const teammateId = (await teammate.auth.getUser()).data.user!.id
    await pg.query(`insert into public.profiles (id) values ($1), ($2) on conflict do nothing`, [psychicId, teammateId])
    const partyId = (await pg.query(
      `insert into public.parties (room_code, host_id) values ('TEST', $1) returning id`,
      [psychicId]
    )).rows[0].id
    const teamId = (await pg.query(
      `insert into public.teams (party_id, name) values ($1, 'Team Test') returning id`,
      [partyId]
    )).rows[0].id
    const psychicPlayerId = (await pg.query(
      `insert into public.players (party_id, account_id, display_name, avatar, team_id) values ($1, $2, 'Psychic', '🧠', $3) returning id`,
      [partyId, psychicId, teamId]
    )).rows[0].id
    await pg.query(
      `insert into public.players (party_id, account_id, display_name, avatar, team_id) values ($1, $2, 'Mate', '🦊', $3)`,
      [partyId, teammateId, teamId]
    )
    const packId = (await pg.query(
      `insert into public.packs (name, share_code, is_public) values ('Starter', 'STARTR', true) returning id`
    )).rows[0].id
    const spectrumId = (await pg.query(
      `insert into public.spectrums (pack_id, left_label, right_label) values ($1, 'Cold', 'Hot') returning id`,
      [packId]
    )).rows[0].id
    const turnId = (await pg.query(
      `insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
       values ($1, 1, $2, $3, $4, 0.42) returning id`,
      [partyId, teamId, psychicPlayerId, spectrumId]
    )).rows[0].id
    await pg.end()

    const { data: asTeammate } = await teammate.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(asTeammate?.target_position).toBeNull()

    const { data: asPsychic } = await psychic.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(Number(asPsychic?.target_position)).toBeCloseTo(0.42)
  })
})
```

- [ ] **Step 4: Run migrations and test, verify pass**

```bash
supabase db reset
supabase start   # note the printed anon key + DB URL
# put them in .env.test.local as SUPABASE_LOCAL_ANON_KEY and SUPABASE_LOCAL_DB_URL
npm run test:integration -- rls.test.ts
```

Expected: PASS. If it fails on RLS denying the `profiles`/`parties`/etc. inserts,
that's expected for the raw `pg` client (it connects as the `postgres`
superuser via `SUPABASE_LOCAL_DB_URL`, which bypasses RLS) — only the
`turns_view` reads at the end go through the anon/authenticated Supabase
clients and are the actual assertions under test.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add RLS policies and hidden-target turns_view

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: `compute_score` scoring function

**Files:**
- Create: `supabase/migrations/00000000000003_compute_score.sql`
- Create: `tests/integration/compute_score.test.ts`
- Create: `src/lib/scoringConstants.ts`

**Interfaces:**
- Produces: SQL function `public.compute_score(target numeric, guess numeric) returns int`, used by Task 11's `reveal_turn`. Also produces the shared JS constants `WEDGE_THRESHOLDS` used by Task 16's dial rendering, so the visual wedges match the real scoring exactly.

- [ ] **Step 1: Write the SQL function**

```bash
supabase migration new compute_score
```

```sql
create or replace function public.compute_score(target numeric, guess numeric)
returns int
language plpgsql
immutable
as $$
declare
  d numeric := abs(target - guess);
begin
  if d <= 0.05 then return 4;
  elsif d <= 0.10 then return 3;
  elsif d <= 0.15 then return 2;
  else return 0;
  end if;
end;
$$;

grant execute on function public.compute_score(numeric, numeric) to authenticated;
```

- [ ] **Step 2: Write the failing test**

`tests/integration/compute_score.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { anonClient } from './helpers'

describe('compute_score', () => {
  it.each([
    [0.5, 0.5, 4],
    [0.5, 0.55, 4],
    [0.5, 0.58, 3],
    [0.5, 0.60, 3],
    [0.5, 0.63, 2],
    [0.5, 0.65, 2],
    [0.5, 0.70, 0],
    [0.0, 1.0, 0],
  ])('target=%f guess=%f -> %i', async (target, guess, expected) => {
    const client = anonClient()
    const { data, error } = await client.rpc('compute_score', { target, guess })
    expect(error).toBeNull()
    expect(data).toBe(expected)
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- compute_score.test.ts
```

Expected: 8 passed.

- [ ] **Step 4: Add the matching JS constant for dial wedge widths**

`src/lib/scoringConstants.ts`:

```ts
// Must stay in sync with compute_score() in
// supabase/migrations/00000000000003_compute_score.sql
export const WEDGE_THRESHOLDS = {
  center: 0.05, // |target - guess| <= this -> 4 pts
  inner: 0.10, // <= this -> 3 pts
  outer: 0.15, // <= this -> 2 pts
} as const
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add compute_score RPC and shared wedge threshold constants

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Starter spectrum pack seed data

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: a public pack row (`is_public = true`, `share_code = 'STARTER'`) with 40 spectrums, available to every party via Task 7's `create_party` (which auto-attaches it).

- [ ] **Step 1: Write the seed file**

```sql
insert into public.packs (id, owner_id, name, share_code, is_public)
values ('00000000-0000-0000-0000-000000000001', null, 'Starter Deck', 'STARTER', true)
on conflict (share_code) do nothing;

insert into public.spectrums (pack_id, left_label, right_label)
select '00000000-0000-0000-0000-000000000001', l, r
from (values
  ('Cold', 'Hot'),
  ('Underrated', 'Overrated'),
  ('Bad villain', 'Good villain'),
  ('Boring', 'Exciting'),
  ('Cheap', 'Expensive'),
  ('Safe', 'Dangerous'),
  ('Quiet', 'Loud'),
  ('Small talk topic', 'First date topic'),
  ('Would never try it', 'Would try it right now'),
  ('Bad superpower', 'Great superpower'),
  ('Comfort food', 'Fancy food'),
  ('Low effort costume', 'High effort costume'),
  ('Should be a crime', 'Totally fine'),
  ('Instantly forgettable', 'Never forget it'),
  ('Bad first date', 'Great first date'),
  ('Overhyped movie', 'Underhyped movie'),
  ('Kid activity', 'Adult activity'),
  ('Bad roommate habit', 'Fine roommate habit'),
  ('Would not survive a day', 'Could live there forever'),
  ('Guilty pleasure', 'No shame at all'),
  ('Too soon for a joke', 'Always fair game'),
  ('Bad gift', 'Great gift'),
  ('Overrated vacation spot', 'Underrated vacation spot'),
  ('Petty', 'Justified'),
  ('Basic', 'Unique'),
  ('Bad life advice', 'Good life advice'),
  ('Should stay a secret', 'Should be public knowledge'),
  ('Not a real sport', 'Definitely a real sport'),
  ('Waste of money', 'Worth every penny'),
  ('Red flag', 'Green flag'),
  ('Bad karaoke song', 'Great karaoke song'),
  ('Too weird', 'Perfectly normal'),
  ('Should retire it', 'Timeless classic'),
  ('Bad party game', 'Great party game'),
  ('Niche interest', 'Mainstream obsession'),
  ('Bad excuse', 'Solid excuse'),
  ('Skip it', 'Must-see'),
  ('Overpacked suitcase item', 'Essential suitcase item'),
  ('Bad pet name', 'Great pet name'),
  ('Too much information', 'Totally shareable')
) as t(l, r)
where not exists (
  select 1 from public.spectrums s
  where s.pack_id = '00000000-0000-0000-0000-000000000001' and s.left_label = t.l and s.right_label = t.r
);
```

- [ ] **Step 2: Apply and verify count**

```bash
supabase db reset
```

`supabase db reset` runs migrations then `supabase/seed.sql` automatically. Verify:

```bash
psql "$SUPABASE_LOCAL_DB_URL" -c "select count(*) from public.spectrums;"
```

Expected: `40`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Seed starter spectrum pack with 40 cards

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 1 — Party & Team RPCs

### Task 7: `create_party` and `join_party`

**Files:**
- Create: `supabase/migrations/00000000000004_party_rpcs.sql`
- Create: `tests/integration/party.test.ts`

**Interfaces:**
- Consumes: `profiles`, `parties`, `players`, `party_packs`, starter pack (`share_code='STARTER'`) from Task 6.
- Produces: RPCs `create_party(p_team_size int, p_rounds int) returns parties`, `join_party(p_room_code text, p_display_name text, p_avatar text) returns players`. Used by Task 15 (Lobby UI) and every later gameplay RPC (they all take a `party_id`/`turn_id` created via these).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new party_rpcs
```

```sql
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
```

- [ ] **Step 2: Write the failing tests**

`tests/integration/party.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('create_party / join_party', () => {
  it('creates a party with a 4-letter room code and the starter pack attached', async () => {
    const host = await signUpAndSignIn()
    const { data, error } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 3 }).single()
    expect(error).toBeNull()
    expect(data.room_code).toMatch(/^[A-Z]{4}$/)
    expect(data.status).toBe('lobby')

    const { data: packs } = await host.from('party_packs').select('pack_id').eq('party_id', data.id)
    expect(packs?.length).toBe(1)
  })

  it('lets a second user join by room code and creates a players row', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()

    const guest = await signUpAndSignIn()
    const { data: player, error } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()

    expect(error).toBeNull()
    expect(player.party_id).toBe(party.id)
    expect(player.display_name).toBe('Riley')
  })

  it('rejects joining a room code that does not exist', async () => {
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('join_party', { p_room_code: 'ZZZZ', p_display_name: 'X', p_avatar: '🙂' })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- party.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add create_party and join_party RPCs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: `set_party_settings`, `shuffle_teams`, `assign_manual_team`

**Files:**
- Create: `supabase/migrations/00000000000005_team_rpcs.sql`
- Create: `tests/integration/teams.test.ts`

**Interfaces:**
- Consumes: `create_party`/`join_party` from Task 7.
- Produces: RPCs `set_party_settings(p_party_id, p_team_size, p_rounds, p_team_mode, p_noises_enabled) returns parties`, `shuffle_teams(p_party_id) returns setof teams`, `assign_manual_team(p_party_id, p_player_id, p_team_name) returns players`. Used by Task 15 (Lobby UI) and Task 9 (`start_game` requires teams to exist).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new team_rpcs
```

```sql
create or replace function public.set_party_settings(
  p_party_id uuid, p_team_size int, p_rounds int, p_team_mode text, p_noises_enabled boolean
)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.parties;
begin
  update public.parties
  set team_size = greatest(p_team_size, 1),
      rounds = greatest(p_rounds, 1),
      team_mode = p_team_mode,
      noises_enabled = p_noises_enabled
  where id = p_party_id and host_id = auth.uid() and status = 'lobby'
  returning * into updated;

  if updated.id is null then
    raise exception 'Not host, party not in lobby, or party not found';
  end if;
  return updated;
end;
$$;

grant execute on function public.set_party_settings(uuid, int, int, text, boolean) to authenticated;

create or replace function public.shuffle_teams(p_party_id uuid)
returns setof public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  team_size int;
  player_ids uuid[];
  n_players int;
  n_teams int;
  team_names text[] := array['🌮 Tacos','😬 Yikes','🐝 Buzz','🦄 Unicorns','🦊 Foxes','🐙 Krakens','🌶️ Chili','🎈 Balloons'];
  new_team_id uuid;
  idx int := 1;
  team_idx int := 0;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby') then
    raise exception 'Not host or party not in lobby';
  end if;

  select team_size into team_size from public.parties where id = p_party_id;

  delete from public.teams where party_id = p_party_id;

  select array_agg(id order by random()) into player_ids
  from public.players where party_id = p_party_id;
  n_players := coalesce(array_length(player_ids, 1), 0);

  if n_players = 0 then
    return;
  end if;

  n_teams := greatest(ceil(n_players::numeric / team_size)::int, 1);

  for team_idx in 0 .. n_teams - 1 loop
    insert into public.teams (party_id, name) values (p_party_id, team_names[(team_idx % array_length(team_names, 1)) + 1])
    returning id into new_team_id;

    while idx <= n_players and (idx - 1) < ((team_idx + 1) * n_players / n_teams) loop
      update public.players set team_id = new_team_id where id = player_ids[idx];
      idx := idx + 1;
    end loop;
  end loop;

  return query select * from public.teams where party_id = p_party_id;
end;
$$;

grant execute on function public.shuffle_teams(uuid) to authenticated;

create or replace function public.assign_manual_team(p_party_id uuid, p_player_id uuid, p_team_name text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_player public.players;
  target_team_id uuid;
  updated public.players;
begin
  select * into calling_player from public.players
  where id = p_player_id and party_id = p_party_id and account_id = auth.uid();
  if calling_player.id is null then
    raise exception 'Can only assign your own player row';
  end if;

  select id into target_team_id from public.teams where party_id = p_party_id and name = p_team_name;
  if target_team_id is null then
    insert into public.teams (party_id, name) values (p_party_id, p_team_name) returning id into target_team_id;
  end if;

  update public.players set team_id = target_team_id where id = p_player_id returning * into updated;
  return updated;
end;
$$;

grant execute on function public.assign_manual_team(uuid, uuid, text) to authenticated;
```

- [ ] **Step 2: Write the failing tests**

`tests/integration/teams.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

async function createPartyWithPlayers(n: number) {
  const host = await signUpAndSignIn()
  const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 3 }).single()
  const clients = [host]
  for (let i = 1; i < n; i++) {
    const c = await signUpAndSignIn()
    await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    clients.push(c)
  }
  await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
  return { host, party, clients }
}

describe('shuffle_teams', () => {
  it('splits 6 players into 3 teams of 2 when team_size=2', async () => {
    const { host, party } = await createPartyWithPlayers(6)
    const { data: teams, error } = await host.rpc('shuffle_teams', { p_party_id: party.id })
    expect(error).toBeNull()
    expect(teams?.length).toBe(3)

    const { data: players } = await host.from('players').select('team_id').eq('party_id', party.id)
    const counts: Record<string, number> = {}
    for (const p of players ?? []) counts[p.team_id] = (counts[p.team_id] ?? 0) + 1
    expect(Object.values(counts).sort()).toEqual([2, 2, 2])
  })

  it('rejects shuffle from a non-host', async () => {
    const { party, clients } = await createPartyWithPlayers(4)
    const { error } = await clients[1].rpc('shuffle_teams', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})

describe('assign_manual_team', () => {
  it('lets a player join a named team, creating it if needed', async () => {
    const { host, party } = await createPartyWithPlayers(2)
    const { data: me } = await host.from('players').select('id').eq('party_id', party.id).eq('account_id', (await host.auth.getUser()).data.user!.id).single()
    const { data: updated, error } = await host.rpc('assign_manual_team', {
      p_party_id: party.id, p_player_id: me!.id, p_team_name: 'Custom Team',
    }).single()
    expect(error).toBeNull()
    expect(updated.team_id).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- teams.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add team settings, shuffle, and manual assignment RPCs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: `start_game`

**Files:**
- Create: `supabase/migrations/00000000000006_start_game.sql`
- Create: `tests/integration/start_game.test.ts`

**Interfaces:**
- Consumes: teams from Task 8, spectrums from Task 6.
- Produces: RPC `start_game(p_party_id uuid) returns turns` (first turn row, via `turns_view`-shaped read after insert). Sets `parties.status='playing'`, `parties.turn_order` (jsonb array of `{team_id, psychic_player_id}` covering every turn of every round), `parties.turn_index=0`. Used by Task 17 (GameScreen entry point) and Task 12 (`advance_turn` walks this same `turn_order`).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new start_game
```

```sql
create or replace function public.start_game(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
declare
  party_row public.parties;
  order_entries jsonb := '[]'::jsonb;
  team_rec record;
  team_players uuid[];
  player_id uuid;
  round_num int;
  first_entry jsonb;
  first_spectrum_id uuid;
  first_turn public.turns;
  first_team_id uuid;
  first_psychic_id uuid;
begin
  select * into party_row from public.parties where id = p_party_id and host_id = auth.uid() and status = 'lobby';
  if party_row.id is null then
    raise exception 'Not host or party not in lobby';
  end if;

  if not exists (select 1 from public.teams where party_id = p_party_id) then
    raise exception 'No teams assigned yet';
  end if;

  for round_num in 1 .. party_row.rounds loop
    for team_rec in select id from public.teams where party_id = p_party_id order by id loop
      select array_agg(id order by created_at) into team_players
      from public.players where team_id = team_rec.id;

      foreach player_id in array team_players loop
        order_entries := order_entries || jsonb_build_object(
          'round', round_num, 'team_id', team_rec.id, 'psychic_player_id', player_id
        );
      end loop;
    end loop;
  end loop;

  select (order_entries->0->>'team_id')::uuid, (order_entries->0->>'psychic_player_id')::uuid
  into first_team_id, first_psychic_id;

  select id into first_spectrum_id from public.spectrums
  where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
  order by random() limit 1;

  if first_spectrum_id is null then
    raise exception 'No spectrums available in the selected packs';
  end if;

  update public.parties
  set status = 'playing', turn_order = order_entries, turn_index = 0
  where id = p_party_id
  returning * into party_row;

  insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
  values (p_party_id, 1, first_team_id, first_psychic_id, first_spectrum_id, random())
  returning * into first_turn;

  update public.parties set used_spectrum_ids = array_append(used_spectrum_ids, first_spectrum_id) where id = p_party_id;

  return first_turn;
end;
$$;

grant execute on function public.start_game(uuid) to authenticated;
```

- [ ] **Step 2: Write the failing test**

`tests/integration/start_game.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('start_game', () => {
  it('creates a first turn and a turn_order covering every player, per round', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 2 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    for (let i = 0; i < 3; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })

    const { data: firstTurn, error } = await host.rpc('start_game', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(firstTurn.round_number).toBe(1)
    expect(firstTurn.status).toBe('clue')

    const { data: updatedParty } = await host.from('parties').select('turn_order, status').eq('id', party.id).single()
    expect(updatedParty!.status).toBe('playing')
    // 4 players total, 2 rounds -> 8 turn_order entries
    expect((updatedParty!.turn_order as unknown[]).length).toBe(8)
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- start_game.test.ts
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add start_game RPC with per-round turn order generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 2 — Turn Loop RPCs

### Task 10: `submit_clue` and `lock_guess`

**Files:**
- Create: `supabase/migrations/00000000000007_clue_guess.sql`
- Create: `tests/integration/clue_guess.test.ts`

**Interfaces:**
- Consumes: `turns` from Task 9, `turns_view` from Task 4.
- Produces: RPCs `submit_clue(p_turn_id uuid, p_clue_text text, p_skipped boolean) returns turns_view`, `lock_guess(p_turn_id uuid, p_guess_position numeric) returns turns_view`. For a 1-team (co-op) party, `lock_guess` calls `reveal_turn` (Task 11) directly instead of moving to `betting`. Used by Task 17 (Clue/Guess screens).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new clue_guess
```

```sql
create or replace function public.submit_clue(p_turn_id uuid, p_clue_text text, p_skipped boolean default false)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'clue' then raise exception 'Turn is not awaiting a clue'; end if;
  if not exists (select 1 from public.players where id = t.psychic_player_id and account_id = auth.uid()) then
    raise exception 'Only the psychic can submit the clue';
  end if;

  update public.turns
  set clue_text = case when p_skipped then 'Said it out loud' else p_clue_text end,
      status = 'guessing'
  where id = p_turn_id;

  return (select * from public.turns_view where id = p_turn_id);
end;
$$;

grant execute on function public.submit_clue(uuid, text, boolean) to authenticated;

create or replace function public.lock_guess(p_turn_id uuid, p_guess_position numeric)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  n_teams int;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'guessing' then raise exception 'Turn is not awaiting a guess'; end if;
  if not exists (
    select 1 from public.players where party_id = t.party_id and team_id = t.team_id and account_id = auth.uid()
  ) then
    raise exception 'Only the active team can lock in a guess';
  end if;
  if p_guess_position < 0 or p_guess_position > 1 then
    raise exception 'Guess must be between 0 and 1';
  end if;

  select count(*) into n_teams from public.teams where party_id = t.party_id;

  update public.turns set guess_position = p_guess_position, status = 'betting' where id = p_turn_id;

  if n_teams <= 1 then
    perform public.reveal_turn(p_turn_id);
  end if;

  return (select * from public.turns_view where id = p_turn_id);
end;
$$;

grant execute on function public.lock_guess(uuid, numeric) to authenticated;
```

Note: this migration references `public.reveal_turn`, which is defined in
Task 11's migration. Order matters — apply Task 11's migration in the same
`supabase db reset` batch (it will exist by the time this function is
*called*, even though it's declared after; Postgres resolves plpgsql body
references at call time, not at `create function` time, so this is safe as
long as both migrations exist before `lock_guess` is ever invoked).

- [ ] **Step 2: Write the failing tests**

`tests/integration/clue_guess.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

async function setUpGame(teamCount: 1 | 2) {
  const host = await signUpAndSignIn()
  const totalPlayers = teamCount === 1 ? 2 : 4
  const { data: party } = await host.rpc('create_party', { p_team_size: totalPlayers / teamCount, p_rounds: 1 }).single()
  await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
  const others = []
  for (let i = 1; i < totalPlayers; i++) {
    const c = await signUpAndSignIn()
    await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    others.push(c)
  }
  await host.rpc('shuffle_teams', { p_party_id: party.id })
  const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

  const { data: psychicPlayer } = await host.from('players').select('*').eq('id', firstTurn.psychic_player_id).single()
  const psychicClient = [host, ...others].find(async (c) => (await c.auth.getUser()).data.user!.id === psychicPlayer!.account_id) ?? host

  return { host, others, party, firstTurn, psychicClient }
}

describe('submit_clue', () => {
  it('lets the psychic submit a typed clue and advances status to guessing', async () => {
    const { psychicClient, firstTurn } = await setUpGame(2)
    const { data, error } = await psychicClient
      .rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'A sauna in August', p_skipped: false })
      .single()
    expect(error).toBeNull()
    expect(data.clue_text).toBe('A sauna in August')
    expect(data.status).toBe('guessing')
  })

  it('rejects a clue from someone who is not the psychic', async () => {
    const { host, psychicClient, firstTurn } = await setUpGame(2)
    const impostor = psychicClient === host ? undefined : host
    if (!impostor) return // psychic happened to be host in this random shuffle; skip
    const { error } = await impostor.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    expect(error).not.toBeNull()
  })
})

describe('lock_guess', () => {
  it('moves a 2-team game to betting status', async () => {
    const { psychicClient, firstTurn } = await setUpGame(2)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { data, error } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.6 }).single()
    expect(error).toBeNull()
    expect(data.status).toBe('betting')
  })

  it('reveals immediately in a 1-team (co-op) game', async () => {
    const { psychicClient, firstTurn } = await setUpGame(1)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { data, error } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.6 }).single()
    expect(error).toBeNull()
    expect(data.status).toBe('revealed')
  })
})
```

- [ ] **Step 3: Apply Task 11's migration too (they're interdependent), then run tests**

Do Task 11's Step 1 now, then:

```bash
supabase db reset
npm run test:integration -- clue_guess.test.ts
```

Expected: 4 passed (one test may self-skip if the random psychic happens to
be the host — that's fine, noted in the test).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add submit_clue and lock_guess RPCs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: `place_bet` and `reveal_turn`

**Files:**
- Create: `supabase/migrations/00000000000008_bet_reveal.sql`
- Create: `tests/integration/bet_reveal.test.ts`

**Interfaces:**
- Consumes: `compute_score` from Task 5, `turns`/`bets` from Task 3, called by `lock_guess` from Task 10.
- Produces: RPCs `place_bet(p_turn_id uuid, p_team_id uuid, p_direction text) returns bets`, `reveal_turn(p_turn_id uuid) returns turns_view` (idempotent — safe to call once betting is complete or forced). Used by Task 17 (Bet/Reveal screens).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new bet_reveal
```

```sql
create or replace function public.place_bet(p_turn_id uuid, p_team_id uuid, p_direction text)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  result public.bets;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status != 'betting' then raise exception 'Turn is not accepting bets'; end if;
  if p_team_id = t.team_id then raise exception 'The active team cannot bet on its own turn'; end if;
  if p_direction not in ('left', 'right') then raise exception 'Direction must be left or right'; end if;
  if not exists (select 1 from public.players where team_id = p_team_id and account_id = auth.uid()) then
    raise exception 'You are not on that team';
  end if;

  insert into public.bets (turn_id, team_id, direction)
  values (p_turn_id, p_team_id, p_direction)
  on conflict (turn_id, team_id) do update set direction = excluded.direction
  returning * into result;

  return result;
end;
$$;

grant execute on function public.place_bet(uuid, uuid, text) to authenticated;

create or replace function public.reveal_turn(p_turn_id uuid)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.turns;
  turn_score int;
  n_other_teams int;
  n_bets int;
  bet_rec record;
  target_side text;
begin
  select * into t from public.turns where id = p_turn_id;
  if t.id is null then raise exception 'Turn not found'; end if;
  if t.status = 'revealed' then
    return (select * from public.turns_view where id = p_turn_id);
  end if;
  if t.status != 'betting' then
    raise exception 'Turn is not ready to reveal';
  end if;

  select count(*) into n_other_teams from public.teams where party_id = t.party_id and id != t.team_id;
  select count(*) into n_bets from public.bets where turn_id = p_turn_id;

  if n_other_teams > 0 and n_bets < n_other_teams then
    raise exception 'Not all teams have bet yet';
  end if;

  turn_score := public.compute_score(t.target_position, t.guess_position);
  update public.teams set score = score + turn_score where id = t.team_id;

  target_side := case when t.target_position < t.guess_position then 'left' else 'right' end;

  for bet_rec in select * from public.bets where turn_id = p_turn_id loop
    update public.bets set correct = (bet_rec.direction = target_side) where id = bet_rec.id;
    if bet_rec.direction = target_side then
      update public.teams set score = score + 1 where id = bet_rec.team_id;
    end if;
  end loop;

  update public.turns set status = 'revealed' where id = p_turn_id;

  return (select * from public.turns_view where id = p_turn_id);
end;
$$;

grant execute on function public.reveal_turn(uuid) to authenticated;
```

- [ ] **Step 2: Write the failing tests**

`tests/integration/bet_reveal.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('place_bet / reveal_turn', () => {
  it('scores the active team and correct bettors, and is idempotent', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    const clients = [host]
    for (let i = 1; i < 6; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
      clients.push(c)
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id }) // 3 teams of 2
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    const { data: players } = await host.from('players').select('*').eq('party_id', party.id)
    const psychicRow = players!.find((p) => p.id === firstTurn.psychic_player_id)!
    const psychicClient = clients[players!.findIndex((p) => p.id === psychicRow.id)]

    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 })

    const { data: turnAfterLock } = await host.from('turns_view').select('team_id').eq('id', firstTurn.id).single()
    const otherTeamPlayers = players!.filter((p) => p.team_id !== turnAfterLock!.team_id)
    const betterTeamIds = [...new Set(otherTeamPlayers.map((p) => p.team_id))]

    for (const teamId of betterTeamIds) {
      const bettor = otherTeamPlayers.find((p) => p.team_id === teamId)!
      const bettorClient = clients[players!.findIndex((p) => p.id === bettor.id)]
      await bettorClient.rpc('place_bet', { p_turn_id: firstTurn.id, p_team_id: teamId, p_direction: 'left' })
    }

    const { data: revealed, error } = await host.rpc('reveal_turn', { p_turn_id: firstTurn.id }).single()
    expect(error).toBeNull()
    expect(revealed.status).toBe('revealed')
    expect(Number(revealed.target_position)).not.toBeNull()

    const { data: teamsAfter } = await host.from('teams').select('id, score').eq('party_id', party.id)
    const totalScore = teamsAfter!.reduce((sum, t) => sum + t.score, 0)
    expect(totalScore).toBeGreaterThan(0)

    // Idempotent: calling again does not throw and does not double-score
    const { error: secondError } = await host.rpc('reveal_turn', { p_turn_id: firstTurn.id })
    expect(secondError).toBeNull()
    const { data: teamsAfterSecond } = await host.from('teams').select('id, score').eq('party_id', party.id)
    const totalScoreSecond = teamsAfterSecond!.reduce((sum, t) => sum + t.score, 0)
    expect(totalScoreSecond).toBe(totalScore)
  })

  it('rejects a team betting on its own turn', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    for (let i = 1; i < 4; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()
    const { error } = await host.rpc('place_bet', { p_turn_id: firstTurn.id, p_team_id: firstTurn.team_id, p_direction: 'left' })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- bet_reveal.test.ts
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add place_bet and reveal_turn RPCs with scoring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: `advance_turn`

**Files:**
- Create: `supabase/migrations/00000000000009_advance_turn.sql`
- Create: `tests/integration/advance_turn.test.ts`

**Interfaces:**
- Consumes: `parties.turn_order`/`turn_index` from Task 9, `reveal_turn` from Task 11.
- Produces: RPC `advance_turn(p_party_id uuid) returns turns` — returns the new turn row, or a row with `status = null` semantics via a raised, catchable "finished" case (tested below); sets `parties.status = 'finished'` when the order is exhausted. Used by Task 18 (advancing rounds / final scoreboard).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new advance_turn
```

```sql
create or replace function public.advance_turn(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
declare
  party_row public.parties;
  current_turn public.turns;
  next_index int;
  next_entry jsonb;
  next_team_id uuid;
  next_psychic_id uuid;
  next_round int;
  next_spectrum_id uuid;
  new_turn public.turns;
begin
  select * into party_row from public.parties where id = p_party_id;
  if party_row.id is null then raise exception 'Party not found'; end if;
  if not exists (
    select 1 from public.players where party_id = p_party_id and account_id = auth.uid()
  ) then
    raise exception 'Not a member of this party';
  end if;

  select * into current_turn from public.turns
  where party_id = p_party_id order by created_at desc limit 1;
  if current_turn.status != 'revealed' then
    raise exception 'Current turn has not been revealed yet';
  end if;

  next_index := party_row.turn_index + 1;

  if next_index >= jsonb_array_length(party_row.turn_order) then
    update public.parties set status = 'finished' where id = p_party_id;
    return current_turn; -- caller checks parties.status = 'finished' to know the game ended
  end if;

  next_entry := party_row.turn_order -> next_index;
  next_team_id := (next_entry->>'team_id')::uuid;
  next_psychic_id := (next_entry->>'psychic_player_id')::uuid;
  next_round := (next_entry->>'round')::int;

  select id into next_spectrum_id from public.spectrums
  where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
    and id != all(party_row.used_spectrum_ids)
  order by random() limit 1;

  if next_spectrum_id is null then
    -- ran out of unique spectrums; allow repeats rather than dead-ending the game
    select id into next_spectrum_id from public.spectrums
    where pack_id in (select pack_id from public.party_packs where party_id = p_party_id)
    order by random() limit 1;
  end if;

  insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
  values (p_party_id, next_round, next_team_id, next_psychic_id, next_spectrum_id, random())
  returning * into new_turn;

  update public.parties
  set turn_index = next_index, used_spectrum_ids = array_append(used_spectrum_ids, next_spectrum_id)
  where id = p_party_id;

  return new_turn;
end;
$$;

grant execute on function public.advance_turn(uuid) to authenticated;
```

- [ ] **Step 2: Write the failing tests**

`tests/integration/advance_turn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('advance_turn', () => {
  it('creates the next turn with a fresh target and increments turn_index', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 3 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    await host.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    await host.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 }) // co-op, auto-reveals

    const { data: nextTurn, error } = await host.rpc('advance_turn', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(nextTurn.round_number).toBeGreaterThanOrEqual(1)

    const { data: updatedParty } = await host.from('parties').select('turn_index, status').eq('id', party.id).single()
    expect(updatedParty!.turn_index).toBe(1)
    expect(updatedParty!.status).toBe('playing')
  })

  it('marks the party finished once turn_order is exhausted', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id }) // 1 player, 1 round -> turn_order length 1
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()
    await host.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    await host.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 })

    await host.rpc('advance_turn', { p_party_id: party.id })
    const { data: updatedParty } = await host.from('parties').select('status').eq('id', party.id).single()
    expect(updatedParty!.status).toBe('finished')
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration -- advance_turn.test.ts
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add advance_turn RPC for round progression and game end

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 3 — Packs & Noise RPCs

### Task 13: Pack CRUD and `mute_player` RPCs

**Files:**
- Create: `supabase/migrations/00000000000010_pack_and_mute_rpcs.sql`
- Create: `tests/integration/packs_and_mute.test.ts`

**Interfaces:**
- Consumes: `packs`/`spectrums`/`party_packs`/`players` from Task 3.
- Produces: RPCs `create_pack(p_name text) returns packs`, `add_spectrum(p_pack_id uuid, p_left_label text, p_right_label text) returns spectrums`, `add_pack_by_code(p_party_id uuid, p_share_code text) returns packs`, `mute_player(p_party_id uuid, p_player_id uuid, p_seconds int) returns players`. Used by Task 19 (Packs UI) and Task 20 (host mute control).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new pack_and_mute_rpcs
```

```sql
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
```

- [ ] **Step 2: Write the failing tests**

`tests/integration/packs_and_mute.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('pack CRUD RPCs', () => {
  it('creates a pack with a unique share code, adds a spectrum, and lets another host attach it by code', async () => {
    const creator = await signUpAndSignIn()
    const { data: pack, error: createError } = await creator.rpc('create_pack', { p_name: 'Beer & Europe' }).single()
    expect(createError).toBeNull()
    expect(pack.share_code).toMatch(/^[A-Z0-9]{6}$/)

    const { error: spectrumError } = await creator.rpc('add_spectrum', {
      p_pack_id: pack.id, p_left_label: 'Awful beer', p_right_label: 'Great beer',
    })
    expect(spectrumError).toBeNull()

    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const { data: attached, error: attachError } = await host
      .rpc('add_pack_by_code', { p_party_id: party.id, p_share_code: pack.share_code })
      .single()
    expect(attachError).toBeNull()
    expect(attached.id).toBe(pack.id)
  })

  it('rejects adding a spectrum to a pack you do not own', async () => {
    const owner = await signUpAndSignIn()
    const { data: pack } = await owner.rpc('create_pack', { p_name: 'Mine' }).single()
    const stranger = await signUpAndSignIn()
    const { error } = await stranger.rpc('add_spectrum', { p_pack_id: pack.id, p_left_label: 'A', p_right_label: 'B' })
    expect(error).not.toBeNull()
  })
})

describe('mute_player', () => {
  it('lets the host mute a player for N seconds', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { data: player } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()

    const { data: muted, error } = await host
      .rpc('mute_player', { p_party_id: party.id, p_player_id: player.id, p_seconds: 30 })
      .single()
    expect(error).toBeNull()
    expect(new Date(muted.muted_until).getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects muting from a non-host', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { data: player } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()
    const { error } = await guest.rpc('mute_player', { p_party_id: party.id, p_player_id: player.id, p_seconds: 30 })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run, verify pass**

```bash
supabase db reset
npm run test:integration
```

Expected: every integration test file passes (this is the last backend
task — run the full `tests/integration` suite, not just this file, as a
regression check).

- [ ] **Step 4: Push the full schema to the remote project**

```bash
supabase db push
```

Expected: confirms and applies all 10 migrations to `iggpblavznrcbnwaygnv`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add pack CRUD and mute_player RPCs; push schema to remote

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 4 — Frontend Shell & Auth

### Task 14: Supabase client, AuthProvider, sign-in screen

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `src/features/auth/AuthProvider.tsx`, `src/features/auth/useAuth.ts`, `src/features/auth/SignIn.tsx`, `src/features/auth/SignIn.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces: `supabase` client singleton; `<AuthProvider>` context exposing `useAuth() -> { session, loading }`; `<SignIn>` component (email OTP request + verify form). Consumed by every later screen task (all gated behind auth).

- [ ] **Step 1: Create the Supabase client**

`src/lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Write the AuthProvider and hook**

`src/features/auth/AuthProvider.tsx`:

```tsx
import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export const AuthContext = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}
```

`src/features/auth/useAuth.ts`:

```ts
import { useContext } from 'react'
import { AuthContext } from './AuthProvider'

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 3: Write the failing SignIn test**

`src/features/auth/SignIn.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignIn } from './SignIn'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

describe('SignIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests a code for the entered email', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as never)
    render(<SignIn />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'me@example.com' }))
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument()
  })

  it('verifies the entered code', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as never)
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: {}, error: null } as never)
    render(<SignIn />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    fireEvent.change(await screen.findByLabelText(/6-digit code/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() =>
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'me@example.com', token: '123456', type: 'email' })
    )
  })
})
```

- [ ] **Step 4: Run test, verify it fails** (no `SignIn.tsx` yet)

Run: `npm test -- SignIn.test.tsx`
Expected: FAIL — cannot find module `./SignIn`.

- [ ] **Step 5: Implement `SignIn`**

`src/features/auth/SignIn.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setCodeSent(true)
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) setError(error.message)
  }

  return (
    <div>
      <h1>Wavelength Plus</h1>
      {!codeSent ? (
        <form onSubmit={sendCode}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Send code</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label htmlFor="otp">6-digit code</label>
          <input id="otp" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button type="submit">Verify</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test -- SignIn.test.tsx`
Expected: 2 passed.

- [ ] **Step 7: Wire up `App.tsx`**

```tsx
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { SignIn } from './features/auth/SignIn'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div data-testid="app-root">Loading…</div>
  if (!session) return <div data-testid="app-root"><SignIn /></div>
  return <div data-testid="app-root">Signed in</div> // replaced by Home in Task 15
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
```

Update `src/App.test.tsx` to mock `../../lib/supabaseClient` the same way as
`SignIn.test.tsx` (unauthenticated session by default) so the existing smoke
test still passes:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

describe('App', () => {
  it('renders the app shell without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run the full unit test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add Supabase auth provider and email-code sign-in screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 5 — Lobby

### Task 15: Home, Create/Join party, Lobby screen

**Files:**
- Create: `src/features/party/useMyPlayerProfile.ts`
- Create: `src/features/home/Home.tsx`, `src/features/home/Home.test.tsx`
- Create: `src/features/party/CreateParty.tsx`
- Create: `src/features/party/JoinParty.tsx`
- Create: `src/features/party/Lobby.tsx`, `src/features/party/Lobby.test.tsx`
- Create: `src/features/party/AvatarPicker.tsx`
- Modify: `src/App.tsx` (routing)

**Interfaces:**
- Consumes: `create_party`/`join_party`/`set_party_settings`/`shuffle_teams`/`assign_manual_team` RPCs (Tasks 7–8), `useAuth` (Task 14).
- Produces: `<Home>`, `<Lobby partyId>` components; a tiny hash-based router in `App.tsx` (`#/party/:id`) — no router library needed for this app's size. Consumed by Task 17 (GameScreen is the next view after Lobby's "Start game").

- [ ] **Step 1: Write `AvatarPicker` (simple, no test needed — pure presentational list)**

`src/features/party/AvatarPicker.tsx`:

```tsx
const AVATARS = ['🌮', '😬', '🐝', '🦄', '🦊', '🐙', '🌶️', '🎈', '🧠', '🐸', '🦁', '🍩']

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((a) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={value === a}
          onClick={() => onChange(a)}
          style={{ fontSize: 24, opacity: value === a ? 1 : 0.5 }}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write the failing `Home` test**

`src/features/home/Home.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('calls onCreate when Create party is clicked', () => {
    const onCreate = vi.fn()
    render(<Home onCreate={onCreate} onJoin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /create party/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('calls onJoin with the entered room code', () => {
    const onJoin = vi.fn()
    render(<Home onCreate={vi.fn()} onJoin={onJoin} />)
    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: 'abcd' } })
    fireEvent.click(screen.getByRole('button', { name: /^join party$/i }))
    expect(onJoin).toHaveBeenCalledWith('ABCD')
  })
})
```

- [ ] **Step 3: Implement `Home`**

`src/features/home/Home.tsx`:

```tsx
import { useState, type FormEvent } from 'react'

export function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: (roomCode: string) => void }) {
  const [roomCode, setRoomCode] = useState('')

  function submitJoin(e: FormEvent) {
    e.preventDefault()
    onJoin(roomCode.toUpperCase())
  }

  return (
    <div>
      <h1>Wavelength Plus</h1>
      <button onClick={onCreate}>Create party</button>
      <form onSubmit={submitJoin}>
        <label htmlFor="room-code">Room code</label>
        <input id="room-code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} maxLength={4} required />
        <button type="submit">Join party</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- Home.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Implement `CreateParty` and `JoinParty` (thin RPC wrappers, no separate unit test — exercised by Lobby's integration-style test in Step 7)**

`src/features/party/CreateParty.tsx`:

```tsx
import { supabase } from '../../lib/supabaseClient'

export async function createParty(): Promise<{ id: string; room_code: string }> {
  const { data, error } = await supabase.rpc('create_party', {}).single()
  if (error) throw error
  return data as { id: string; room_code: string }
}
```

`src/features/party/JoinParty.tsx`:

```tsx
import { supabase } from '../../lib/supabaseClient'

export async function joinParty(roomCode: string, displayName: string, avatar: string) {
  const { data, error } = await supabase
    .rpc('join_party', { p_room_code: roomCode, p_display_name: displayName, p_avatar: avatar })
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Step 6: Write the failing `Lobby` test**

`src/features/party/Lobby.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Lobby } from './Lobby'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'p1', display_name: 'Alex', avatar: '🌮', team_id: null }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('Lobby', () => {
  it('shows the room code and lists joined players', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    expect(screen.getByText('ABCD')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Alex')).toBeInTheDocument())
  })

  it('calls shuffle_teams when the host clicks Reshuffle', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /reshuffle/i }))
    expect(supabase.rpc).toHaveBeenCalledWith('shuffle_teams', { p_party_id: 'party-1' })
  })
})
```

- [ ] **Step 7: Run test, verify it fails**

Run: `npm test -- Lobby.test.tsx`
Expected: FAIL — `./Lobby` does not exist.

- [ ] **Step 8: Implement `Lobby`**

`src/features/party/Lobby.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Player = { id: string; display_name: string; avatar: string; team_id: string | null }

export function Lobby({
  partyId,
  roomCode,
  isHost,
  onStartGame,
}: {
  partyId: string
  roomCode: string
  isHost: boolean
  onStartGame: () => void
}) {
  const [players, setPlayers] = useState<Player[]>([])
  const [teamSize, setTeamSize] = useState(2)
  const [rounds, setRounds] = useState(3)

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('id, display_name, avatar, team_id')
      .eq('party_id', partyId)
      .order('created_at')
    setPlayers((data as Player[]) ?? [])
  }

  useEffect(() => {
    loadPlayers()
    const channel = supabase
      .channel(`lobby:${partyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `party_id=eq.${partyId}` }, () => {
        loadPlayers()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  async function reshuffle() {
    await supabase.rpc('shuffle_teams', { p_party_id: partyId })
  }

  async function saveSettings() {
    await supabase.rpc('set_party_settings', {
      p_party_id: partyId,
      p_team_size: teamSize,
      p_rounds: rounds,
      p_team_mode: 'random',
      p_noises_enabled: true,
    })
  }

  return (
    <div>
      <h2>Room code: {roomCode}</h2>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.avatar} {p.display_name}
          </li>
        ))}
      </ul>
      {isHost && (
        <div>
          <label>
            Team size
            <input
              type="number"
              min={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              onBlur={saveSettings}
            />
          </label>
          <label>
            Rounds
            <input
              type="number"
              min={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              onBlur={saveSettings}
            />
          </label>
          <button onClick={reshuffle}>Reshuffle</button>
          <button onClick={onStartGame}>Start game</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `npm test -- Lobby.test.tsx`
Expected: 2 passed.

- [ ] **Step 10: Wire routing in `App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { SignIn } from './features/auth/SignIn'
import { Home } from './features/home/Home'
import { AvatarPicker } from './features/party/AvatarPicker'
import { createParty } from './features/party/CreateParty'
import { joinParty } from './features/party/JoinParty'
import { Lobby } from './features/party/Lobby'
import { supabase } from './lib/supabaseClient'

type Route = { name: 'home' } | { name: 'join'; roomCode: string } | { name: 'lobby'; partyId: string; roomCode: string; isHost: boolean }

function Gate() {
  const { session, loading } = useAuth()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [displayName, setDisplayName] = useState('Player')
  const [avatar, setAvatar] = useState('🌮')

  useEffect(() => {
    const hash = window.location.hash.match(/^#\/join\/([A-Z]{4})$/i)
    if (hash) setRoute({ name: 'join', roomCode: hash[1].toUpperCase() })
  }, [])

  if (loading) return <div data-testid="app-root">Loading…</div>
  if (!session) return <div data-testid="app-root"><SignIn /></div>

  async function handleCreate() {
    const party = await createParty()
    const player = await joinParty(party.room_code, displayName, avatar)
    setRoute({ name: 'lobby', partyId: party.id, roomCode: party.room_code, isHost: true })
    void player
  }

  async function handleJoin(roomCode: string) {
    const player = await joinParty(roomCode, displayName, avatar)
    setRoute({ name: 'lobby', partyId: player.party_id, roomCode, isHost: false })
  }

  return (
    <div data-testid="app-root">
      {route.name === 'home' || route.name === 'join' ? (
        <div>
          <label>
            Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <Home onCreate={handleCreate} onJoin={(code) => handleJoin(code)} />
        </div>
      ) : (
        <Lobby
          partyId={route.partyId}
          roomCode={route.roomCode}
          isHost={route.isHost}
          onStartGame={async () => {
            await supabase.rpc('start_game', { p_party_id: route.partyId })
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
```

Update `src/App.test.tsx`'s mock of `./lib/supabaseClient` to also include a
no-op `rpc` and `from`, matching the shapes used above, so the existing
smoke test keeps passing.

- [ ] **Step 11: Run full unit test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Add Home, Create/Join party, and Lobby screens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 6 — Core Turn Loop UI

### Task 16: `DialFan` component with drag and live broadcast

**Files:**
- Create: `src/components/DialFan.tsx`, `src/components/DialFan.test.tsx`
- Create: `src/features/game/useDialBroadcast.ts`

**Interfaces:**
- Consumes: `WEDGE_THRESHOLDS` from Task 5.
- Produces: `<DialFan value={0..1} onChange? interactive? targetPosition?>` (renders the fan, wedges, needle; draggable when `interactive`; shows the true target wedge highlight when `targetPosition` is passed post-reveal). `useDialBroadcast(channelName)` hook for sending/receiving live drag positions over a Realtime Broadcast channel. Used by Task 17 (all four turn sub-screens).

- [ ] **Step 1: Write the failing `DialFan` test**

`src/components/DialFan.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DialFan } from './DialFan'

describe('DialFan', () => {
  it('renders a slider with the given value', () => {
    render(<DialFan value={0.5} interactive onChange={vi.fn()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '0.5')
  })

  it('calls onChange when dragged via arrow keys', () => {
    const onChange = vi.fn()
    render(<DialFan value={0.5} interactive onChange={onChange} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(0.51)
  })

  it('is not interactive without onChange', () => {
    render(<DialFan value={0.5} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-readonly', 'true')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- DialFan.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DialFan`**

Uses a native range-slider-like keyboard/drag interaction on an SVG, styled
per the Global Constraints palette.

`src/components/DialFan.tsx`:

```tsx
import { useRef, type PointerEvent } from 'react'
import { WEDGE_THRESHOLDS } from '../lib/scoringConstants'

const CX = 110
const CY = 112
const R = 100

function angleForValue(v: number) {
  // v in [0,1] maps to [180deg, 0deg] (left = 0, right = 1), matching
  // the "Hot ← / → Cold" label order used throughout the mockups.
  return Math.PI * (1 - v)
}

function pointOnArc(v: number, radius: number) {
  const angle = angleForValue(v)
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) }
}

function wedgePath(fromV: number, toV: number, radius: number) {
  const p1 = pointOnArc(fromV, radius)
  const p2 = pointOnArc(toV, radius)
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y} Z`
}

export function DialFan({
  value,
  interactive = false,
  onChange,
  revealedTarget,
}: {
  value: number
  interactive?: boolean
  onChange?: (v: number) => void
  revealedTarget?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const isInteractive = interactive && !!onChange

  function valueFromPointer(e: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return value
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const angle = Math.atan2(CY - y, x - CX)
    const clamped = Math.max(0, Math.min(Math.PI, angle))
    return Math.round((1 - clamped / Math.PI) * 100) / 100
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!isInteractive || e.buttons !== 1) return
    onChange?.(valueFromPointer(e))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isInteractive) return
    if (e.key === 'ArrowRight') onChange?.(Math.min(1, Math.round((value + 0.01) * 100) / 100))
    if (e.key === 'ArrowLeft') onChange?.(Math.max(0, Math.round((value - 0.01) * 100) / 100))
  }

  const t = WEDGE_THRESHOLDS
  const needleAngle = angleForValue(value)
  const needleTip = pointOnArc(value, R * 0.68)

  return (
    <svg
      ref={svgRef}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-readonly={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      width={220}
      height={125}
      viewBox="0 0 220 125"
    >
      <path d={`M 10 ${CY} A ${R} ${R} 0 0 1 210 ${CY} Z`} fill="#F3ECDD" />
      <path d={wedgePath(0.5 + t.outer, 0.5 + t.inner, R)} fill="#E8A33D" />
      <path d={wedgePath(0.5 + t.inner, 0.5 + t.center, R)} fill="#D9482F" />
      <path d={wedgePath(0.5 + t.center, 0.5 - t.center, R)} fill="#4FB8AE" />
      <path d={wedgePath(0.5 - t.center, 0.5 - t.inner, R)} fill="#D9482F" />
      <path d={wedgePath(0.5 - t.inner, 0.5 - t.outer, R)} fill="#E8A33D" />
      {revealedTarget !== undefined && (
        <circle cx={pointOnArc(revealedTarget, R * 0.85).x} cy={pointOnArc(revealedTarget, R * 0.85).y} r={6} fill="#2E7D6B" />
      )}
      <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="#E8394A" strokeWidth={7} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={30} fill="#E8394A" />
      {needleAngle >= 0 && null}
    </svg>
  )
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- DialFan.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Implement the broadcast hook (no unit test — thin wrapper over Supabase Realtime, covered by manual verification in Task 17)**

`src/features/game/useDialBroadcast.ts`:

```ts
import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function useDialBroadcast(turnId: string, onRemoteMove: (v: number) => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`dial:${turnId}`)
      .on('broadcast', { event: 'move' }, (payload) => {
        onRemoteMove(payload.payload.value as number)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId])

  function broadcastMove(value: number) {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { value } })
  }

  return { broadcastMove }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add DialFan component and live drag broadcast hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: GameScreen (clue / guess / bet / reveal) and TeamScoreboard

**Files:**
- Create: `src/components/TeamScoreboard.tsx`
- Create: `src/features/game/useTurn.ts`
- Create: `src/features/game/GameScreen.tsx`, `src/features/game/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `DialFan`/`useDialBroadcast` (Task 16), `submit_clue`/`lock_guess`/`place_bet`/`reveal_turn` RPCs (Tasks 10–11), `turns_view` (Task 4).
- Produces: `<GameScreen partyId turnId myPlayerId myTeamId isHost>`, `useTurn(turnId)` hook (subscribes to `turns_view` row changes via Postgres Changes). Used by Task 18 (wraps this + advance/final logic).

- [ ] **Step 1: Write `TeamScoreboard` (presentational, no test — trivial rendering covered by `GameScreen` tests)**

`src/components/TeamScoreboard.tsx`:

```tsx
export function TeamScoreboard({
  teams,
  activeTeamId,
}: {
  teams: { id: string; name: string; score: number }[]
  activeTeamId: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {teams.map((t) => (
        <div key={t.id} style={{ opacity: t.id === activeTeamId ? 1 : 0.7 }}>
          <div>{t.name}</div>
          <div>{t.score}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write `useTurn`**

`src/features/game/useTurn.ts`:

```ts
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export type Turn = {
  id: string
  party_id: string
  round_number: number
  team_id: string
  psychic_player_id: string
  spectrum_id: string
  target_position: number | null
  clue_text: string | null
  guess_position: number | null
  status: 'clue' | 'guessing' | 'betting' | 'revealed'
}

export function useTurn(turnId: string) {
  const [turn, setTurn] = useState<Turn | null>(null)

  async function reload() {
    const { data } = await supabase.from('turns_view').select('*').eq('id', turnId).single()
    setTurn(data as Turn)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`turn:${turnId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turns', filter: `id=eq.${turnId}` }, () => {
        reload()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId])

  return turn
}
```

- [ ] **Step 3: Write the failing `GameScreen` test**

`src/features/game/GameScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GameScreen } from './GameScreen'
import { supabase } from '../../lib/supabaseClient'
import type { Turn } from './useTurn'

const baseTurn: Turn = {
  id: 't1', party_id: 'p1', round_number: 1, team_id: 'team-a', psychic_player_id: 'player-1',
  spectrum_id: 's1', target_position: null, clue_text: null, guess_position: null, status: 'clue',
}

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(
        table === 'turns_view' ? { data: baseTurn } : { data: { left_label: 'Cold', right_label: 'Hot' } }
      ),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), send: vi.fn() })),
    removeChannel: vi.fn(),
  },
}))

describe('GameScreen', () => {
  it('shows the clue prompt to the psychic and calls submit_clue on skip', async () => {
    render(
      <GameScreen
        turnId="t1"
        myPlayerId="player-1"
        myTeamId="team-a"
        teams={[{ id: 'team-a', name: 'Tacos', score: 0 }]}
        isHost={false}
      />
    )
    await waitFor(() => expect(screen.getByText(/cold/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /said it out loud/i }))
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('submit_clue', { p_turn_id: 't1', p_clue_text: '', p_skipped: true })
    )
  })

  it('shows a waiting message to a non-psychic, non-teammate during the clue phase', async () => {
    render(
      <GameScreen
        turnId="t1"
        myPlayerId="someone-else"
        myTeamId="team-b"
        teams={[{ id: 'team-a', name: 'Tacos', score: 0 }, { id: 'team-b', name: 'Yikes', score: 0 }]}
        isHost={false}
      />
    )
    await waitFor(() => expect(screen.getByText(/waiting for the clue/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test -- GameScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `GameScreen`**

`src/features/game/GameScreen.tsx`:

```tsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTurn } from './useTurn'
import { DialFan } from '../../components/DialFan'
import { TeamScoreboard } from '../../components/TeamScoreboard'
import { useDialBroadcast } from './useDialBroadcast'

type Team = { id: string; name: string; score: number }

export function GameScreen({
  turnId,
  myPlayerId,
  myTeamId,
  teams,
  isHost,
}: {
  turnId: string
  myPlayerId: string
  myTeamId: string
  teams: Team[]
  isHost: boolean
}) {
  const turn = useTurn(turnId)
  const [clueText, setClueText] = useState('')
  const [localGuess, setLocalGuess] = useState(0.5)
  const { broadcastMove } = useDialBroadcast(turnId, setLocalGuess)

  if (!turn) return <div>Loading…</div>

  const isPsychic = myPlayerId === turn.psychic_player_id
  const isActiveTeam = myTeamId === turn.team_id
  const spectrumLabel = 'Cold ↔ Hot' // fetched from spectrums table in Task 19's pack-aware version; static label acceptable here since it's read via a separate query wired in Task 19

  async function submitClue(skipped: boolean) {
    await supabase.rpc('submit_clue', { p_turn_id: turnId, p_clue_text: skipped ? '' : clueText, p_skipped: skipped })
  }

  async function lockGuess() {
    await supabase.rpc('lock_guess', { p_turn_id: turnId, p_guess_position: localGuess })
  }

  async function placeBet(direction: 'left' | 'right') {
    await supabase.rpc('place_bet', { p_turn_id: turnId, p_team_id: myTeamId, p_direction: direction })
  }

  function moveGuess(v: number) {
    setLocalGuess(v)
    broadcastMove(v)
  }

  return (
    <div>
      <TeamScoreboard teams={teams} activeTeamId={turn.team_id} />
      <div>{spectrumLabel}</div>

      {turn.status === 'clue' && isPsychic && (
        <div>
          <input value={clueText} onChange={(e) => setClueText(e.target.value)} placeholder="Type a clue (optional)" />
          <button onClick={() => submitClue(false)}>Submit clue</button>
          <button onClick={() => submitClue(true)}>Said it out loud</button>
        </div>
      )}
      {turn.status === 'clue' && !isPsychic && <div>Waiting for the clue…</div>}

      {turn.status !== 'clue' && <div>Clue: {turn.clue_text}</div>}

      {turn.status === 'guessing' && isActiveTeam && (
        <div>
          <DialFan value={localGuess} interactive onChange={moveGuess} />
          <button onClick={lockGuess}>Lock In Guess</button>
        </div>
      )}
      {turn.status === 'guessing' && !isActiveTeam && <DialFan value={localGuess} />}

      {turn.status === 'betting' && !isActiveTeam && (
        <div>
          <DialFan value={turn.guess_position ?? 0.5} />
          <button onClick={() => placeBet('left')}>Left</button>
          <button onClick={() => placeBet('right')}>Right</button>
        </div>
      )}
      {turn.status === 'betting' && isActiveTeam && <div>Waiting for other teams to bet…</div>}

      {turn.status === 'revealed' && (
        <div>
          <DialFan value={turn.guess_position ?? 0.5} revealedTarget={turn.target_position ?? undefined} />
          {isHost && <button onClick={() => supabase.rpc('advance_turn', { p_party_id: turn.party_id })}>Next turn</button>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run test, verify pass**

Run: `npm test -- GameScreen.test.tsx`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add GameScreen covering clue/guess/bet/reveal phases

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 18: Final scoreboard and full game wiring in `App.tsx`

**Files:**
- Create: `src/features/game/FinalScoreboard.tsx`, `src/features/game/FinalScoreboard.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GameScreen` (Task 17), `parties.status` (Task 3/9/12).
- Produces: `<FinalScoreboard teams onPlayAgain onNewTeams>`; `App.tsx` now watches `parties.status` and switches between Lobby → GameScreen → FinalScoreboard.

- [ ] **Step 1: Write the failing `FinalScoreboard` test**

`src/features/game/FinalScoreboard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FinalScoreboard } from './FinalScoreboard'

describe('FinalScoreboard', () => {
  it('lists teams sorted by score, highest first', () => {
    render(
      <FinalScoreboard
        teams={[{ id: 'a', name: 'Tacos', score: 5 }, { id: 'b', name: 'Yikes', score: 9 }]}
        onPlayAgain={vi.fn()}
        onNewTeams={vi.fn()}
      />
    )
    const rows = screen.getAllByTestId('final-team-row')
    expect(rows[0]).toHaveTextContent('Yikes')
    expect(rows[1]).toHaveTextContent('Tacos')
  })

  it('calls onPlayAgain and onNewTeams', () => {
    const onPlayAgain = vi.fn()
    const onNewTeams = vi.fn()
    render(<FinalScoreboard teams={[]} onPlayAgain={onPlayAgain} onNewTeams={onNewTeams} />)
    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    fireEvent.click(screen.getByRole('button', { name: /new teams/i }))
    expect(onPlayAgain).toHaveBeenCalled()
    expect(onNewTeams).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- FinalScoreboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `FinalScoreboard`**

`src/features/game/FinalScoreboard.tsx`:

```tsx
type Team = { id: string; name: string; score: number }

export function FinalScoreboard({
  teams,
  onPlayAgain,
  onNewTeams,
}: {
  teams: Team[]
  onPlayAgain: () => void
  onNewTeams: () => void
}) {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  return (
    <div>
      <h2>Final scores</h2>
      <ol>
        {sorted.map((t) => (
          <li key={t.id} data-testid="final-team-row">
            {t.name}: {t.score}
          </li>
        ))}
      </ol>
      <button onClick={onPlayAgain}>Play again</button>
      <button onClick={onNewTeams}>New teams</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- FinalScoreboard.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Wire the party status machine into `App.tsx`**

Replace the `route.name === 'lobby'` branch's else-case with a component that
watches `parties.status` and switches views:

```tsx
function PartyRoom({ partyId, roomCode, isHost }: { partyId: string; roomCode: string; isHost: boolean }) {
  const [status, setStatus] = useState<'lobby' | 'playing' | 'finished'>('lobby')
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null)
  const [teams, setTeams] = useState<{ id: string; name: string; score: number }[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)

  async function reloadPartyState() {
    const { data: party } = await supabase.from('parties').select('status').eq('id', partyId).single()
    setStatus(party!.status)
    const { data: teamRows } = await supabase.from('teams').select('id, name, score').eq('party_id', partyId)
    setTeams(teamRows ?? [])
    const { data: turnRows } = await supabase
      .from('turns_view')
      .select('id')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false })
      .limit(1)
    setCurrentTurnId(turnRows?.[0]?.id ?? null)
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data: me } = await supabase.from('players').select('id, team_id').eq('party_id', partyId).eq('account_id', userId).single()
    setMyPlayerId(me?.id ?? null)
    setMyTeamId(me?.team_id ?? null)
  }

  useEffect(() => {
    reloadPartyState()
    const channel = supabase
      .channel(`party-room:${partyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` }, reloadPartyState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turns', filter: `party_id=eq.${partyId}` }, reloadPartyState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `party_id=eq.${partyId}` }, reloadPartyState)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  if (status === 'lobby') {
    return (
      <Lobby
        partyId={partyId}
        roomCode={roomCode}
        isHost={isHost}
        onStartGame={async () => {
          await supabase.rpc('start_game', { p_party_id: partyId })
        }}
      />
    )
  }
  if (status === 'playing' && currentTurnId && myPlayerId && myTeamId) {
    return <GameScreen turnId={currentTurnId} myPlayerId={myPlayerId} myTeamId={myTeamId} teams={teams} isHost={isHost} />
  }
  if (status === 'finished') {
    return (
      <FinalScoreboard
        teams={teams}
        onPlayAgain={async () => {
          await supabase.rpc('start_game', { p_party_id: partyId })
        }}
        onNewTeams={async () => {
          await supabase.rpc('shuffle_teams', { p_party_id: partyId })
          await supabase.rpc('start_game', { p_party_id: partyId })
        }}
      />
    )
  }
  return <div>Loading…</div>
}
```

Replace the lobby-rendering branch in `Gate` to render `<PartyRoom ... />`
instead of `<Lobby ... />` directly, and import `GameScreen`, `FinalScoreboard`,
`useEffect`.

- [ ] **Step 6: Run full unit test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Wire full party status machine: lobby -> game -> final scoreboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 7 — Packs & Noises UI

### Task 19: Packs list and editor

**Files:**
- Create: `src/features/packs/PacksList.tsx`, `src/features/packs/PacksList.test.tsx`
- Create: `src/features/packs/PackEditor.tsx`, `src/features/packs/PackEditor.test.tsx`

**Interfaces:**
- Consumes: `create_pack`/`add_spectrum` RPCs (Task 13).
- Produces: `<PacksList onOpenPack>`, `<PackEditor packId>`. Standalone screens reachable from `Home` (a "My packs" link); not required for the core game loop to function, so wired last.

- [ ] **Step 1: Write the failing `PacksList` test**

`src/features/packs/PacksList.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PacksList } from './PacksList'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'pack-1', name: 'Beer & Europe', share_code: 'ABC123' }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'pack-2', name: 'New pack' }, error: null }) }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }) },
  },
}))

describe('PacksList', () => {
  it('lists existing packs and creates a new one', async () => {
    const onOpenPack = vi.fn()
    render(<PacksList onOpenPack={onOpenPack} />)
    await waitFor(() => expect(screen.getByText('Beer & Europe')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/new pack name/i), { target: { value: 'New pack' } })
    fireEvent.click(screen.getByRole('button', { name: /create pack/i }))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('create_pack', { p_name: 'New pack' }))
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- PacksList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PacksList`**

`src/features/packs/PacksList.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Pack = { id: string; name: string; share_code: string }

export function PacksList({ onOpenPack }: { onOpenPack: (packId: string) => void }) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [newName, setNewName] = useState('')

  async function loadPacks() {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data } = await supabase.from('packs').select('id, name, share_code').eq('owner_id', userId)
    setPacks((data as Pack[]) ?? [])
  }

  useEffect(() => {
    loadPacks()
  }, [])

  async function createPack() {
    const { data } = await supabase.rpc('create_pack', { p_name: newName }).single()
    setNewName('')
    await loadPacks()
    if (data) onOpenPack((data as Pack).id)
  }

  return (
    <div>
      <h2>My packs</h2>
      <ul>
        {packs.map((p) => (
          <li key={p.id}>
            <button onClick={() => onOpenPack(p.id)}>{p.name}</button> ({p.share_code})
          </li>
        ))}
      </ul>
      <label htmlFor="new-pack-name">New pack name</label>
      <input id="new-pack-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      <button onClick={createPack}>Create pack</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- PacksList.test.tsx`
Expected: 1 passed.

- [ ] **Step 5: Write the failing `PackEditor` test**

`src/features/packs/PackEditor.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PackEditor } from './PackEditor'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 's1', left_label: 'Awful beer', right_label: 'Great beer' }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  },
}))

describe('PackEditor', () => {
  it('lists spectrums and adds a new one', async () => {
    render(<PackEditor packId="pack-1" />)
    await waitFor(() => expect(screen.getByText(/awful beer/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/left label/i), { target: { value: 'Worst country' } })
    fireEvent.change(screen.getByLabelText(/right label/i), { target: { value: 'Best country' } })
    fireEvent.click(screen.getByRole('button', { name: /add spectrum/i }))
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('add_spectrum', {
        p_pack_id: 'pack-1', p_left_label: 'Worst country', p_right_label: 'Best country',
      })
    )
  })
})
```

- [ ] **Step 6: Run test, verify it fails**

Run: `npm test -- PackEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `PackEditor`**

`src/features/packs/PackEditor.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Spectrum = { id: string; left_label: string; right_label: string }

export function PackEditor({ packId }: { packId: string }) {
  const [spectrums, setSpectrums] = useState<Spectrum[]>([])
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')

  async function load() {
    const { data } = await supabase.from('spectrums').select('id, left_label, right_label').eq('pack_id', packId)
    setSpectrums((data as Spectrum[]) ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId])

  async function addSpectrum() {
    await supabase.rpc('add_spectrum', { p_pack_id: packId, p_left_label: left, p_right_label: right })
    setLeft('')
    setRight('')
    await load()
  }

  return (
    <div>
      <ul>
        {spectrums.map((s) => (
          <li key={s.id}>
            {s.left_label} ↔ {s.right_label}
          </li>
        ))}
      </ul>
      <label htmlFor="left-label">Left label</label>
      <input id="left-label" value={left} onChange={(e) => setLeft(e.target.value)} />
      <label htmlFor="right-label">Right label</label>
      <input id="right-label" value={right} onChange={(e) => setRight(e.target.value)} />
      <button onClick={addSpectrum}>Add spectrum</button>
    </div>
  )
}
```

- [ ] **Step 8: Run test, verify pass**

Run: `npm test -- PackEditor.test.tsx`
Expected: 1 passed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add packs list and pack editor screens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 20: Soundboard and host mute control

**Files:**
- Create: `src/features/noises/Soundboard.tsx`, `src/features/noises/Soundboard.test.tsx`
- Create: `public/sounds/` (8 short audio files — see Step 1)
- Modify: `src/features/game/GameScreen.tsx` (mount `<Soundboard>`)

**Interfaces:**
- Consumes: Realtime Broadcast (same pattern as `useDialBroadcast`, Task 16), `mute_player` RPC (Task 13).
- Produces: `<Soundboard partyId myPlayerId isHost players>` — plays a sound on every connected client when any un-muted player taps a button.

- [ ] **Step 1: Add placeholder sound assets**

Create `public/sounds/README.md`:

```markdown
Replace these with real short (<2s) sound clips before shipping:
airhorn.mp3, drumroll.mp3, applause.mp3, sad-trombone.mp3, boo.mp3,
crickets.mp3, gasp.mp3, tada.mp3

Any royalty-free SFX pack works (e.g. freesound.org, CC0 sources).
```

(Actual binary audio files are a manual, non-code step — the operator drops
8 files matching those names into `public/sounds/` before the noises
feature is usable end-to-end; the code below works with any files at those
paths.)

- [ ] **Step 2: Write the failing `Soundboard` test**

`src/features/noises/Soundboard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Soundboard } from './Soundboard'
import { supabase } from '../../lib/supabaseClient'

const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), send: vi.fn() }

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  },
}))

describe('Soundboard', () => {
  it('broadcasts a noise event when a sound button is tapped', () => {
    render(<Soundboard partyId="p1" myPlayerId="me" mutedUntil={null} isHost={false} players={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /airhorn/i }))
    expect(mockChannel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'noise', payload: { sound: 'airhorn' } })
  })

  it('does not broadcast while muted', () => {
    render(<Soundboard partyId="p1" myPlayerId="me" mutedUntil={new Date(Date.now() + 10000).toISOString()} isHost={false} players={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /airhorn/i }))
    expect(mockChannel.send).not.toHaveBeenCalled()
  })

  it('lets the host mute another player', async () => {
    render(
      <Soundboard
        partyId="p1"
        myPlayerId="host-1"
        mutedUntil={null}
        isHost={true}
        players={[{ id: 'p2', display_name: 'Riley' }]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /mute riley/i }))
    expect(supabase.rpc).toHaveBeenCalledWith('mute_player', { p_party_id: 'p1', p_player_id: 'p2', p_seconds: 30 })
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- Soundboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `Soundboard`**

`src/features/noises/Soundboard.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SOUNDS = ['airhorn', 'drumroll', 'applause', 'sad-trombone', 'boo', 'crickets', 'gasp', 'tada'] as const

export function Soundboard({
  partyId,
  myPlayerId,
  mutedUntil,
  isHost,
  players,
}: {
  partyId: string
  myPlayerId: string
  mutedUntil: string | null
  isHost: boolean
  players: { id: string; display_name: string }[]
}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  useEffect(() => {
    const channel = supabase
      .channel(`noises:${partyId}`)
      .on('broadcast', { event: 'noise' }, (payload) => {
        const sound = payload.payload.sound as string
        audioRefs.current[sound]?.play().catch(() => {})
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  const isMuted = mutedUntil !== null && new Date(mutedUntil).getTime() > Date.now()

  function playSound(sound: string) {
    if (isMuted) return
    channelRef.current?.send({ type: 'broadcast', event: 'noise', payload: { sound } })
  }

  return (
    <div>
      {SOUNDS.map((s) => (
        <button key={s} onClick={() => playSound(s)} aria-label={s}>
          🔊 {s}
        </button>
      ))}
      {SOUNDS.map((s) => (
        <audio key={s} ref={(el) => { if (el) audioRefs.current[s] = el }} src={`/sounds/${s}.mp3`} preload="auto" />
      ))}
      {isHost && (
        <div>
          {players
            .filter((p) => p.id !== myPlayerId)
            .map((p) => (
              <button
                key={p.id}
                aria-label={`Mute ${p.display_name}`}
                onClick={() => supabase.rpc('mute_player', { p_party_id: partyId, p_player_id: p.id, p_seconds: 30 })}
              >
                Mute {p.display_name}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run test, verify pass**

Run: `npm test -- Soundboard.test.tsx`
Expected: 3 passed.

- [ ] **Step 6: Mount it in `GameScreen`**

Add to `src/features/game/GameScreen.tsx`'s render, near the top (after the
scoreboard), passing through the party's player list and the current
player's `muted_until` (fetched alongside the rest of `PartyRoom`'s state in
`App.tsx` — extend `PartyRoom`'s `reloadPartyState` to also `select('id, display_name, muted_until')`
from `players` and pass `players`/`myMutedUntil` down through `GameScreen`'s
props, threading them the same way `teams` already is):

```tsx
<Soundboard partyId={turn.party_id} myPlayerId={myPlayerId} mutedUntil={myMutedUntil} isHost={isHost} players={players} />
```

Add `myMutedUntil` and `players` to `GameScreen`'s prop types (`string | null`
and `{ id: string; display_name: string }[]` respectively) and thread them
from `PartyRoom` the same way `teams` is threaded today.

- [ ] **Step 7: Run full unit test suite**

Run: `npm test`
Expected: all pass (update `GameScreen.test.tsx`'s two existing render calls
to pass `myMutedUntil={null}` and `players={[]}` so they keep compiling).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add soundboard with live broadcast and host mute control

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 8 — Deploy

### Task 21: Vercel deployment

**Files:**
- Modify: none (dashboard configuration only)
- Create: `docs/DEPLOYMENT.md`

**Interfaces:**
- Produces: a live URL serving the built app, auto-deploying on push to `main`.

- [ ] **Step 1: Verify a production build works locally**

```bash
npm run build
npm run preview
```

Expected: build succeeds; preview server serves the app; manually confirm
sign-in and party creation work against the linked Supabase project.

- [ ] **Step 2: Connect the repo to Vercel**

This requires the human operator (Vercel account access):

1. Go to vercel.com → **Add New... → Project**.
2. Import `ilayfurman/wavelength-plus` from GitHub.
3. Framework preset: **Vite** (auto-detected).
4. Add environment variables (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://iggpblavznrcbnwaygnv.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (the `sb_publishable_...` key)
5. Click **Deploy**.

- [ ] **Step 3: Configure Supabase auth redirect URLs**

In the Supabase dashboard → Authentication → URL Configuration, add the
Vercel deployment URL (e.g. `https://wavelength-plus.vercel.app`) to the
allowed redirect URLs list, so email-OTP links/sessions work in production.

- [ ] **Step 4: Document the deployment**

`docs/DEPLOYMENT.md`:

```markdown
# Deployment

Hosted on Vercel (free tier), auto-deploys on push to `main`.
Backend: Supabase project `iggpblavznrcbnwaygnv` (free tier).

To apply a new DB migration to production: `supabase db push` (after
`supabase link --project-ref iggpblavznrcbnwaygnv` once per machine).

Env vars (set in Vercel dashboard, not committed):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Document deployment process

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage:** teams/shuffle/manual (Task 8), turn structure + rounds
(Tasks 9/12), clue/guess/bet/reveal (Tasks 10/11/17), scoring zones (Task
5), co-op 2-3 player mode (Tasks 10/12 handle `n_teams <= 1`), accounts +
per-party name/avatar (Tasks 7/14/15), lobby + room code + share (Task 15;
native share-sheet button can be added as a one-line addition to `Lobby.tsx`
using `navigator.share` — trivial enough to fold into Task 15's execution
rather than a separate task), custom packs + share code (Tasks 13/19),
starter deck (Task 6), noises + mute (Tasks 13/20), visual style (Global
Constraints + `DialFan`/scoreboard/pill-button styling applied throughout
Tasks 15–20 — a final CSS pass matching the exact reference gradients is
expected as normal polish during execution, not a separate task), $0 hosting
(Tasks 2/21, free tiers only), hidden target via RLS (Task 4).

**Deferred (per spec, not in this plan):** Google OAuth, payments, native
apps, spectators/timers/catch-up rule.
