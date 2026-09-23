# Supabase Setup

> **Integration tests:** run `supabase start` and copy the "anon key" and "DB URL"
> it prints into a local `SUPABASE_LOCAL_ANON_KEY` and `SUPABASE_LOCAL_DB_URL`
> env var (e.g. in a gitignored `.env.test.local`) before running
> `npm run test:integration`.

This project is linked to the remote Supabase project `iggpblavznrcbnwaygnv`.

## One-time machine setup

1. Install Docker Desktop (required for local dev — `supabase start` runs a
   local copy of the whole backend in containers).
2. Log in to the Supabase CLI. The normal `supabase login` opens a browser
   for interactive approval; in a non-interactive shell (no TTY) that flow
   fails with `LegacyLoginMissingTokenError`. Workaround: generate a
   personal access token at
   https://supabase.com/dashboard/account/tokens, then either:
   ```
   npx supabase login --token <sbp_...>
   ```
   or, if a later command still reports "Access token not provided" (the
   CLI's local session cache doesn't always carry over in a non-TTY shell),
   pass it explicitly per command:
   ```
   SUPABASE_ACCESS_TOKEN=<sbp_...> npx supabase <command>
   ```
3. Link this repo to the remote project (only needed once per machine):
   ```
   npx supabase link --project-ref iggpblavznrcbnwaygnv --password '<db password>'
   ```

This project uses `npx supabase` rather than a global CLI install — no
Homebrew/global install required, works on any machine with Node.

## Local dev workflow

Local dev: `supabase start` (requires Docker running), `supabase stop` when
done. First run downloads several GB of Docker images; subsequent runs are
fast.

Migrations live in `supabase/migrations/*.sql`. To apply a new migration:

1. `supabase migration new <name>` to scaffold the file.
2. Write SQL in the generated file.
3. `supabase db reset` to test it against the local stack from scratch.
4. `supabase db push` to apply it to the linked remote project.

Integration tests (`tests/integration/`) run against the **local** stack
only — never against production. Start it first: `supabase start`, then
`npm run test:integration`.

`supabase status` prints the local stack's URLs and keys (API URL, DB URL,
anon/publishable key, etc.) any time you need them again — e.g. to fill in
`SUPABASE_LOCAL_ANON_KEY` / `SUPABASE_LOCAL_DB_URL` in a local
`.env.test.local` for the integration test suite.
