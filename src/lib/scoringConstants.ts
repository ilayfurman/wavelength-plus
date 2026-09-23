// Must stay in sync with compute_score() in
// supabase/migrations/20260923032910_compute_score.sql
export const WEDGE_THRESHOLDS = {
  center: 0.05, // |target - guess| <= this -> 4 pts
  inner: 0.10, // <= this -> 3 pts
  outer: 0.15, // <= this -> 2 pts
} as const
