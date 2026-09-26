-- `teams` never had a created_at column, but the client's loadTeams() does
-- `.order('created_at')` on it — that query has been erroring server-side
-- ("column teams.created_at does not exist") on every single call, and the
-- client never checked the error, so it silently fell back to an empty
-- array every time. This is the real cause of "shuffle teams looks like it
-- does nothing": shuffle_teams correctly created the teams and assigned
-- players to them, but the lobby's own team list could never see them.
alter table public.teams add column created_at timestamptz not null default now();
