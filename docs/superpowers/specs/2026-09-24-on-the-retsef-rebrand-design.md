# On the Retsef — Rebrand & Visual Design Spec

Date: 2026-09-24
Status: Approved for planning (user-approved overnight autonomous build)

## 1. Summary

Full rebrand of "Wavelength Plus" to **"On the Retsef"** ("retsef" — Hebrew
for "continuum"), adopting the design system produced by a separate design
tool and handed off in `docs/design/reference/HANDOFF.md`. This spec covers
applying that visual system to every existing screen, building the screens/
features it specifies that don't exist yet, and two small new backend RPCs
it requires (host "skip turn" and "end game").

**Reference materials (committed to the repo, read these directly for exact
values — this spec summarizes, they are authoritative for pixel/color/prop
detail):**
- `docs/design/reference/HANDOFF.md` — full design tokens, component props,
  responsive rules, screen list, paste-import format, AI-prompt template,
  motion notes.
- `docs/design/reference/*.dc.html` — one reference file per component
  (`Dial`, `Btn`, `Logo`, `ClueCard`, `Scoreboard`, `TeamPanel`,
  `GameHeader`, `Soundboard`, `Starfield`) with exact markup, gradients,
  and the JS logic that computes SVG paths (especially `Dial.dc.html`,
  which has the exact band/needle geometry). These are Design-Canvas
  component files (custom `<x-dc>`/`<dc-import>` elements, not directly
  runnable React) — read them as a precise reference for values and logic
  to port into real React/CSS, not as source to copy verbatim.

## 2. Rebrand

- App name: **On the Retsef**. Store title/subtitle: "On the Retsef: The
  Guess-the-Dial Party Game". Secondary tagline: "How close can you get?"
- Never show "Wavelength" in any user-facing string, title, or starter
  pack content. Internal code identifiers (file names, `wavelength-plus`
  npm package name, the Supabase project name, the GitHub repo name,
  table/column names) stay as-is — renaming those is out of scope and
  not worth the churn for a solo project.
- Team names in the shuffle/demo data change to the design's set: e.g.
  "Comets" (pink, `#FF6FA3`) and "Novas" (blue, `#5BD6FF`) as the first
  two, with more added for 3+ teams (host is free to keep the existing
  emoji+word team-name generator in `shuffle_teams` — only the *palette*
  correspondence changes: teams are now colored by index using the
  design's team-color set, see §3).

## 3. Design Tokens

Copy these into a new `src/index.css` (or `src/styles/tokens.css` imported
by it) as CSS custom properties on `:root`. This is a single dark visual
world (a night-sky game board) — no light-mode media query needed, per the
artifact-design fundamentals' "deliberately commits to one visual world"
exception. Every value below must be set explicitly (no relying on
inherited/transparent defaults).

```css
:root {
  color-scheme: dark;
  --bg: #09081A;
  --bg-glow: radial-gradient(120% 55% at 50% 58%, #2C2266 0%, #16123A 46%, #09081A 100%);
  --surface: linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6));
  --surface-border: rgba(200,180,255,.12);
  --sheet: linear-gradient(180deg, #221B4F, #130F30);
  --input-bg: rgba(8,6,24,.6);
  --input-border: rgba(200,180,255,.18);
  --text: #F4F2FB;
  --text-muted: #A9A3C9;
  --text-subtle: #8A84AA;
  --text-subtle-2: #6F6893;
  --lavender: #CFC0FF;
  --gold: #FFD166;
  --gold-cta: linear-gradient(180deg,#FFE08A 0%,#FFC94D 55%,#F2A93B 100%);
  --gold-cta-text: #1A1233;
  --comets: #FF6FA3;
  --comets-soft: #FF8FB8;
  --comets-softer: #FFC2D8;
  --novas: #5BD6FF;
  --novas-soft: #8FE3FF;
  --novas-softer: #BDEBFF;
  --violet: #8C6BFF;
  --violet-soft: #A98BFF;
  --cream: #F3ECDD;
  --wordmark-gradient: linear-gradient(90deg,#FFD166,#FF8FB1 55%,#A98BFF);
  --font-display: 'Fredoka', ui-rounded, system-ui, sans-serif;
  --font-body: 'Rubik', system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, Menlo, monospace;
}
body { background: var(--bg); color: var(--text); }
```

Team color rotation for 3+ teams (host's `shuffle_teams` already assigns
emoji+word names; the frontend maps team index → color, it does not need a
backend change): index 0 = `--comets`, index 1 = `--novas`, index 2 =
`--violet` (`#8C6BFF`), index 3 = gold (`#FFD166`, use a darker text pairing
since gold is also the CTA color — this is fine, CTAs and team badges are
visually distinct contexts), then repeat.

**Fonts:** load via Google Fonts in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```
Fredoka 600/700 for the logo, clue word display, and big scores. Rubik
400–800 for all other UI text. `ui-monospace, Menlo` for room codes, pack
share codes, and the paste-import textarea.

**Shape/spacing:** pill buttons (`border-radius:999px`) at heights lg=62,
md=54, sm=44 (nothing tappable under 40px). Card radius 18 (clue card), 22
(most cards), 26–28 (sheets/modals). Phone content padding: 16px sides,
~12px stack gap.

## 4. Shared Components to Build

Each becomes its own file under `src/components/`. Port the exact
geometry/gradients from the matching `docs/design/reference/*.dc.html`
file — read it directly rather than relying only on this summary.

- **`Starfield.tsx`** — fixed/absolute background layer: the radial glow
  gradient plus two star-dot layers (see `Starfield.dc.html` for the exact
  `radial-gradient` dot patterns and `background-size`/`background-position`
  values). Rendered once behind each screen.
- **`Logo.tsx`** — `variant: 'inline' | 'stacked' | 'icon'`, `size: 'sm' |
  'md' | 'lg' | 'xl'`. "on the" in lavender Fredoka 600, "retsef" in the
  gradient-text Fredoka 700 (`background: var(--wordmark-gradient);
  -webkit-background-clip: text; background-clip: text; color: transparent`).
  Icon variant is a rounded indigo square containing a tiny non-interactive
  `Dial` fixed at value=target=0.62.
- **`Btn.tsx`** (or extend existing button usage) — `kind: 'primary' |
  'secondary' | 'accent' | 'ghost'`, `size: 'lg' | 'md' | 'sm'`. Primary =
  gold gradient CTA; secondary = glass (translucent white); accent =
  violet-tinted; ghost = text-only. Press state `transform: scale(.97)`.
- **`DialFan.tsx` (rewrite in place, same file)** — replace the existing
  implementation's geometry with the design's exact math from
  `Dial.dc.html`: viewBox `0 0 360 250`, pivot `(180, 178)`, outer band
  radius `Ro=150`, inner band radius `Ri=98`, label radius `Rm=124`.
  `angle = π · (1 − v)` maps a 0–1 value to the semicircle. Bands are drawn
  **around the actual target value** (not a fixed center) using the exact
  same thresholds as `compute_score`/`WEDGE_THRESHOLDS`
  (`target±.05/.10/.15`), colored gold (center, `#FFD166`), pink
  (`#FF6FA3`), violet (`#8C6BFF`) outward on both sides. The needle is a
  small tapered polygon (not a plain stroked line) with a radial gradient
  fill and a pearl half-moon pivot cap — copy the exact `<polygon>`/
  gradient defs from the reference file. Keep the component's existing
  external prop contract as close as possible to avoid breaking
  `GameScreen.tsx`'s usage: `value: number`, `interactive?: boolean`,
  `onChange?: (v: number) => void`, `revealedTarget?: number`. Internally:
  whenever `revealedTarget !== undefined`, draw the colored bands centered
  on `revealedTarget`; otherwise draw the ring/track with no bands (nobody
  who lacks the target should see scoring zones). Keep `role="slider"`,
  `aria-valuenow`, `aria-readonly` from the existing implementation — the
  existing `DialFan.test.tsx` assertions on those attributes must keep
  passing; update the test only if the new geometry genuinely requires a
  different (but equally meaningful) assertion, and say so in the report.
- **`ClueCard.tsx`** — `label` (caps, letter-spaced), `clue` (Fredoka
  display text) or an `editable` input (psychic's own view), `tone:
  'default' | 'gold' | 'nova'`. Optional `live` boolean shows a pulsing
  "● LIVE" badge (pink dot + glow) top-right — used on the "watching"
  states.
- **`TeamScoreboard.tsx` (rewrite in place)** — two-up grid of team cards,
  each showing name, big Fredoka score number in the team's color, and a
  row of small avatar circles; the psychic's avatar gets a gold ring
  (`box-shadow: 0 0 0 2px <bg>, 0 0 0 4px var(--gold)`); the inactive
  team's card drops to `opacity:.7` unless neither team is "active" (e.g.
  final/lobby contexts). Extend to render **N teams**, not just 2 (existing
  component already takes a `teams` array — keep that shape, just restyle
  and extend the grid to wrap for 3+ teams, e.g. `grid-template-columns:
  repeat(auto-fit, minmax(140px, 1fr))`).
- **`GameHeader.tsx`** — `Logo` (inline, small) + `Round n/N` text + gold
  progress dots (filled for completed rounds) + a hamburger button (☰,
  circular) that opens the host menu sheet. When a `room` code is passed
  (lobby context), render the wider variant with a "Join at retsef.app ·
  `CODE`" chip instead of plain round text — for lobby, `room` is always
  passed; for in-game, omit it.
- **`Soundboard.tsx` (restyle in place)** — 8 circular (46px) icon buttons
  in a horizontal scroll row, each with a small caption label underneath.
  Tapping one gives it a 450ms gold glow (`setTimeout`-driven state, same
  pattern as the reference file). When muted, overlay a centered pill
  reading `Host muted you · 0:NN` (NN = seconds remaining, computed from
  `mutedUntil` — a live countdown is a nice-to-have, a static "muted"
  message is acceptable if time is short).

## 5. Screens (existing files to restyle + new ones to add)

Full screen-to-file mapping and per-state notes are already in
`docs/design/reference/HANDOFF.md` §4 (screen list table) — read it
directly. Summary of what's **new** (doesn't exist in the app yet) vs.
**restyle** (exists, needs the new visual system applied):

**Restyle only:**
- `SignIn.tsx` — apply tokens; the 6-digit code entry becomes 6 separate
  auto-advancing input boxes (`inputmode="numeric"`, `maxLength={1}`, focus
  auto-advances to the next box on digit entry, backspace on empty box
  moves focus back) rather than one text field. Keep the same
  `verifyOtp`/`signInWithOtp` calls — just change the code-collection UI.
- `Home.tsx`, `Lobby.tsx`, `FinalScoreboard.tsx`, `PacksList.tsx`,
  `PackEditor.tsx`, `GameScreen.tsx` (all its status/role branches),
  `App.tsx`'s loading/shell states.

**New within an existing flow:**
- **Name + avatar as its own step** — currently `App.tsx`'s `Gate`
  renders the name/avatar picker inline above `Home`. Extract it into a
  distinct component (`src/features/party/NameAvatarStep.tsx` or similar)
  shown as its own screen before `Home` renders, matching the design's P04.
- **Lobby "pick teams" mode** — `shuffle_teams` and `assign_manual_team`
  RPCs already exist (Task 8, already deployed). The frontend never built
  a UI for manual mode. Add: a segmented control (Random / Pick) in
  `Lobby.tsx` that toggles `team_mode` via `set_party_settings`; when in
  "Pick" mode, each player sees tappable team slots (or a simple "create
  team" + join-existing-team flow) calling `assign_manual_team`, and the
  host's "Start game" button is disabled until every player has a
  `team_id` (query this client-side from the already-subscribed `players`
  list).
- **Noises toggle in Lobby** — `set_party_settings` already accepts
  `p_noises_enabled`; the Lobby UI never exposed a toggle for it (it was
  hardcoded `true`). Add the toggle.

**New screens/features (not in the app at all yet):**
- **Splash** — replace the bare "Loading…" text in `App.tsx`'s `Gate`
  with a proper splash (Starfield + Logo, matching P01).
- **Host menu** — a bottom sheet opened from `GameHeader`'s hamburger,
  host-only, containing: noises on/off toggle, "mute a player" (list of
  players, tap to mute 30s — reuses `mute_player`, already built), "Force-
  skip `<psychic name>`'s turn", "End game for everyone". The latter two
  need new backend RPCs (§6).
- **Pack paste-import** — a new mode inside `PackEditor.tsx`: a big
  textarea where the user pastes one card per line, parsed per the exact
  rules in `HANDOFF.md` §5 (separators `|`, `↔`, `<->`, tab, ` vs `/` vs. `;
  strip leading `1.`/`1)`/`-`/`*`/`•`; a line that doesn't split into
  exactly 2 non-empty parts shows "Needs Left | Right" and isn't imported;
  a case-insensitive duplicate against the pack or earlier pasted lines
  shows "Already in pack" and is skipped). The confirm button reads "Add N
  spectrums" and is disabled at N=0. On confirm, call the existing
  `add_spectrum` RPC once per valid parsed line (sequential `await` calls
  are fine at this scale — packs are a few dozen cards, not thousands).
- **AI prompt sheet** — a small new screen/panel: a topic text input, a
  "Generate" button that fills in the exact template from `HANDOFF.md` §5
  (`Give me 25 cards for a party game where each card is two opposite ends
  of a scale, about "{topic}". Reply with one card per line, formatted
  exactly as: Left | Right. No numbering, no extra text.`), and a "Copy"
  button (`navigator.clipboard.writeText`, with a try/catch fallback that
  selects the text if the clipboard API throws). This makes no API call
  itself — it's a copyable prompt for the user to paste into their own AI
  chat of choice, then paste the reply into the paste-import box above.

**Explicitly out of scope for this pass (ruling, not an oversight):**
Desktop-specific layouts (`GameDesktop`/`TeamPanel`/D01–D21 two-column
board view) are not being built tonight — the app stays a responsive
single-column layout at all widths (already required by the Global
Constraints' phone-first design), which reads fine on a laptop too, just
not as a distinct "shared TV screen" board. This can be a future
follow-up if wanted.

## 6. New Backend RPCs

Two small, host-only RPCs, needed for the host menu. Both are simple
enough to specify fully here.

```sql
create or replace function public.skip_turn(p_party_id uuid)
returns public.turns_view
language plpgsql
security definer
set search_path = public
as $$
declare
  current_turn public.turns;
begin
  if not exists (select 1 from public.parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'Only the host can skip a turn';
  end if;

  select * into current_turn from public.turns
  where party_id = p_party_id order by created_at desc limit 1;
  if current_turn.id is null then
    raise exception 'No turn to skip';
  end if;

  if current_turn.status != 'revealed' then
    update public.turns set status = 'revealed' where id = current_turn.id;
  end if;

  return (select * from public.turns_view where id = current_turn.id);
end;
$$;

grant execute on function public.skip_turn(uuid) to authenticated;

create or replace function public.end_game(p_party_id uuid)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.parties;
begin
  update public.parties
  set status = 'finished'
  where id = p_party_id and host_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Only the host can end this party, or it was not found';
  end if;

  return result;
end;
$$;

grant execute on function public.end_game(uuid) to authenticated;
```

`skip_turn` deliberately does not touch scores or bets — it just marks the
current turn revealed (with whatever `guess_position` it already has, even
`null`) so the existing "Next turn" (`advance_turn`) flow becomes available
in the UI, matching a real host's need to bail out of a stuck/AFK turn
without it counting for or against anyone.

## 7. Testing

The existing unit test suite (Vitest + RTL) asserts on **text content and
RPC call shape**, not visual styling — restyling should not break it, per
the precedent already established in Tasks 15/16/17 of the original build
(wrapping text in styled `<span>`s, adding classNames, etc. never broke a
`getByText` assertion). Every task in the implementation plan must still
run `npm test` and keep it green; new features (pick-teams, host menu,
paste-import, AI-prompt sheet) need their own new tests following the
existing TDD pattern in this codebase.

## 8. Cost / Scope Note

No new paid services. Google Fonts, the new RPCs, and the paste-import
loop are all free-tier-compatible, consistent with the original spec's $0
constraint.
