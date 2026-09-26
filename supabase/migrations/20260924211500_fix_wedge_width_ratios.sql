-- Corrects 20260924210000: "4" is a single wedge straddling the center
-- (unlike "3"/"2", which are each two separate mirrored wedges), so for all
-- five wedges to be equally wide, "4"'s half-width must be half the common
-- width W, not W itself. center=W/2, inner=1.5W, outer=2.5W, W=0.04. Must
-- stay in sync with WEDGE_THRESHOLDS in src/lib/scoringConstants.ts.
create or replace function public.compute_score(target numeric, guess numeric)
returns int
language plpgsql
immutable
as $$
declare
  d numeric := abs(target - guess);
begin
  if d <= 0.02 then return 4;
  elsif d <= 0.06 then return 3;
  elsif d <= 0.10 then return 2;
  else return 0;
  end if;
end;
$$;

grant execute on function public.compute_score(numeric, numeric) to authenticated;
