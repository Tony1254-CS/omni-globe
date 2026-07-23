# Why nothing works on Vercel

Your app runs on **Lovable Cloud**, which auto-injects backend credentials (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, plus the `VITE_*` versions) into the runtime. Vercel doesn't know about Lovable Cloud, so those variables are empty — every server function (widgets, globe data, AI, auth session checks) crashes with the "Missing Supabase environment variable(s)" error you see in the toast.

Nothing is actually broken in the code. It's a missing-config problem on Vercel.

## Two paths forward

### Option A — Just publish through Lovable (recommended, zero config)
You already have a working published URL: `https://omni-globe.lovable.app`. Publishing from Lovable wires every secret automatically, including the AI gateway. No Vercel setup, no key copying. This is what the project was built for.

### Option B — Keep Vercel, add the env vars manually
In Vercel → Project → Settings → Environment Variables, add these for **Production, Preview, and Development**:

Client-visible (needed at build time):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only (needed by server functions):
- `SUPABASE_URL` (same value as `VITE_SUPABASE_URL`)
- `SUPABASE_PUBLISHABLE_KEY` (same value as `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` (for Gemini briefings / Oracle / Pulse)
- Any HMAC/webhook secrets you've added (IoT ingest, refresh-widgets hook, etc.)

Then redeploy. Two Lovable-Cloud caveats:
1. **`SUPABASE_SERVICE_ROLE_KEY` is not exposed to you on Lovable Cloud** — you cannot copy it out. That means several features (server-side `provider_cache` writes, IoT ingest, admin ops, cron refresh) will not work on Vercel until you either move to a self-managed Supabase project or accept those features being broken. This is a hard limit, not something I can code around.
2. **`LOVABLE_API_KEY`** is Lovable-managed. Outside Lovable hosting, AI features (Oracle, Pulse briefings, Foresight narration) will fail unless you swap them to a direct provider key (e.g. your own Gemini/OpenAI key).

## My recommendation

Publish through Lovable. Everything you built — widgets, globe, AI, IoT, cache warmer, share links — depends on Lovable Cloud bindings that Vercel physically cannot receive. Vercel would only host a degraded version of the app.

## What I'd like to confirm before doing anything

Tell me which path you want:
- **A**: I'll do nothing to the code; just click "Publish" in Lovable and use `omni-globe.lovable.app` (or attach your custom domain).
- **B**: You want to stay on Vercel knowing the service-role + AI features will be broken — I'll add a Vercel deploy guide (`DEPLOY_VERCEL.md`) and a `vercel.json` if needed.
