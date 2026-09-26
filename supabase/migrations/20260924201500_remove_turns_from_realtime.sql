-- turns has no SELECT RLS policy on the base table by design (that's what
-- makes turns_view's redaction of target_position from non-psychic players
-- actually secure). Realtime authorizes postgres_changes against the base
-- table's RLS, so a subscription on turns can never deliver an event
-- regardless of publication membership — and if it somehow did, the payload
-- would leak target_position to every subscriber. The client (useTurn.ts)
-- now polls turns_view instead. Removing turns from the publication so it
-- doesn't look like a working path to a future reader.
alter publication supabase_realtime drop table public.turns;
