# Wavelength Plus — Design Spec

Date: 2026-09-22
Status: Approved for planning

## 1. Summary

A website version of the party game Wavelength, played in person with each
player on their own phone. Unlike the reference app, it supports proper
teams (2v2, 3v3, 4v4, ...), team-vs-team side betting, user-created custom
spectrum packs, and a soundboard of noises anyone can trigger.

## 2. Goals / Non-Goals

**Goals**
- Real teams (not "whole party is one team"), with the official
  left/right side-bet mechanic for non-active teams.
- Custom, savable, shareable spectrum packs, alongside a built-in starter
  deck.
- A soundboard that plays on every phone.
- Playable same-room (own phones) and remote (clue can be typed).
- $0 to run for a friend group; free-tier hosting throughout.

**Non-goals (for v1)**
- Native mobile apps.
- Payments / paid tiers (schema should not preclude this later).
- Spectators, timers, the official "catch-up" rule.
- Photo-upload avatars (use a preset icon set).

## 3. Game Rules

- **Teams:** host sets team size (default 2, can be 3/4/+). Players are
  randomly shuffled into teams of that size (remainder distributed as
  evenly as possible), with a "Reshuffle" button and a "Pick teams"
  toggle for manual assignment. Minimum 2 teams / 4 players. 2 players is
  a special co-op mode (no opposing teams, one shared score across
  alternating psychics). 3 players is one team of 3, co-op as well.
- **Turn structure:** teams rotate turns; inside a team, the psychic role
  rotates. Host sets "rounds" = how many times each player gets to be
  psychic. One round = every team takes a number of turns equal to that
  team's player count (so uneven team sizes still each get a fair number
  of turns per round).
- **A turn:**
  1. **Clue:** psychic's device shows the spectrum + target (hidden
     needle position). Psychic taps "Said it out loud" or types a clue,
     which appears on every device.
  2. **Guess:** psychic's teammates drag the shared dial (synced live to
     all teammates' screens); any teammate taps "Lock In" once agreed.
  3. **Bet:** every other team taps "Left" or "Right" on their own
     screen, betting which side of the locked guess the true target is
     on. Updates live within the team; locks in per-team.
  4. **Reveal:** once all teams have bet (or host forces reveal), the
     target is revealed to everyone. Guessing team scores 4/3/2/0 based
     on distance from center. Each team that bet the correct side scores
     1.
- **Scoring zones:** center wedge = 4, next wedges = 3, next = 2, outside
  = 0 (matches official game).
- **End of game:** after the set number of rounds, a final scoreboard
  shows team totals, with "Play again" (same teams) and "New teams"
  options.

## 4. Identity & Accounts

- Every player signs in (Google OAuth or a 6-digit email code) before
  they can create or join a party. This is for usage tracking, pack
  ownership, and potential future paid features — not for social
  features.
- Display name and avatar (chosen from a preset icon set) are set **per
  party**, pre-filled from last time, so people can use joke names for a
  given game night.
- Sessions are long-lived; players rarely need to sign in twice.

## 5. Lobby & Party Flow

- Home screen: **Create party**, **Join party** (room code or shared
  link), **My packs**.
- Creating a party generates a 4-letter room code and a shareable link
  (uses the OS share sheet). No QR code.
- Lobby shows joined players, host controls:
  - **Team size** (2 default, adjustable)
  - **Rounds** (3 default, adjustable)
  - **Spectrum packs** in play (starter deck + any of the host's saved
    packs, plus packs added by code)
  - **Team assignment mode**: Random (default, with Reshuffle) or Pick
    teams (players tap to join a team)
  - Noises on/off toggle

## 6. Custom Packs

- A pack is a named collection of spectrum cards (two opposing concepts,
  e.g. "Great beer ↔ Awful beer").
- Packs belong to the signed-in account that created them.
- Each pack has a short share code; anyone can add someone else's pack
  to their own collection by entering the code.
- A built-in starter deck (~100 cards) ships with the app and is always
  available.
- Pack management ("My packs": create, edit, delete, add-by-code) is a
  simple CRUD screen, separate from the party flow.

## 7. Noises

- A soundboard of 6–8 short sounds, visible throughout the game.
- Tapping a sound plays it on **every** connected device immediately, no
  cooldown.
- Host can mute an individual player's noises for 30 seconds (tap their
  avatar → "Mute noises for 30s").

## 8. Visual Style

- Dark navy gradient background with a subtle starfield texture and a
  soft glow behind the dial.
- Colorful gradient wordmark, round "progress dot" indicator for
  rounds, live team scoreboards (name, score, avatars) visible on the
  game screen at all times.
- The dial is a semicircular "fan" (not a linear slider): a cream fan
  face, scoring wedges in orange/red/teal shading outward from center,
  a glossy 3D red knob/needle with a highlight, matching the reference
  image provided by the user.
- Large pill-shaped CTA buttons (e.g. "Lock In Guess").
- Full mobile-first responsive layout; this is played on phones.

## 9. Architecture

**Frontend:** React (Vite), deployed to Vercel's free tier. Single
responsive site; no native app.

**Backend:** Supabase (free tier) provides:
1. **Auth** — Google OAuth + email OTP.
2. **Postgres database** — accounts, packs, spectrums, parties, players,
   teams, turns, bets, scores.
3. **Database functions (RPC) as the referee** — all game-state
   mutations (start game, submit clue, lock guess, place bet, reveal)
   go through Postgres functions that validate the action is legal
   given current state. Clients never write scores or turn state
   directly.
4. **Row Level Security** — the active target for a turn is only
   readable by the current psychic's player row until reveal; enforced
   by RLS policies, not just client-side hiding.
5. **Realtime** — Postgres Changes subscriptions push turn/score state
   to all clients. A separate lightweight Realtime Broadcast channel
   carries momentary, non-persisted events (live dial dragging, noise
   taps) for instant feedback without hitting the database.

**Recovery:** all durable game state lives in Postgres, so a
refreshed/reconnected client just re-subscribes and re-renders current
state. If the current psychic disconnects, the host can force-skip
their turn.

## 10. Data Model (high level)

- `accounts` (id, display_name_default, avatar_default, created_at)
- `packs` (id, owner_id, name, share_code)
- `spectrums` (id, pack_id, left_label, right_label)
- `parties` (id, room_code, host_id, status, team_size, rounds, settings)
- `players` (id, party_id, account_id, display_name, avatar, team_id)
- `teams` (id, party_id, name, score)
- `turns` (id, party_id, team_id, psychic_player_id, spectrum_id,
  target_position [hidden until reveal], clue_text, guess_position,
  status)
- `bets` (id, turn_id, team_id, direction, correct)

Exact schema/RLS policies are finalized during implementation.

## 11. Cost

$0 to run for a friend group on Vercel + Supabase free tiers. Optional
custom domain (~$10-15/yr). No SMS-based auth (avoids per-message
cost).

## 12. Open Items / Deferred

- Payment/paid-tier gating (schema should allow, not implement).
- Spectator mode, timers, catch-up rule.
- Native app packaging.
