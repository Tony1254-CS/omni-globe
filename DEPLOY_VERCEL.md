# Deploying OMNISPHERE to Vercel

> **TL;DR** — This app was built for **Lovable Cloud**, which auto-injects
> every secret. Vercel does not have those bindings. You *can* deploy the
> frontend + server functions to Vercel, but a few features will not work
> until you migrate the backend (see "What breaks on Vercel" below).
>
> **Recommended path is still**: click **Publish** in Lovable →
> `https://omni-globe.lovable.app`. Everything works with zero config.

---

## 1. Change the build target to Vercel

The project currently builds for **Cloudflare Workers** (default in
`@lovable.dev/vite-tanstack-config` → nitro preset). Vercel needs a different
preset.

Edit `vite.config.ts`:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Tell nitro to build for Vercel instead of Cloudflare
  nitro: {
    preset: "vercel",
  },
});
```

No `vercel.json` is needed — the nitro Vercel preset outputs the correct
`.vercel/output/` structure automatically.

## 2. Set environment variables in Vercel

**Project → Settings → Environment Variables** (Production + Preview + Development).

### Required — client (build time)
| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` below |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_QqAAxDaiu8IFJT36LOFd5Q_nf5Md6gA` |
| `VITE_SUPABASE_PROJECT_ID` | `chtupravnalojbapolbl` |

### Required — server (runtime)
| Name | Where to get it |
|---|---|
| `SUPABASE_URL` | `https://chtupravnalojbapolbl.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Same as `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | **⚠ Not available on Lovable Cloud** — see below |
| `LOVABLE_API_KEY` | **⚠ Managed by Lovable** — cannot be exported |

### Optional — feature secrets
Only add if you configured them:
- `IOT_INGEST_SECRET` (HMAC for `/api/public/iot/ingest`)
- `REFRESH_WIDGETS_SECRET` (HMAC for the cache warmer)
- Any custom API keys you added via Lovable's secrets UI

## 3. Deploy

```
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard and push.

---

## What breaks on Vercel (and why)

### ❌ AI features (Oracle, Pulse, Foresight briefings, Causal reasoning)
These use **Lovable AI Gateway**, authenticated by `LOVABLE_API_KEY`.
That key is minted per-project by Lovable and **cannot be copied out**.

**Fix**: replace `src/lib/ai-gateway.server.ts` with your own OpenAI or
Google Gemini key. Add `OPENAI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`)
to Vercel and swap the provider. This is a code change I can do if you want.

### ❌ Server-side cache writes (`provider_cache` table, widget warmer)
The cache uses `supabaseAdmin` (service role) to bypass RLS when writing
provider responses. Lovable Cloud **does not expose the service role key**.

**Fix**: either
1. Migrate to your own self-hosted Supabase project (you'll get full key
   access), OR
2. Rewrite the cache layer to use only the publishable key + RLS policies
   scoped to `authenticated` — this reduces cache hit rate and increases
   external API calls (429s will come back).

### ❌ IoT device ingest (`/api/public/iot/ingest`)
Same reason — writes to `iot_readings` under service role.

### ❌ pg_cron widget refresh
The scheduled function inside your database calls
`https://…lovable.app/api/public/hooks/refresh-widgets`. You'd need to
update the cron target URL to your Vercel domain.

### ✅ What still works on Vercel
- Auth (signup / login / session) — uses publishable key only
- Reading widgets from cache (if cache has been populated by the Lovable
  deployment)
- Globe, Time Machine, History charts, dashboards, layouts
- Share links, achievements, automations UI, agents UI (list/edit only —
  execution needs AI key)

---

## Honest recommendation

If you're demoing this project (portfolio, hackathon, class project),
publish through **Lovable** — every feature works, no config, and the URL
is `https://omni-globe.lovable.app`.

Move to Vercel only if you have a business reason to leave Lovable
hosting *and* you're prepared to also:
1. Migrate the database to your own Supabase project (to get service role
   access), and
2. Bring your own AI provider key.

Want me to do any of these? I can:
- **[A]** Add the Vercel nitro preset config (change #1 above) so you can
  deploy the frontend today, accepting the broken features.
- **[B]** Swap Lovable AI → your own OpenAI/Gemini key end-to-end.
- **[C]** Refactor the cache layer to not require service-role.

Tell me which and I'll do it.
