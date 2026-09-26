-- Matches the physical game's proportions (measured from a photo of the
-- real board): the 4/3/2 wedges are equal angular width, and the outer "2"
-- boundary is tighter than our previous 0.15 — the real board's scoring
-- wedge is noticeably narrower than that. Must stay in sync with
-- WEDGE_THRESHOLDS in src/lib/scoringConstants.ts.
create or replace function public.compute_score(target numeric, guess numeric)
returns int
language plpgsql
immutable
as $$
declare
  d numeric := abs(target - guess);
begin
  if d <= 1.0/30 then return 4;
  elsif d <= 2.0/30 then return 3;
  elsif d <= 3.0/30 then return 2;
  else return 0;
  end if;
end;
$$;

grant execute on function public.compute_score(numeric, numeric) to authenticated;
