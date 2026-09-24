# On the Retsef: design handoff

**Name:** On the Retsef (retsef, RET-sef: Hebrew for "continuum")
**Store title / subtitle:** On the Retsef: The Guess-the-Dial Party Game
**Secondary tagline:** How close can you get?
**Screens:** `On the Retsef.dc.html`. Phone P01–P21 (390×844) and desktop D01–D21 (1280×800); the same number means the same screen.
**Repo:** ilayfurman/wavelength-plus (React + Vite + Supabase). Rename the user-facing strings; internal code names can stay.

Don't use "Wavelength" anywhere user-facing: not in the app title, store keywords, copy, or starter cards.

---

## 1. Tokens

### Color
| Token | Value | Use |
|---|---|---|
| bg | `#09081A` | page base |
| bg-glow | `radial-gradient(120% 55% at 50% 58%, #2C2266 0%, #16123A 46%, #09081A 100%)` | behind everything (Starfield) |
| surface | `linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6))` | cards |
| surface-border | `rgba(200,180,255,.12)` | card borders |
| sheet | `linear-gradient(180deg, #221B4F, #130F30)` | bottom sheets / modals |
| input-bg | `rgba(8,6,24,.6)` + border `rgba(200,180,255,.18)` | inputs, code boxes |
| text | `#F4F2FB` | primary text |
| text-muted | `#A9A3C9` | secondary text, caps labels |
| text-subtle | `#8A84AA` / `#6F6893` | hints, placeholders |
| lavender | `#CFC0FF` | "on the" in logo, accent button text |
| gold | `#FFD166` | round dots, focus ring, psychic ring, codes, band "4" |
| gold CTA | `linear-gradient(180deg,#FFE08A 0%,#FFC94D 55%,#F2A93B 100%)`, text `#1A1233` | primary buttons, toggles on |
| comets | `#FF6FA3` (soft `#FF8FB8`, `#FFC2D8`) | team 1 |
| novas | `#5BD6FF` (soft `#8FE3FF`, `#BDEBFF`) | team 2 |
| violet | `#8C6BFF` / `#A98BFF` | band "2", accent button |
| cream | `#F3ECDD` | selected segment in segmented controls |
| wordmark gradient | `linear-gradient(90deg,#FFD166,#FF8FB1 55%,#A98BFF)` | "retsef" |

Dial scoring bands: **4 = gold `#FFD166`** (center), **3 = pink `#FF6FA3`**, **2 = violet `#8C6BFF`**. The dial ring is `#2E2266 → #15103A`.

### Type
- **Fredoka 600/700**: logo, clue word, big scores, headlines like "Game night?" and "The Comets called it!"
- **Rubik 400–800**: all UI text
- Monospace (`ui-monospace, Menlo`): room codes in links, pack share codes, the paste textarea, the AI prompt
- Caps labels: Rubik 600, 11px, letter-spacing .16em, text-muted

### Shape and spacing
- Buttons and inputs are **fully pill-shaped** (`border-radius: 999px`). Heights: lg 62, md 54, sm 44. Nothing tappable is smaller than 40px.
- Card radius: 18 (clue card), 22 (phone cards), 26–28 (desktop cards, sheets)
- Phone padding: 58px top (status bar), 16px sides, 30px bottom. Stack gap: 12px.
- Desktop padding: 28–40px, grid gaps 20–32px

---

## 2. Components (one `.dc.html` file each; props listed)

| Component | Props | Notes |
|---|---|---|
| **Starfield** | `chrome?: boolean` | Background glow and two star layers. `chrome` draws the phone status bar and home indicator (mockup only; don't ship it). |
| **Dial** | `value 0–1`, `target 0–1`, `showBands`, `interactive`, `labels`, `left`, `right`, `onChange(v)` | SVG, viewBox 360×250, pivot at (180,178). The ring runs from r=98 to r=150. `angle = π·(1−v)`. Band edges at `target ± .05 / .10 / .15`, which must match `scoringConstants.ts`. Drag uses pointer capture; round to 0.01. Needle: tapered gold polygon plus a pearl half-moon pivot. |
| **Logo** | `variant: inline \| stacked \| icon`, `size: sm \| md \| lg \| xl`, `align` | "on the" (lavender, Fredoka 600) plus "retsef" (gradient, Fredoka 700). The icon is a rounded indigo square with a mini Dial at value = target = 0.62. |
| **Btn** | `label`, `kind: primary \| secondary \| accent \| ghost`, `size: lg \| md \| sm`, `disabled`, `onClick` | Primary is gold; secondary is glass; accent is violet-tinted; ghost is text only. Press state: `scale(.97)`. |
| **ClueCard** | `label`, `clue`, `tone: default \| gold \| nova \| live`, `editable`, `size: md \| lg` | `editable` turns the clue into an input (psychic). `live` shows a pulsing LIVE badge. |
| **Scoreboard** (phone) | `comets`, `novas`, `active: comets \| novas \| none`, `psychic` | Two cards side by side. The inactive team drops to 0.7 opacity. The psychic gets a gold ring. |
| **TeamPanel** (desktop) | `team`, `score`, `status`, `active`, `psychic` | Side columns in the desktop game. |
| **GameHeader** | `round`, `total`, `room?`, `onMenu` | Logo, "Round n/N", dots and ☰. Passing `room` gives the desktop version with a "Join at retsef.app · KRTZ" chip. |
| **Soundboard** | `muted?` | 8 sounds, a horizontal scroll row of 46px circles. When muted: overlay reading "Host muted you · 0:21". |
| **GamePhone / GameDesktop** | `state` | One component covers every game state; see §4. It maps directly to `GameScreen.tsx` (turn.status × role). |

Sounds, in order: airhorn, drumroll, applause, sad-trombone, boo, crickets, gasp, tada (`public/sounds/*.mp3`).
Avatars: the 12 emoji from `AvatarPicker.tsx`, each on a colored circle.

---

## 3. Responsive rules
- **< 760px:** phone layouts (P screens).
- **760–1024px:** phone layout centered in a 440px column on the starfield. Header items can spread to the edges.
- **≥ 1024px:** desktop layouts (D screens). The desktop game view doubles as a TV / shared-screen board.
- Keep primary actions in the bottom third on phones, for one-handed play.

---

## 4. Screen list

| # | Screen | Repo source | Notes |
|---|---|---|---|
| 01 | Splash | new | Show while the auth session loads (replaces "Loading…"). |
| 02 | Sign in | `auth/SignIn.tsx` | Email OTP plus a Google button (spec §4). |
| 03 | Code entry | `auth/SignIn.tsx` | 6 boxes that auto-advance, resend countdown. |
| 04 | Name + avatar | `App.tsx` Gate + `party/AvatarPicker.tsx` | Per party, pre-filled from `accounts` defaults. Shown before joining. |
| 05 | Home | `home/Home.tsx` | Create party · 4-letter code join · My packs. |
| 06 | Lobby, host, random | `party/Lobby.tsx` | Room code, share (OS share sheet), steppers, packs, noises toggle, shuffle, start. |
| 07 | Lobby, host, pick | `party/Lobby.tsx` | Team mode = pick. Start is disabled until everyone has a team. |
| 08 | Lobby, player | `party/Lobby.tsx` | isHost = false; shows "You're on …" and the settings as chips. |
| 09 | Game · clue (psychic) | `GameScreen` status=`clue`, isPsychic | Bands visible; type a clue or tap "Said it out loud". |
| 10 | Game · waiting for clue | status=`clue`, !isPsychic | |
| 11 | Game · guessing | status=`guessing`, isActiveTeam | Dial is interactive and broadcast live (`useDialBroadcast`). "Lock it in" calls `lock_guess`. |
| 12 | Game · watching | status=`guessing`, !isActiveTeam | Read-only dial, LIVE badge. |
| 13 | Game · betting | status=`betting`, !isActiveTeam | Left/Right picks show which teammates chose each side; "Lock bet" calls `place_bet`. |
| 14 | Game · betting wait | status=`betting`, isActiveTeam | Shows how many have bet ("2 of 3"). |
| 15 | Game · reveal | status=`revealed` | Bands centered on the target; +points pills; host sees "Next turn" (`advance_turn`). |
| 16 | Host menu | ☰ in GameHeader, host only | Noises toggle, mute a player for 30s (`mute_player`), force-skip the psychic, end game. |
| 17 | Final scoreboard | `game/FinalScoreboard.tsx` | Sorted by score. Play again (same teams), New teams (shuffle then start), Back to home. |
| 18 | My packs | `packs/PacksList.tsx` | Starter deck (built in), own packs with share codes, add a pack by code, new pack. |
| 19 | Pack editor · single | `packs/PackEditor.tsx` | Left ⟷ Right inputs, list with delete. |
| 20 | Pack editor · paste | new (in PackEditor) | See §5. |
| 21 | AI prompt | new | Topic input, then a generated prompt with a Copy button. |

---

## 5. Paste-a-list format (P20 / D20)
- One card per line: `Left | Right`
- Also accepted as separators: `↔`, `<->`, a tab, or ` vs ` / ` vs. ` (case-insensitive)
- Leading `1.` / `1)` / `-` / `*` / `•` is stripped
- A line that doesn't split into exactly 2 non-empty parts is shown as **"Needs Left | Right"** and not imported
- A duplicate (case-insensitive, compared with the pack and earlier lines) is shown as **"Already in pack"** and skipped
- The CTA reads "Add N spectrums" and is disabled when N = 0
- Reference regex: `line.split(/\s*(?:\||↔|<->|\t|\s+vs\.?\s+)\s*/i)`

AI prompt template:
> Give me 25 cards for a party game where each card is two opposite ends of a scale, about "{topic}". Reply with one card per line, formatted exactly as: Left | Right. No numbering, no extra text.

---

## 6. Motion (suggested)
- Dial needle: follow the pointer 1:1 while dragging. Remote viewers ease toward the broadcast value over about 120ms.
- Reveal: bands sweep in from the center (about 400ms), then the point pills pop in (scale .8 → 1).
- Soundboard tap: the button glows gold for 450ms.
- Buttons: `scale(.97)` on press.
