# Deploying OMNISPHERE to Vercel (BYO keys)

You control the whole stack: your own Supabase project + your own Google Gemini API key.

---

## 1. Create your Supabase project

1. Go to https://supabase.com/dashboard → **New Project**.
2. Wait for it to provision, then open **Project Settings → API** and copy:
   - `Project URL`
   - `anon` (publishable) key
   - `service_role` (secret) key
3. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/all_migrations.sql` from this repo, and click **Run**.
   That creates every table, RLS policy, and function OMNISPHERE needs.
4. **Auth → Providers → Email**: turn **Confirm email** OFF (for trial demos).
5. (Optional) **Auth → URL Configuration**: add your Vercel production URL
   to `Site URL` and `Redirect URLs`.

## 2. Get a Google Gemini API key

1. Go to https://aistudio.google.com/apikey
2. **Create API key** → copy the value (starts with `AIza...`).
3. Free tier is enough for demos.

## 3. Push this repo to GitHub

Standard `git init && git remote add origin ... && git push`.

## 4. Import into Vercel

1. https://vercel.com/new → import the repo.
2. Framework preset: **Other** (Vercel will auto-detect Vite/Nitro).
3. Build command: `npm run build` (default).
4. Output directory: leave blank.
5. **Environment Variables** — add ALL of these:

   | Name | Value | Notes |
   |------|-------|-------|
   | `DEPLOY_TARGET` | `vercel` | Switches Nitro to Vercel preset |
   | `VITE_SUPABASE_URL` | your Project URL | Browser-visible |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon key | Browser-visible |
   | `SUPABASE_URL` | your Project URL | Server-side |
   | `SUPABASE_PUBLISHABLE_KEY` | your anon key | Server-side |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key | **Server-only, keep secret** |
   | `GEMINI_API_KEY` | your Google Gemini key | Powers Oracle, Pulse, Foresight, Agents |

6. **Deploy**.

## 5. Test it

- Sign up with any email → should log in immediately (no verification).
- Add a location in Settings.
- Open Dashboard → widgets should populate within ~30s.
- Try Oracle → asks Gemini directly with your key.
- Try Pulse → generates cinematic briefing.

## What changed to make this work

- `vite.config.ts` now switches to Vercel's Nitro preset when `DEPLOY_TARGET=vercel`.
- All AI calls (`briefing.server.ts`, `pulse.server.ts`, `oracle.functions.ts`,
  `foresight.server.ts`, `timemachine.server.ts`, `agents.server.ts`) go through
  `src/lib/ai-chat.server.ts`, which prefers `GEMINI_API_KEY` when set and
  falls back to `LOVABLE_API_KEY` otherwise.
- Model IDs are auto-mapped: `google/gemini-3.6-flash` → `gemini-2.0-flash`
  on the direct Gemini API.

## Troubleshooting

**"Missing Supabase environment variable(s)"** → you skipped one of the Vercel env vars. Add them, then in Vercel dashboard: **Deployments → ⋯ → Redeploy**.

**AI features fail with 401** → your `GEMINI_API_KEY` is wrong or restricted. Regenerate in AI Studio.

**Widgets say "warming up" forever** → the cache warmer cron isn't running. Either:
- Hit `https://your-app.vercel.app/api/public/hooks/refresh-widgets` manually, OR
- Add a Vercel Cron in `vercel.json` (5-min interval) hitting that same URL.

**Reset Supabase** → re-run `supabase/all_migrations.sql`. All statements are idempotent-friendly enough for a fresh project.
