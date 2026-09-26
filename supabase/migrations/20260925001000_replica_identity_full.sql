-- Postgres's default replica identity only includes the primary key in the
-- "old row" payload for UPDATE/DELETE WAL events. Our realtime subscriptions
-- filter players/teams changes by party_id (not the primary key), so
-- Supabase Realtime can't evaluate that filter for DELETE events — the
-- party_id simply isn't there to match against, so the event is silently
-- dropped. This is exactly why a player joining (INSERT, always carries the
-- full new row) showed up live, but a player leaving (DELETE) never did.
-- REPLICA IDENTITY FULL includes every column in old-row payloads, fixing
-- filtered delete/update delivery for both tables.
alter table public.players replica identity full;
alter table public.teams replica identity full;
