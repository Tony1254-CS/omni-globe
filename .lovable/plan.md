# Full Vercel Setup Plan

You provide the keys, I wire everything up. Here's exactly what happens.

## What I need from you (in this order)

1. **Google Gemini API key** — from https://aistudio.google.com/apikey (starts with `AIza...`)
2. **A new Supabase project** — create at https://supabase.com/dashboard → New Project. Then from **Project Settings → API**, send me:
   - Project URL (`https://xxxxx.supabase.co`)
   - `anon` / publishable key
   - `service_role` key (secret — treat carefully)

## What I'll do (once you send the keys)

### Step 1 — Prepare your Supabase project
- Give you the exact SQL to paste into your Supabase SQL Editor (it's already bundled at `supabase/all_migrations.sql`). One paste, one Run.
- Confirm auth settings: email confirmation OFF, email/password enabled.
- (Optional) Add your Vercel URL to Site URL / Redirect URLs later.

### Step 2 — Wire the keys into Vercel
Guide you through Vercel's Environment Variables screen with these 7 values:

```text
DEPLOY_TARGET                   = vercel
VITE_SUPABASE_URL               = <your project URL>
VITE_SUPABASE_PUBLISHABLE_KEY   = <anon key>
SUPABASE_URL                    = <your project URL>
SUPABASE_PUBLISHABLE_KEY        = <anon key>
SUPABASE_SERVICE_ROLE_KEY       = <service_role key>
GEMINI_API_KEY                  = <your Gemini key>
```

### Step 3 — Push to GitHub & import to Vercel
- You push the repo (or connect via Vercel's GitHub integration).
- Framework preset: Other. Build command and output stay default.
- Click Deploy.

### Step 4 — Post-deploy verification
Together we'll test:
- Sign up → instant login (no email verification).
- Add a location in Settings.
- Dashboard widgets populate.
- Oracle answers a question (proves Gemini works).
- Pulse generates a briefing.

### Step 5 — Set up the widget cache warmer (optional but recommended)
Add a `vercel.json` cron hitting `/api/public/hooks/refresh-widgets` every 5 minutes so widgets stay fresh without user traffic.

## What's already done in the code (from the previous turn)

- All 6 AI callsites now route through `src/lib/ai-chat.server.ts` — auto-uses `GEMINI_API_KEY` when present.
- `vite.config.ts` switches to Vercel's Nitro preset when `DEPLOY_TARGET=vercel`.
- Migrations bundled at `supabase/all_migrations.sql`.
- Full walkthrough written to `DEPLOY_VERCEL.md`.

## What I need you to do first

Reply with:
1. Your Gemini API key
2. Your Supabase Project URL
3. Your Supabase anon key
4. Your Supabase service_role key

⚠️ **Security note**: pasting the service_role key in chat means it's in your chat history. After deploy works, rotate it in Supabase (Settings → API → Reset service_role key) and update the Vercel env var. Alternative: you paste it directly into Vercel yourself and just tell me "done" — I don't actually need to see it.

Once you send them (or confirm you've set them in Vercel yourself), I'll drive the rest.
