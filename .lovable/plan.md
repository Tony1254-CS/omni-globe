# Vercel setup with your keys

You sent 4 values. Two things to flag before I touch anything:

1. **Security — rotate these keys after we're live.** They're now in chat history. Once the deploy works: in Supabase → Settings → API → roll the `sb_secret_` key, and in AI Studio → regenerate the Gemini key. Then update the two values in Vercel.
2. **New-format Supabase secret key.** You sent `sb_secret_...`, which is Supabase's new API key format (replaces the legacy JWT `service_role`). Our server client (`src/integrations/supabase/client.server.ts`) already handles this format — it strips the bearer header and sends it as `apikey`. So no code change needed; it will work as `SUPABASE_SERVICE_ROLE_KEY`.

## What I'll do (build mode)

### 1. Prep your Supabase project (you run 1 SQL paste)
- I'll confirm `supabase/all_migrations.sql` is complete and idempotent.
- **You**: open your new project → SQL Editor → paste that file → Run.
- **You**: Auth → Providers → Email → turn **Confirm email OFF**.

### 2. Push repo to GitHub
- **You**: create a GitHub repo and push this project (I can't do git for you).

### 3. Import into Vercel with these 7 env vars

```text
DEPLOY_TARGET                 = vercel
VITE_SUPABASE_URL             = https://yqazoorimudxfmzwiufx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_0_92xDwHSrO9afyhGgsZdw_LB-Ui8FU
SUPABASE_URL                  = https://yqazoorimudxfmzwiufx.supabase.co
SUPABASE_PUBLISHABLE_KEY      = sb_publishable_0_92xDwHSrO9afyhGgsZdw_LB-Ui8FU
SUPABASE_SERVICE_ROLE_KEY     = sb_secret_PaO5qPsqzSeOQqbGQm5yJg_oeYXy7wx
GEMINI_API_KEY                = AQ.Ab8RN6KLvr8hqTay-LCNaRsIshIeNlUrd-49Jtebmqvkwig8gQ
```

- Framework preset: **Other**. Build/output: defaults.
- `vercel.json` already sets a 5-min cron on `/api/public/hooks/refresh-widgets` — the warmer needs `SUPABASE_PUBLISHABLE_KEY` as the `apikey` header. Vercel Cron doesn't send custom headers by default, so I'll update the cron endpoint to also accept an optional `CRON_SECRET` bearer OR make the header optional for `vercel.com` cron requests (see technical note below).

### 4. Verify the deploy together
- Sign up (should log in immediately, no email verification).
- Add a location in Settings.
- Dashboard widgets populate within ~30s.
- Oracle answers a question (proves your Gemini key works).
- Pulse generates a briefing.

If anything fails, I'll read the Vercel build/function logs you paste and fix it.

## Technical notes

- `src/lib/ai-chat.server.ts` auto-detects `GEMINI_API_KEY` and routes to Google's OpenAI-compat endpoint. No code change.
- `vite.config.ts` already switches Nitro to `vercel` preset when `DEPLOY_TARGET=vercel`. No code change.
- The Supabase `sb_secret_` key is opaque, not a JWT. `client.server.ts` already sends it via `apikey` header (not `Authorization: Bearer`), so PostgREST won't reject it with "Expected 3 parts in JWT".
- **Cron auth**: current `refresh-widgets` handler requires `apikey: <publishable key>`. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` if configured, otherwise no auth headers. I'll widen the check to accept either the publishable key OR a Vercel cron signature so the warmer actually runs.
- I will NOT edit `src/integrations/supabase/client.ts` or `client.server.ts` (auto-generated).
- I will NOT commit any of these keys into the repo — they only live in Vercel's env var UI.

## What I need from you to proceed

1. Confirm: "go ahead" → I'll harden the cron endpoint and re-verify the migration bundle.
2. Then you: run the SQL, push to GitHub, paste the 7 env vars into Vercel, click Deploy.
3. Then you: paste the deployed URL (and any errors) and I'll verify end-to-end.
