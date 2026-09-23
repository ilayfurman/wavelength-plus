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
