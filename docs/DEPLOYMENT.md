# Deployment

Hosted on Vercel (free tier), auto-deploys on push to `main`.
Backend: Supabase project `iggpblavznrcbnwaygnv` (free tier).

To apply a new DB migration to production: `npx supabase db push` (after
`npx supabase link --project-ref iggpblavznrcbnwaygnv` once per machine —
see `docs/SUPABASE_SETUP.md` for the non-interactive login workaround).

Env vars (set in Vercel dashboard, not committed):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
