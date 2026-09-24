# On the Retsef Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand "Wavelength Plus" to "On the Retsef" and apply the full
design system from `docs/design/reference/HANDOFF.md` to every screen,
building the screens/features it specifies that don't exist yet.

**Architecture:** Same React (Vite) + Supabase app as before. This plan
restyles existing components in place (same file paths, same prop
contracts wherever possible) and adds a handful of new components/screens
and two new host-only RPCs. No architectural change to data flow, auth, or
the RPC-as-referee pattern.

**Tech Stack:** Same as the existing app (React 19, Vite 8, Vitest,
Supabase). Adds Google Fonts (Fredoka, Rubik) via `<link>` tags — no new
npm dependencies required for the visual system itself.

**Spec:** `docs/superpowers/specs/2026-09-24-on-the-retsef-rebrand-design.md`
(read this fully — it has the design tokens, screen list, and two new RPCs'
complete SQL). Also read `docs/design/reference/HANDOFF.md` and the
relevant `docs/design/reference/*.dc.html` file(s) for each task — those
are the authoritative source for exact colors, geometry, and copy; the
spec summarizes them.

## Global Constraints

- Never show "Wavelength" in any user-facing string. App name everywhere a
  player sees it: "On the Retsef". Tagline: "The Guess-the-Dial Party
  Game". Secondary line: "How close can you get?"
- Internal identifiers (npm package name, file paths, Supabase project,
  GitHub repo, DB table/column names) are NOT renamed — only user-facing
  copy changes.
- Design tokens (exact hex/gradient values) are in the spec §3 — use CSS
  custom properties on `:root`, not scattered literals.
- This is a single dark visual world (night-sky), no light-mode media
  query needed.
- Every task must keep `npm test` green. Restyling must not change
  existing text content that a test asserts on with `getByText` unless the
  task explicitly says to change that copy (and then the test is updated
  in the same task).
- Desktop-specific two-column board layouts are explicitly OUT OF SCOPE —
  stay responsive single-column at all widths.
- `npx supabase` (no global install), `$HOME/.docker/bin` on PATH for
  Docker CLI, local Supabase stack via `npx supabase start`, never pass
  `--overwrite`/`--force` to any scaffolding tool (standing project rules
  from the original build).
- The local dev server (`npm run dev`) may be running on port 5173 from
  earlier manual testing — an implementer does not need to manage it; Vite
  hot-reloads on file changes automatically, and if the port is in use
  when *this plan's own* verification needs a fresh server, kill it first
  with `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`.

---

## Phase A — Foundation

### Task 1: Design tokens, fonts, and app shell rebrand

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/index.css` (create if it doesn't exist — check first), `index.html`, `src/App.tsx` (title-only strings), `src/App.test.tsx` (if it asserts on old copy)

**Interfaces:**
- Produces: the full CSS custom-property token set from spec §3, imported
  globally. Every later styling task assumes these variables exist on
  `:root`.

- [ ] **Step 1: Read the spec and reference files**

Read `docs/superpowers/specs/2026-09-24-on-the-retsef-rebrand-design.md`
§3 in full, and skim `docs/design/reference/HANDOFF.md` §1 (Tokens) to
cross-check.

- [ ] **Step 2: Create the tokens file**

`src/styles/tokens.css` — copy the exact `:root { ... }` block from spec
§3 verbatim (all listed CSS custom properties), plus the `body { background:
var(--bg); color: var(--text); }` rule.

- [ ] **Step 3: Import tokens globally**

Check whether `src/index.css` already exists (it may not, if it was never
created in the original build). Create it if missing, with:
```css
@import './styles/tokens.css';

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
```
Import it from `src/main.tsx` (`import './index.css'`) if not already
imported there.

- [ ] **Step 4: Add Google Fonts**

In `index.html`, inside `<head>`, add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```
Also update `<title>` in `index.html` from "Wavelength Plus" (or whatever
it currently says) to "On the Retsef".

- [ ] **Step 5: Rebrand any hardcoded "Wavelength" strings**

Search the codebase: `grep -rn -i "wavelength" src/ index.html` (excluding
`node_modules`). For every user-facing string match (screen headings,
button text, page titles — NOT file/variable/table names), replace with
the "On the Retsef" branding per spec §2. Do not rename files, npm package
name, or any Supabase/DB identifier.

- [ ] **Step 6: Run tests, fix any broken assertions**

Run `npm test`. If a test was asserting on old "Wavelength..." copy,
update that specific assertion to match the new copy — don't change
unrelated tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add On the Retsef design tokens and rebrand app shell copy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Starfield background and Logo components

**Files:**
- Create: `src/components/Starfield.tsx`
- Create: `src/components/Logo.tsx`, `src/components/Logo.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: `<Starfield />` (absolute-positioned background layer, no
  props needed for the static case) and `<Logo variant={'inline'|'stacked'|
  'icon'} size={'sm'|'md'|'lg'|'xl'} />`. Every later screen task renders
  `<Starfield />` behind its content and `<Logo>` somewhere in its header.

- [ ] **Step 1: Read the reference files**

Read `docs/design/reference/Starfield.dc.html` and
`docs/design/reference/Logo.dc.html` in full for exact gradient/dot values
and the icon variant's embedded mini-dial.

- [ ] **Step 2: Implement `Starfield.tsx`**

Port the three layered backgrounds (the radial glow, and the two star-dot
`background-image` layers with their exact `radial-gradient` stops and
`background-size`/`background-position`) into a React component using
inline styles or a CSS module — your choice, follow whichever pattern
existing components in this codebase already use (check `DialFan.tsx` for
precedent: it uses inline SVG/style props). Render as
`<div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', ...}}>` with the layered backgrounds as children or
stacked `background-image` on one div. No `chrome` prop needed (that was
mockup-only phone-bezel decoration per the reference file's own comment —
skip it, this is a real web page, not a device mockup).

- [ ] **Step 3: Write the failing `Logo.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders "on the" and "retsef" for the inline variant', () => {
    render(<Logo variant="inline" size="md" />)
    expect(screen.getByText('on the')).toBeInTheDocument()
    expect(screen.getByText('retsef')).toBeInTheDocument()
  })

  it('renders a mini dial for the icon variant', () => {
    render(<Logo variant="icon" size="lg" />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test -- Logo.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `Logo.tsx`**

Implement the three variants per `Logo.dc.html`'s exact styling (font
sizes per the `size` prop's lookup table `sm:[26,13,40], md:[40,17,64],
lg:[64,20,112], xl:[84,24,160]` — first number is the "retsef" font size in
px, second is "on the"'s font size, third is the icon variant's square
size). The gradient text uses `background: var(--wordmark-gradient);
-webkit-background-clip: text; background-clip: text; color: transparent`.
For the icon variant, render a small non-interactive `DialFan` (from
`src/components/DialFan.tsx` — it doesn't exist with the new geometry yet
until Task 4, so for THIS task, render a simple placeholder circle with a
dot at the appropriate angle, OR skip the icon variant's dial and just
render the rounded gradient square with no inner dial for now, noting this
as a follow-up once Task 4 lands. Your call — pick whichever keeps this
task's scope clean, and say which you chose in your report.

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test -- Logo.test.tsx`
Expected: 2 passed (or 1 passed + 1 adjusted, if you deferred the icon
variant's inner dial — adjust the test to match what you actually built
and explain why in your report).

- [ ] **Step 7: Run full suite, commit**

```bash
npm test
git add -A
git commit -m "Add Starfield background and Logo components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Btn component

**Files:**
- Create: `src/components/Btn.tsx`, `src/components/Btn.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: `<Btn kind={'primary'|'secondary'|'accent'|'ghost'} size={'lg'|
  'md'|'sm'} disabled? onClick label>`. Every later screen task uses this
  instead of a bare `<button>` for pill-shaped CTAs (existing bare
  `<button>` elements in Home/Lobby/etc. get replaced with `<Btn>` in
  their respective restyle tasks — this task only builds the component).

- [ ] **Step 1: Read the reference file**

Read `docs/design/reference/Btn.dc.html` for the exact 4 style variants
and the size→height/font-size lookup (`lg:[62,21], md:[54,17], sm:[44,15]`).

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Btn } from './Btn'

describe('Btn', () => {
  it('renders the label and calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Btn kind="primary" size="lg" label="Create party" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Btn kind="primary" size="lg" label="Create party" onClick={onClick} disabled />)
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- Btn.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `Btn.tsx`**

Full pill shape (`border-radius: 999px`), width 100% of its container by
default (matches the reference's block layout), the 4 `kind` styles exactly
per the reference file's colors (primary = gold CTA gradient, secondary =
translucent glass, accent = violet-tinted, ghost = text-only transparent),
sizes per the height/font lookup table, `:active { transform: scale(.97) }`
via a CSS class (inline styles can't express `:active` — use a small CSS
module or a shared class in `tokens.css`/`index.css`, your call), and
`disabled` sets `opacity: 0.4`, `cursor: not-allowed`, and prevents the
click handler from firing.

- [ ] **Step 5: Run test, verify it passes; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Add Btn pill-button component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: DialFan rewrite with real target-centered bands

**Files:**
- Modify: `src/components/DialFan.tsx`, `src/components/DialFan.test.tsx`

**Interfaces:**
- Consumes: `WEDGE_THRESHOLDS` from `src/lib/scoringConstants.ts` (must
  stay in sync — do not hardcode duplicate threshold numbers).
- Produces: same external prop contract as before — `value: number`,
  `interactive?: boolean`, `onChange?: (v: number) => void`,
  `revealedTarget?: number` — consumed unchanged by
  `src/features/game/GameScreen.tsx`. This task changes internals only; it
  must NOT require changes to `GameScreen.tsx`'s calls to `<DialFan>`.

**This is the most detail-sensitive task in the plan — read the reference
file fully before writing any code.**

- [ ] **Step 1: Read the reference file in full**

Read `docs/design/reference/Dial.dc.html` completely, especially the
`renderVals()` method's math: `CY=178, Ro=150, Ri=98, Rm=124`,
`P(v, r) = [180 + r·cos(π(1−v)), CY − r·sin(π(1−v))]`, the `band(a,b)`
path-builder (an annular-sector path between radius `Ri` and `Ro`), and
the needle polygon construction (`tip = P(v, Ro+2)`, plus two base points
offset perpendicular to the tip by `±6px`, forming a tapered triangle, with
the drop-shadow duplicate underneath).

- [ ] **Step 2: Read the current implementation and its test**

Read the existing `src/components/DialFan.tsx` and
`src/components/DialFan.test.tsx` in full. Note the current viewBox
(`0 0 220 125`) and prop contract — you are changing the internal
geometry to the new viewBox (`0 0 360 250`) and visual style, but keeping
the external props identical so `GameScreen.tsx` doesn't need to change.

- [ ] **Step 3: Update the existing test for the new geometry**

The existing test's specific pixel assertions (if any check exact SVG
coordinates) will need updating for the new `360×250` viewBox and
`(180,178)` pivot. Keep the same *behavioral* assertions (role="slider",
`aria-valuenow` reflects `value`, `aria-readonly` reflects
`interactive`/`onChange` presence, arrow-key and pointer interactions call
`onChange`) — only the numeric geometry expectations change. If the
existing test drags to a specific pixel position, recompute that position
for the new geometry using the `P(v,r)` formula above.

- [ ] **Step 4: Run the test, confirm it fails for the geometry reason**

Run: `npm test -- DialFan.test.tsx`
Expected: FAIL on the geometry-specific assertions (this confirms you're
testing the new geometry, not accidentally passing against old code).

- [ ] **Step 5: Rewrite `DialFan.tsx`**

New viewBox `0 0 360 250`, pivot `(180,178)`, ring background (a filled
annular arc from `Ri=98` to outer `Ro=150`, colored per the reference's
`rg{uid}` linear-gradient `#2E2266 → #15103A`, with a `rgba(190,170,255,.4)`
stroke), then:
- **If `revealedTarget !== undefined`:** draw the 5 colored bands (gold
  center ±`WEDGE_THRESHOLDS.center`, pink ±(`inner`−`center`) on each side,
  violet ±(`outer`−`inner`) on each side — i.e. reuse the exact same
  `band(a,b)` helper called with `revealedTarget ± threshold` pairs
  matching the reference's `r1..r5` construction, just parameterized by
  `revealedTarget` instead of the reference's demo `target` prop) plus the
  score-number labels (2/3/4/3/2) at radius `Rm=124`, each rotated to
  follow the arc (`rotate((m-0.5)*180, x, y)`) and only shown when not too
  close to either end (`m > 0.02 && m < 0.98`, matching the reference).
  **If `revealedTarget === undefined`:** skip the bands and labels
  entirely — only the plain ring shows.
- The needle: tapered polygon per Step 1's math, using `value` (the
  current guess/drag position) as `v`, with the reference's radial
  gradient (`nd{uid}`: white → `#FFE9A8` → `#F2A93B`) and a drop-shadow
  duplicate polygon underneath at `translate(0,3)` with `opacity:.25`.
- The pivot cap: the small half-moon `<path>` with its own radial gradient
  (`pl{uid}`: white → `#D9D3F2` → `#7E73B8`) plus the small white ellipse
  highlight, per the reference.
- Keep `role="slider"`, `aria-valuenow={value}`, `aria-valuemin={0}`,
  `aria-valuemax={1}`, `aria-readonly={!isInteractive}`,
  `tabIndex={isInteractive ? 0 : -1}`, and the existing keyboard
  (ArrowLeft/ArrowRight, step 0.01, clamped 0–1) and pointer-drag handlers
  from the current implementation — port the interaction logic as-is,
  just recompute pointer-to-value math for the new viewBox dimensions and
  pivot (use the reference's `setFrom` method's `atan2` approach, which
  clamps the angle to `[0, π]` before converting to a value, handling the
  edge case where a drag goes past either end of the semicircle).

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test -- DialFan.test.tsx`
Expected: all pass.

- [ ] **Step 7: Run the full suite — GameScreen tests must still pass unchanged**

Run: `npm test`
Expected: all pass, including `GameScreen.test.tsx` (which renders
`<DialFan>` without needing any changes to its own code, per this task's
"same external prop contract" requirement). If `GameScreen.test.tsx`
breaks, that means the prop contract changed — fix `DialFan.tsx`, not
`GameScreen.tsx`, unless you're certain a `GameScreen.tsx` change is
correct and explain why in your report.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Rewrite DialFan with target-centered scoring bands and new geometry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: ClueCard component

**Files:**
- Create: `src/components/ClueCard.tsx`, `src/components/ClueCard.test.tsx`

**Interfaces:**
- Produces: `<ClueCard label={string} clue={string} tone={'default'|
  'gold'|'nova'} editable={boolean} onClueChange?={(v:string)=>void}
  live={boolean} size={'md'|'lg'}>`. Used by `GameScreen.tsx` in a later
  task to replace its current plain clue display.

- [ ] **Step 1: Read the reference file**

Read `docs/design/reference/ClueCard.dc.html` for exact tone-color pairs,
the `live` badge styling (pulsing pink dot + "LIVE" caps text), and the
editable-input vs. static-span rendering split.

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClueCard } from './ClueCard'

describe('ClueCard', () => {
  it('shows the label and clue text when not editable', () => {
    render(<ClueCard label="Alex's clue" clue="Coffee" tone="default" editable={false} />)
    expect(screen.getByText("Alex's clue")).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
  })

  it('renders an editable input and calls onClueChange when editable', () => {
    const onClueChange = vi.fn()
    render(<ClueCard label="Your clue" clue="" tone="gold" editable onClueChange={onClueChange} placeholder="Type a clue…" />)
    const input = screen.getByPlaceholderText('Type a clue…')
    fireEvent.change(input, { target: { value: 'Sauna' } })
    expect(onClueChange).toHaveBeenCalledWith('Sauna')
  })

  it('shows a LIVE badge when live is true', () => {
    render(<ClueCard label="Watching" clue="Coffee" tone="nova" editable={false} live />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test, verify it fails; implement `ClueCard.tsx`; verify it passes**

Implement per the reference file's styling. Run: `npm test -- ClueCard.test.tsx`.

- [ ] **Step 4: Run full suite, commit**

```bash
npm test
git add -A
git commit -m "Add ClueCard component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: TeamScoreboard rewrite for N teams

**Files:**
- Modify: `src/components/TeamScoreboard.tsx`

**Interfaces:**
- Consumes: same `teams: {id,name,score}[]` and `activeTeamId: string`
  props the component already takes (per the original plan's Task 17) —
  keep this contract, `GameScreen.tsx` doesn't need to change. Extend
  internally to also accept an optional `psychicPlayerId?: string` and
  `playersByTeam?: Record<string, {id,display_name,avatar}[]>` if you want
  to show the psychic ring/avatars per the design — if threading that data
  through from `GameScreen.tsx` is more than a one-line prop addition,
  it's acceptable to defer the avatar-row/psychic-ring detail and keep
  just the restyled name+score cards for this task; say which you did in
  your report. The score numbers and card styling are the must-have; the
  avatar row is a nice-to-have.

- [ ] **Step 1: Read the reference file**

Read `docs/design/reference/Scoreboard.dc.html` for the two-team layout,
then generalize: this app supports N teams (not just 2), so use a
responsive grid (`grid-template-columns: repeat(auto-fit, minmax(130px,
1fr))`) instead of the reference's fixed 2-column grid, while keeping the
same per-card styling (gradient background, colored border/glow when
active, `opacity:.7` when inactive-and-something-else-is-active).

- [ ] **Step 2: Assign team colors by index**

Per spec §3: team index 0 = `--comets` (`#FF6FA3`), index 1 = `--novas`
(`#5BD6FF`), index 2 = `--violet` (`#8C6BFF`), index 3 = `--gold`
(`#FFD166`), then repeat. Compute this from the team's position in the
`teams` array (or sort by `id` first if the array order isn't stable —
check how `GameScreen.tsx` currently passes `teams` and use a stable,
deterministic ordering, e.g. sort by `id`, so a given party's team colors
don't visually shuffle between renders).

- [ ] **Step 3: Implement the restyle**

Apply the gradient card background, colored border/glow for the
`activeTeamId` match, big Fredoka score number in the team's color,
`opacity:.7` for inactive cards. If you're including the avatar
row/psychic ring (optional per Step 1), follow the reference's
`ring: on ? '0 0 0 2px <bg>, 0 0 0 4px var(--gold)' : 'none'` pattern.

- [ ] **Step 4: Run the full test suite — must not break `GameScreen.test.tsx`**

Run: `npm test`. `TeamScoreboard` has no dedicated test file per the
original plan (it was reviewed as presentational and covered via
`GameScreen.test.tsx`) — if your restyle changes rendered text in a way
that breaks a `GameScreen.test.tsx` assertion, fix the assertion only if
the new text is still meaningful and correct; otherwise adjust your
implementation to preserve the original text content.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Restyle TeamScoreboard for N teams with color rotation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: GameHeader component

**Files:**
- Create: `src/components/GameHeader.tsx`, `src/components/GameHeader.test.tsx`

**Interfaces:**
- Produces: `<GameHeader round={number} total={number} room?={string}
  onMenu={() => void}>`. Used by `GameScreen.tsx` and `Lobby.tsx` in later
  tasks.

- [ ] **Step 1: Read the reference file**

Read `docs/design/reference/GameHeader.dc.html` for the logo+round-dots+
hamburger layout and the wider room-code-chip variant.

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GameHeader } from './GameHeader'

describe('GameHeader', () => {
  it('shows the round progress and calls onMenu when the menu button is tapped', () => {
    const onMenu = vi.fn()
    render(<GameHeader round={2} total={3} onMenu={onMenu} />)
    expect(screen.getByText('Round 2/3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(onMenu).toHaveBeenCalled()
  })

  it('shows a room code chip when room is provided', () => {
    render(<GameHeader round={1} total={1} room="TQXK" onMenu={vi.fn()} />)
    expect(screen.getByText(/TQXK/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Implement `GameHeader.tsx`**

Give the hamburger button an accessible name (e.g. `aria-label="Menu"`) so
the test's `getByRole('button', { name: /menu/i })` query works. Render
`total` gold-or-dim progress dots (filled for `i < round`). When `room` is
passed, render the "Join at retsef.app · `room`" chip per the reference.

- [ ] **Step 4: Run test, verify it passes; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Add GameHeader component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Soundboard restyle

**Files:**
- Modify: `src/features/noises/Soundboard.tsx`, `src/features/noises/Soundboard.test.tsx` (only if needed)

**Interfaces:**
- Consumes/produces: same prop contract as the existing component
  (`partyId, myPlayerId, mutedUntil, isHost, players`) — this task only
  changes internal styling and the muted-overlay message, not behavior or
  props. All 3 existing tests must keep passing unchanged unless a specific
  new assertion is warranted (e.g. if you add a live countdown).

- [ ] **Step 1: Read the reference file**

Read `docs/design/reference/Soundboard.dc.html` for the circular
icon-button row, the tap-glow interaction (450ms `setTimeout`), and the
muted overlay's exact copy: `Host muted you · 0:NN`.

- [ ] **Step 2: Restyle**

Circular 46px buttons in a horizontal scroll row (`overflow-x: auto`),
each with the emoji icon and a small caption underneath, gold glow +
background tint for 450ms after tapping (reuse this codebase's existing
`audioRefs`/`playSound` logic — only the visual feedback and layout
change). Muted overlay: compute remaining seconds from `mutedUntil` (
`Math.max(0, Math.ceil((new Date(mutedUntil).getTime() - Date.now()) / 1000))`)
and render `Host muted you · 0:${String(seconds).padStart(2,'0')}`. A
static (non-live-updating) countdown at mount time is acceptable; a truly
live-ticking countdown (`setInterval`) is a nice-to-have — your call, note
which you did.

- [ ] **Step 3: Run the existing tests, verify they still pass**

Run: `npm test -- Soundboard.test.tsx`. If a test asserted specific muted-
overlay text that no longer matches (e.g. it expected different wording),
update ONLY that assertion to the new copy — everything else (broadcast
behavior, mute-check logic, host-only mute controls) is unchanged and
those assertions must still pass as-is.

- [ ] **Step 4: Run full suite, commit**

```bash
npm test
git add -A
git commit -m "Restyle Soundboard with circular buttons and glow feedback

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase B — Screen Restyles & New Features

### Task 9: Sign-in restyle with 6-box code entry

**Files:**
- Modify: `src/features/auth/SignIn.tsx`, `src/features/auth/SignIn.test.tsx`

**Interfaces:**
- Consumes: `Starfield`, `Logo`, `Btn` from Tasks 2–3.
- Produces: same external behavior (calls `supabase.auth.signInWithOtp`
  then `verifyOtp`) — only the UI changes. `App.tsx` doesn't need to
  change.

- [ ] **Step 1: Read the current file and its test in full**

Read `src/features/auth/SignIn.tsx` and `SignIn.test.tsx` completely
before changing anything.

- [ ] **Step 2: Design the 6-box code entry**

Replace the current single `<input id="otp">` with 6 individual
single-character inputs (`inputMode="numeric"`, `maxLength={1}`, each with
a stable `id` like `otp-0`..`otp-5`). On typing a digit in box N, move
focus to box N+1 (if N<5); on Backspace in an empty box, move focus to box
N-1 (if N>0). Maintain the combined 6-digit string in component state and
call `verifyOtp` with the joined string on submit (keep an explicit
"Verify" button too, don't rely solely on auto-submit-on-fill, so the
existing test's `fireEvent.click(screen.getByRole('button', {name: /verify/i}))`
pattern still has something to click).

- [ ] **Step 3: Update `SignIn.test.tsx`**

The existing test likely does
`fireEvent.change(await screen.findByLabelText(/6-digit code/i), { target: { value: '123456' } })`
against a single input — this needs to change to fill 6 separate boxes.
Update the test to type each digit into its own box (e.g. by `id` or a
shared `aria-label` pattern like `aria-label="Code digit 1"` etc.), then
click Verify, and assert `verifyOtp` was called with the full
concatenated code — keep the assertion on the final `verifyOtp` call
shape, just change how the test fills the input.

- [ ] **Step 4: Restyle with Starfield/Logo/Btn and tokens**

Wrap the screen in `<Starfield />` (as a background layer) + centered
content: `<Logo variant="stacked" size="xl" />`, the email input (styled
per `--input-bg`/`--input-border` tokens), the "Send code" `<Btn kind="primary" size="lg">`, then the 6-box code UI once a code has been
requested, then "Verify" `<Btn>`.

- [ ] **Step 5: Run tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle sign-in with 6-box code entry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Name + avatar step extraction and restyle

**Files:**
- Create: `src/features/party/NameAvatarStep.tsx`, `src/features/party/NameAvatarStep.test.tsx`
- Modify: `src/App.tsx` (extract the inline name/avatar UI from `Gate` into this new component, rendered as its own step)

**Interfaces:**
- Consumes: `AvatarPicker` (existing), `Starfield`, `Logo`, `Btn`.
- Produces: `<NameAvatarStep initialName={string} initialAvatar={string} onContinue={(name:string, avatar:string) => void}>`. Read the CURRENT `src/App.tsx` first — this task changes its `Gate` component's control flow (adding a step before Home renders), so understand exactly what's there before editing.

- [ ] **Step 1: Read `src/App.tsx` in full**

Understand the current `Gate` component: where `displayName`/`avatar`
state lives, how it's currently rendered inline above `<Home>`, and how
`handleCreate`/`handleJoin` use those values.

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NameAvatarStep } from './NameAvatarStep'

describe('NameAvatarStep', () => {
  it('pre-fills the given name/avatar and calls onContinue with the current values', () => {
    const onContinue = vi.fn()
    render(<NameAvatarStep initialName="Maya" initialAvatar="🌮" onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledWith('Maya', '🌮')
  })
})
```

- [ ] **Step 3: Run test, verify it fails; implement `NameAvatarStep.tsx`**

A name text input (pre-filled with `initialName`), the existing
`<AvatarPicker>` component (pre-selected to `initialAvatar`), and a
"Continue" `<Btn kind="primary" size="lg">` that calls `onContinue` with
the current name/avatar state. Restyle with Starfield/Logo/tokens matching
the design's P04.

- [ ] **Step 4: Wire it into `App.tsx`'s `Gate`**

Add a step before `Home` renders: show `NameAvatarStep` first (on initial
load, or whenever the user hasn't set a name/avatar for this session yet —
your call on exact triggering logic, but the simplest correct approach is
to always show it once per app load, before Home, using local component
state to track whether this step is "done"), and once `onContinue` fires,
store the name/avatar in `Gate`'s existing state (replacing the old inline
UI) and proceed to render `Home` as before.

- [ ] **Step 5: Run test, verify it passes; run full suite (especially `App.test.tsx`); commit**

`App.test.tsx`'s smoke test may need a small update if it now needs to
click through the new step to reach what it was previously testing — read
`App.test.tsx` first and adjust minimally if needed.

```bash
npm test
git add -A
git commit -m "Extract name/avatar picker into its own screen step

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Home screen restyle

**Files:**
- Modify: `src/features/home/Home.tsx`, `src/features/home/Home.test.tsx` (only if copy changes)

**Interfaces:**
- Consumes: `Starfield`, `Logo`, `Btn`. Same `onCreate`/`onJoin` prop
  contract as before — no change to `App.tsx`'s usage.

- [ ] **Step 1: Read the current file and test**

Read `src/features/home/Home.tsx` and `Home.test.tsx` in full.

- [ ] **Step 2: Restyle**

`<Starfield />` background, `<Logo variant="inline" size="sm">` in a
header row, a big primary `<Btn>` for "Create a party", a card-styled
room-code input + "Join party" `<Btn kind="teal">`... (note: the design's
accent for this action can be `secondary` or `accent` kind per your
judgment — there's no explicit "teal" kind in this design system, unlike
the old one; pick `accent` (violet) or `secondary` for the join action to
keep it visually distinct from the gold primary CTA).

- [ ] **Step 3: Run tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle Home screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Lobby restyle + pick-teams mode + noises toggle

**Files:**
- Modify: `src/features/party/Lobby.tsx`, `src/features/party/Lobby.test.tsx`

**Interfaces:**
- Consumes: `GameHeader` (with `room` prop), `Btn`, `Starfield`, tokens.
- Consumes existing RPCs: `set_party_settings` (now actually passing a
  real `p_team_mode` and `p_noises_enabled` from UI state, not hardcoded),
  `assign_manual_team` (new usage — not called anywhere in the frontend
  before this task).
- Produces: same `<Lobby partyId roomCode isHost onStartGame>` prop
  contract — no change to `App.tsx`'s `PartyRoom` usage.

- [ ] **Step 1: Read the current file and test in full**

Read `src/features/party/Lobby.tsx` and `Lobby.test.tsx` completely. Note
exactly how `set_party_settings` is currently called (with hardcoded
`p_team_mode: 'random'` and `p_noises_enabled: true`) and how players are
currently loaded/subscribed.

- [ ] **Step 2: Add a team-mode segmented control**

A "Random / Pick" toggle (two `Btn`-like segments, or a simple styled
`<div role="radiogroup">` — your call) that calls `set_party_settings`
with the chosen `p_team_mode`. Persist the current mode in local state,
initialized from the party's actual `team_mode` (fetch it alongside the
existing settings query, or add one if the component doesn't already read
party settings — check the current implementation first).

- [ ] **Step 3: Add the "Pick" mode UI**

When `team_mode === 'manual'`: show each player their own row with a
"Join team" control — simplest correct approach: a text input + "Create /
join team" button that calls
`supabase.rpc('assign_manual_team', { p_party_id: partyId, p_player_id:
<the current viewer's own player id>, p_team_name: <input value> })`. You
need the current viewer's own `player.id` — the component may already
compute or receive this; if not, derive it via
`supabase.auth.getUser()` + a `players` query filtered by
`account_id`/`party_id`, following the same pattern used elsewhere in this
codebase (e.g. `PartyRoom` in `App.tsx`). Show existing teams (grouped
from the already-subscribed players list) as tappable options too, so a
player can join an existing team by tapping it instead of retyping its
name.

- [ ] **Step 4: Gate "Start game" on full team assignment in Pick mode**

When `team_mode === 'manual'`, disable the host's "Start game" button
until every player in the `players` list has a non-null `team_id`. In
`random` mode, keep the existing behavior (teams come from `shuffle_teams`).

- [ ] **Step 5: Add the noises toggle**

A visible toggle (styled per spec, reusing the reference's toggle-switch
look — a simple `<button role="switch" aria-checked>` styled as a pill
with a sliding dot is fine) that calls `set_party_settings` with the
chosen `p_noises_enabled` value, replacing the hardcoded `true`.

- [ ] **Step 6: Restyle the rest of the screen**

Room code + `<GameHeader>`-style header (or a simpler standalone room-code
card, your call — `GameHeader`'s `room` variant may not fit the lobby's
specific layout needs; use it if it fits, otherwise a bespoke room-code
card per the reference `HANDOFF.md`'s general card styling is fine),
player chips, team-size/rounds steppers, `<Btn>` for Reshuffle/Start game.

- [ ] **Step 7: Update `Lobby.test.tsx`**

Add test coverage for: the team-mode toggle calling `set_party_settings`
with the right `p_team_mode`, and (at least) that `assign_manual_team` is
callable from the new Pick-mode UI with correct args. Keep the existing
tests (room code display, player list, Reshuffle) passing — adjust only
if your restyle changed how those elements are queried (e.g. if you wrap
text differently, per the established `<span>`-wrapping precedent from the
original build).

- [ ] **Step 8: Run tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle Lobby, add pick-teams mode and noises toggle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: GameScreen restyle across all states

**Files:**
- Modify: `src/features/game/GameScreen.tsx`, `src/features/game/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `GameHeader`, `ClueCard`, `TeamScoreboard` (restyled), `DialFan`
  (rewritten), `Soundboard` (restyled), `Btn`, `Starfield`, tokens.
- Produces: same `<GameScreen turnId myPlayerId myTeamId teams isHost
  myMutedUntil players>` prop contract — no change to `App.tsx`'s
  `PartyRoom` usage.

- [ ] **Step 1: Read the current file and test in full**

Read `src/features/game/GameScreen.tsx` and `GameScreen.test.tsx`
completely — this is the most state-branchy file in the app (clue/
guessing/betting/revealed × psychic/active-team/other-team), so understand
every existing branch before restyling.

- [ ] **Step 2: Wrap in Starfield, add GameHeader**

`<Starfield />` background; `<GameHeader round={/* derive from turn.round_number and party rounds setting if available, else omit total-round context if not threaded through — check what data GameScreen already has */} total={...} onMenu={/* opens the host menu sheet, built in Task 14 */} />`. If `GameScreen` doesn't currently receive the party's total `rounds` setting, thread it through as a new prop from `PartyRoom` in `App.tsx` (a small, additive prop change — update the 2 existing test render calls in `GameScreen.test.tsx` to pass a `totalRounds` prop too).

- [ ] **Step 3: Replace the scoreboard rendering**

Use the restyled `<TeamScoreboard teams={teams} activeTeamId={turn.team_id} />` (same call as before, just restyled internally by Task 6 — no
change needed here beyond confirming it still renders correctly).

- [ ] **Step 4: Replace clue display with `<ClueCard>`**

- Clue phase, psychic: `<ClueCard label="Your clue" clue={clueText} tone="gold" editable onClueChange={setClueText} placeholder="Type a clue…" />` plus the existing "Said it out loud" button.
- Clue phase, non-psychic: `<ClueCard label="Waiting for the clue…" clue="" tone="default" editable={false} />` (or keep the simple "Waiting for the clue…" text if wrapping it in ClueCard feels awkward for this specific state — your call, note which).
- Guessing/betting phases: `<ClueCard label={psychicName + "'s clue"} clue={turn.clue_text} tone="default" editable={false} live={!isActiveTeam} />` — the `live` badge shows for teams watching someone else play.

- [ ] **Step 5: Replace guess/bet controls with `<Btn>`**

"Lock In Guess" → `<Btn kind="primary" size="lg">`; Left/Right bet buttons
→ two `<Btn kind="secondary">` or `<Btn kind="accent">` side by side (pick
whichever pairing reads better — they should look visually distinct from
each other, e.g. one `secondary` one `accent`); "Next turn"/reveal CTA →
`<Btn kind="primary">`.

- [ ] **Step 6: Mount the restyled `<Soundboard>`**

Same call as before (Task 8 restyled it internally) — no signature change.

- [ ] **Step 7: Update `GameScreen.test.tsx`**

Update the two existing render calls for any new required props (e.g.
`totalRounds` from Step 2, `myMutedUntil`/`players` already required from
the original build). Keep all existing behavioral assertions (submit_clue
RPC call shape, waiting-for-clue message, etc.) — adjust only text-content
assertions that your restyle genuinely changed (e.g. if "Waiting for the
clue…" became a `ClueCard` with different exact wording), and say so in
your report.

- [ ] **Step 8: Run tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle GameScreen with GameHeader, ClueCard, and Btn

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Host menu (new feature) + skip_turn/end_game RPCs

**Files:**
- Create: `supabase/migrations/<timestamp>_skip_and_end_game.sql`
- Create: `tests/integration/skip_and_end_game.test.ts`
- Create: `src/features/game/HostMenu.tsx`, `src/features/game/HostMenu.test.tsx`
- Modify: `src/features/game/GameScreen.tsx` (mount the sheet, wire `onMenu`)

**Interfaces:**
- Produces: RPCs `skip_turn(p_party_id uuid) returns turns_view` and
  `end_game(p_party_id uuid) returns parties` (exact SQL in the spec §6 —
  copy it verbatim). Produces `<HostMenu open onClose partyId
  currentPsychicName players myPlayerId onMuteSuccess?>` rendered as a
  bottom sheet from `GameScreen`'s `GameHeader onMenu` callback.

- [ ] **Step 1: Read spec §6 in full**

Read `docs/superpowers/specs/2026-09-24-on-the-retsef-rebrand-design.md`
§6 for the exact SQL of both new RPCs.

- [ ] **Step 2: Write the migration**

```bash
npx supabase migration new skip_and_end_game
```
Paste the exact SQL from spec §6 (`skip_turn` and `end_game`) into the
generated file.

- [ ] **Step 3: Write the integration tests**

```ts
import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('skip_turn', () => {
  it('marks the current turn revealed without changing scores', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    const { data: skipped, error } = await host.rpc('skip_turn', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(skipped.status).toBe('revealed')

    const { data: teamsAfter } = await host.from('teams').select('score').eq('party_id', party.id)
    expect(teamsAfter!.every((t) => t.score === 0)).toBe(true)
    void firstTurn
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    const guest = await signUpAndSignIn()
    await guest.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Guest', p_avatar: '🙂' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    await host.rpc('start_game', { p_party_id: party.id })

    const { error } = await guest.rpc('skip_turn', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})

describe('end_game', () => {
  it('sets the party status to finished for the host', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const { data: updated, error } = await host.rpc('end_game', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(updated.status).toBe('finished')
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('end_game', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 4: Apply and test**

```bash
npx supabase db reset
npm run test:integration -- skip_and_end_game.test.ts
```
Confirm all 4 pass. Then run the full `npm run test:integration` once to
confirm no regressions.

- [ ] **Step 5: Push the new migration to the remote project**

```bash
npx supabase db push
```
If this fails due to missing credentials in your environment, that's
expected — report it as a concern rather than attempting a workaround; the
controller has the access token and will run this step directly (same
pattern as the original build's Task 13).

- [ ] **Step 6: Build the `HostMenu` component**

A bottom-sheet-styled panel (per spec's `--sheet` gradient token, rounded
top corners, slides up from the bottom or simply renders as an overlay —
no complex animation library needed, a CSS transition is enough) with:
noises on/off toggle (reuse the same pattern as Task 12's Lobby toggle,
calling `set_party_settings`), a scrollable list of players with "Mute"
buttons (reuse the mute logic already in `Soundboard.tsx` — extract it to
a small shared helper if that's clean, or duplicate the one RPC call if
extracting isn't worth the churn, your call), "Force-skip `<name>`'s turn"
(calls the new `skip_turn` RPC), and "End game for everyone" (calls
`end_game`, and per the artifact/product norms for a destructive-ish
action within the app, consider a simple inline "tap again to confirm"
pattern rather than a native `confirm()` dialog — no need for anything
elaborate).

- [ ] **Step 7: Write `HostMenu.test.tsx`**

Cover: renders when `open`, calls the right RPC for skip/end-game with the
right args, doesn't render the host-only actions when `isHost` is false
(if you choose to make this component reusable for both host and non-host
—simplest is to only ever mount it for hosts from `GameScreen`, and note
that choice in your report if you take it, in which case the component
doesn't need an internal `isHost` branch at all).

- [ ] **Step 8: Wire into `GameScreen.tsx`**

`GameHeader`'s `onMenu` opens the sheet (local `useState` boolean), only
rendered/openable when `isHost` (per the design's "host only" note in
HANDOFF.md).

- [ ] **Step 9: Run all tests, commit**

```bash
npm test
git add -A
git commit -m "Add host menu with skip_turn and end_game RPCs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: FinalScoreboard restyle

**Files:**
- Modify: `src/features/game/FinalScoreboard.tsx`, `src/features/game/FinalScoreboard.test.tsx` (only if copy changes)

**Interfaces:**
- Consumes: `Starfield`, `Logo`, `Btn`. Same `<FinalScoreboard teams
  onPlayAgain onNewTeams>` prop contract.

- [ ] **Step 1: Read the current file and test**

Read both in full.

- [ ] **Step 2: Restyle**

`<Starfield />`, a winner headline ("Team `<name>` wins! 🎉" or similar —
your call on exact copy, keep it upbeat and specific to the actual winning
team's name), ranked rows (numbered, since this genuinely is a ranked
sequence — winner's row gets the gold/teal-glow treatment per the
reference's "winner" card style, adapted to this design's gold accent
instead of the old teal), `<Btn>` for Play again / New teams.

- [ ] **Step 3: Run tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle FinalScoreboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: Packs screens restyle + paste-import + AI-prompt sheet

**Files:**
- Modify: `src/features/packs/PacksList.tsx`, `src/features/packs/PacksList.test.tsx`
- Modify: `src/features/packs/PackEditor.tsx`, `src/features/packs/PackEditor.test.tsx`
- Create: `src/features/packs/pasteImport.ts`, `src/features/packs/pasteImport.test.ts`
- Create: `src/features/packs/AiPromptSheet.tsx`, `src/features/packs/AiPromptSheet.test.tsx`

**Interfaces:**
- Consumes: `Starfield`, `Btn`, tokens. `add_spectrum` RPC (existing,
  reused in a loop for paste-import).
- Produces: a pure function `parsePasteLines(text: string, existing:
  {left_label:string,right_label:string}[]): { valid:
  {left:string,right:string}[]; results: Array<{line:string; status:
  'ok'|'needs-format'|'duplicate'} > }` for the paste-import parsing logic
  (kept pure and separately testable), and `<AiPromptSheet>` as a
  standalone component usable from `PackEditor`.

- [ ] **Step 1: Read the current files and spec §5 in full**

Read `PacksList.tsx`, `PackEditor.tsx`, their tests, and spec §5 (which has
the exact paste-format rules and the AI-prompt template) completely.

- [ ] **Step 2: Write the failing tests for `parsePasteLines`**

```ts
import { describe, it, expect } from 'vitest'
import { parsePasteLines } from './pasteImport'

describe('parsePasteLines', () => {
  it('parses lines separated by |, ↔, <->, tab, or vs', () => {
    const text = 'Awful beer | Great beer\nCold ↔ Hot\nBoring <-> Exciting\nSmall vs Big\n1. Quiet vs. Loud'
    const { valid, results } = parsePasteLines(text, [])
    expect(valid).toEqual([
      { left: 'Awful beer', right: 'Great beer' },
      { left: 'Cold', right: 'Hot' },
      { left: 'Boring', right: 'Exciting' },
      { left: 'Small', right: 'Big' },
      { left: 'Quiet', right: 'Loud' },
    ])
    expect(results.every((r) => r.status === 'ok')).toBe(true)
  })

  it('flags a line that does not split into exactly 2 parts as needs-format', () => {
    const { results } = parsePasteLines('just one thing with no separator', [])
    expect(results[0].status).toBe('needs-format')
  })

  it('flags a case-insensitive duplicate against existing pack contents', () => {
    const { results } = parsePasteLines('cold | hot', [{ left_label: 'Cold', right_label: 'Hot' }])
    expect(results[0].status).toBe('duplicate')
  })

  it('flags a duplicate against an earlier line in the same paste', () => {
    const { results } = parsePasteLines('Cold | Hot\ncold | hot', [])
    expect(results[0].status).toBe('ok')
    expect(results[1].status).toBe('duplicate')
  })

  it('strips leading numbering and bullet markers', () => {
    const { valid } = parsePasteLines('1. Cold | Hot\n- Small | Big\n* Quiet | Loud\n• Old | New', [])
    expect(valid.map((v) => v.left)).toEqual(['Cold', 'Small', 'Quiet', 'Old'])
  })
})
```

- [ ] **Step 3: Run tests, verify they fail; implement `parsePasteLines` in `pasteImport.ts`**

Use the reference regex from spec §5:
`line.split(/\s*(?:\||↔|<->|\t|\s+vs\.?\s+)\s*/i)` after first stripping a
leading `^\s*(?:\d+[.)]|[-*•])\s*` marker. A line splitting into exactly 2
non-empty trimmed parts is `ok`; otherwise `needs-format`. Track seen
`left|right` pairs (lowercased) across both `existing` and earlier lines
in this same paste to detect `duplicate`.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- pasteImport.test.ts`

- [ ] **Step 5: Build the paste-import UI in `PackEditor.tsx`**

A mode toggle ("Add one" / "Paste a list") in the existing pack editor. In
paste mode: a large `<textarea>` (monospace font per tokens), a live
preview list showing each line's parsed result (✓ / "Needs Left | Right" /
"Already in pack"), and a `<Btn>` reading `Add N spectrums` (N = count of
`ok` results), disabled when N=0. On click, call `add_spectrum` once per
valid parsed pair (sequential awaits), then refresh the pack's spectrum
list (reuse the existing `load()` function in `PackEditor.tsx`).

- [ ] **Step 6: Build `AiPromptSheet.tsx`**

A topic `<input>`, a "Generate" `<Btn>` that fills in the template from
spec §5 with the topic interpolated, a read-only `<textarea>` or `<pre>`
showing the filled prompt, and a "Copy" `<Btn>` calling
`navigator.clipboard.writeText(prompt)` wrapped in try/catch — on failure,
select the text in the textarea instead (`element.select()`) as a fallback
so the user can manually copy.

- [ ] **Step 7: Write `AiPromptSheet.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AiPromptSheet } from './AiPromptSheet'

describe('AiPromptSheet', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('fills the template with the given topic and copies it', async () => {
    render(<AiPromptSheet />)
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: 'beer' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(screen.getByText(/about "beer"/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })
})
```

- [ ] **Step 8: Wire `AiPromptSheet` into `PackEditor.tsx`**

A small link/button ("Need ideas? Ask an AI") that opens `AiPromptSheet`
in a modal/sheet, alongside the paste-import UI.

- [ ] **Step 9: Restyle `PacksList.tsx` and the rest of `PackEditor.tsx`**

`<Starfield />`, card-styled pack list, `<Btn>` for creating a pack, per
the general token/component system (no dedicated reference screen exists
for these — apply the same card/button/input styling used elsewhere for
consistency).

- [ ] **Step 10: Run all tests, verify they pass; run full suite; commit**

```bash
npm test
git add -A
git commit -m "Restyle packs screens; add paste-import and AI-prompt sheet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: Splash screen, final whole-app pass, and verification

**Files:**
- Modify: `src/App.tsx` (replace bare "Loading…" with a Splash view), `src/App.test.tsx`

**Interfaces:**
- Consumes: `Starfield`, `Logo`.

- [ ] **Step 1: Read the current `App.tsx` loading states**

Find every place `App.tsx` currently renders plain "Loading…" text
(auth loading, party-state loading) and note them.

- [ ] **Step 2: Build the Splash view**

A small inline component or just a JSX block: `<Starfield />` + `<Logo variant="icon" size="lg" />` + `<Logo variant="stacked" size="xl" />` + the
tagline "The Guess-the-Dial Party Game", replacing the bare "Loading…"
text used while the auth session is resolving. The `PartyRoom`'s own
"Loading…" (waiting for initial party state) can reuse the same visual
treatment or a simpler centered spinner-less version — your call, keep it
consistent with the rest of the app's tone rather than a jarring plain-text
fallback.

- [ ] **Step 3: Update `App.test.tsx` if it asserts on the literal "Loading…" text**

Adjust only if needed.

- [ ] **Step 4: Full-repo search for any remaining "Wavelength" strings**

```bash
grep -rn -i "wavelength" src/ index.html docs/superpowers/ 2>/dev/null | grep -v "docs/superpowers/specs\|docs/superpowers/plans"
```
(The spec/plan documents themselves legitimately mention "Wavelength" as
historical context — exclude those. Everything else, especially anything
under `src/` or `index.html`, must not mention it.) Fix any stragglers
found.

- [ ] **Step 5: Run the full unit suite and the full integration suite**

```bash
npm test
npx supabase db reset
npm run test:integration
```
Both must be fully green. Also run `npm run build` and `npx tsc -b` to
confirm the production build and typecheck are clean.

- [ ] **Step 6: Manual smoke check**

Start the dev server if it isn't already running
(`lsof -ti:5173 -sTCP:LISTEN | xargs -r kill && npm run dev &`) and fetch
`http://localhost:5173` with `curl` to confirm it serves the app shell
without a server error. A full visual check is for the human operator, not
this task — this step just confirms the app boots.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add splash screen and finish On the Retsef rebrand pass

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage:** rebrand copy (Task 1, 17), design tokens/fonts (Task 1),
all shared components from HANDOFF.md's component table (Tasks 2, 3, 4, 5,
6, 7; Soundboard restyled in Task 8), all restyle-only screens (Tasks 9,
11, 12, 13, 15, 16), all new screens/features (name+avatar step Task 10,
host menu + 2 new RPCs Task 14, paste-import + AI-prompt Task 16, splash
Task 17), pick-teams mode + noises toggle (Task 12). Desktop-specific
layouts are explicitly deferred per spec §5's ruling, not a gap.

**Placeholder scan:** every task has concrete steps, exact test code, and
explicit judgment calls flagged as "your call, note which" rather than
left vague — these are genuine design-flexibility points (e.g. exact
Btn `kind` choice for a given action), not missing information.

**Cross-task consistency:** `DialFan`'s external prop contract (Task 4) is
explicitly required to match what `GameScreen.tsx` already calls (Task 13
doesn't need to change the `<DialFan>` call). `TeamScoreboard`'s contract
(Task 6) likewise stays compatible with Task 13's usage. `GameHeader`
(Task 7) is consumed by both Task 12 (Lobby) and Task 13 (GameScreen).
