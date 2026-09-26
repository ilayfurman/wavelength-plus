-- The client subscribes to postgres_changes on parties/teams/players/turns
-- (App.tsx, Lobby.tsx, useTurn.ts) so the lobby and game screens update live
-- without a manual refresh. None of these tables were ever added to the
-- supabase_realtime publication, so every one of those subscriptions has
-- been silently inert since the app was built — every "live" update players
-- saw was actually just a page reload re-fetching over plain REST.
alter publication supabase_realtime add table public.parties;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.turns;
