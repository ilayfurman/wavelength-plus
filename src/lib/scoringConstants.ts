// Must stay in sync with compute_score() in
// supabase/migrations/20260924211500_fix_wedge_width_ratios.sql
//
// Matches the physical game's proportions (measured from a photo of the real
// board): unlike "3" and "2" (each drawn as two separate mirrored wedges,
// one per side), "4" is a single wedge straddling the center — so for all
// five wedges to look equally wide, "4"'s half-width must be half the common
// width W, not W itself: center = W/2, inner = 1.5W, outer = 2.5W. The outer
// boundary is also tightened to ~0.10 (previously 0.15) to match the photo.
const W = 0.04
export const WEDGE_THRESHOLDS = {
  center: W / 2, // |target - guess| <= this -> 4 pts
  inner: W * 1.5, // <= this -> 3 pts
  outer: W * 2.5, // <= this -> 2 pts
} as const

/** Mirrors compute_score() exactly — lets the client know a turn's points
 * immediately from target/guess alone, instead of diffing a team's score
 * before vs. after. Diffing is unreliable here: `teams` updates via fast
 * realtime the moment the server commits, while `turn.status` only reaches
 * 'revealed' on useTurn's next 600ms poll, so a "before" snapshot taken from
 * props can already include the new score by the time it's read. */
export function computeScore(target: number, guess: number): number {
  const d = Math.abs(target - guess)
  if (d <= WEDGE_THRESHOLDS.center) return 4
  if (d <= WEDGE_THRESHOLDS.inner) return 3
  if (d <= WEDGE_THRESHOLDS.outer) return 2
  return 0
}
