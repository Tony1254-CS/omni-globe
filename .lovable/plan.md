
# Fix the "nothing works" problem — reliability sprint

You are right. The screenshot shows 7 of 8 cards in an error state (429 / 403 / 503). The Oracle, Time Machine, Automations, etc. don't matter if the dashboard looks broken on load. This plan pauses new features and fixes the root cause.

## What is actually broken (verified from the code)

1. **Every user's browser hits every free API individually.** Open-Meteo, GDELT, NASA, Reddit's RSS mirror, RocketLaunch.live have per-IP limits. With multiple viewers + auto-refresh, they 429 within minutes.
2. **One failure locks the widget for 30 min – 30 min * 2^n.** `fetchWidgetData` doubles the cooldown on each failure. Once cooled down, retries never happen until a user manually clicks retry — and if that also 429s (it will), the timer resets even longer.
3. **Reddit's public JSON is dead** and the RSS fallback is now returning 403 (visible in the screenshot).
4. **NASA APOD without a key** uses `DEMO_KEY` which is 30 req/hr per IP — burns instantly.
5. **In-memory cache is per-worker.** Every serverless invocation is a fresh worker, so the in-memory cache barely helps; only the Supabase `provider_cache` row helps, and it's only written on success.

## The fix — shared server-side cache, refreshed on a schedule

Instead of "user requests → server hits provider", switch to "cron writes provider_cache → user reads provider_cache". One request per provider per interval for the whole app, regardless of user count.

### Step 1 — Scheduled refresher (pg_cron → public server route)
- Add a public server route `src/routes/api/public/refresh-providers.ts` that:
  - Authenticates callers with a shared secret header (`X-Refresh-Key`).
  - Iterates a canonical list of "global" widget payloads (weather for user favourites, ISS, quakes, APOD, SpaceX, GDELT news, crypto, FX, GitHub trending, quote, NEO, Mars).
  - Calls `fetchWidgetDataFresh` for each; on success upserts `provider_cache`; on failure logs and moves on (no cooldown lockout).
- Schedule it with `pg_cron` + `pg_net` to POST to that route every 5 minutes (some slots every hour).

### Step 2 — Read-through cache for user widgets
- `fetchWidgetData` (called from `getWidgetData` server fn) becomes read-mostly:
  - If `provider_cache` has any row (even stale), return it and mark `stale: true` if past TTL.
  - Trigger a background refresh only if the last fresh success was > TTL AND no fetch is in flight.
  - Remove the exponential 30-min lockout. Cap cooldown at 2 minutes and keep serving cached data during it.
- Location-scoped widgets (weather/aqi with per-user coords) still fetch on demand, but reuse cache aggressively and fall back to nearest cached lat/lon rounded to 0.25°.

### Step 3 — Replace broken providers
- **Reddit** → drop it from the default catalog; keep the widget type but mark "requires custom API key". Replace slot in default dashboard with Hacker News API (`https://hn.algolia.com/api/v1/search?tags=front_page`) — no key, reliable.
- **NASA APOD** → prompt user to add `NASA_API_KEY` via `add_secret`. Fall back to yesterday's cached APOD if today's isn't available yet.
- **RocketLaunch.live** → keep, but cache 30 min and never 429-lock.
- **GDELT News** → keep; also add an HN + BBC RSS fallback path.

### Step 4 — Never show the amber error card if we have ANY data
- `LiveWidget` today branches into the "Provider cooling down" state when `query.data?.error` is set. Change it: if `query.data?.data` is present (stale), render the widget with a small "Cached · 12 min ago" badge and never the full-card error.
- Only show the amber card for widgets that have never returned data.

### Step 5 — Reset the current stuck state
- Manual: run `DELETE FROM provider_cache WHERE payload IS NULL OR expires_at < now() - interval '1 day'` and clear the in-memory retry timers by bumping the cache-key version prefix (like the existing `v3:` on ISS) from every affected type.
- Kick the new refresher once immediately after deploy so the DB is warm before any user loads the dashboard.

## What I will NOT touch this round
- Oracle, Time Machine v2, Day Compass, Google Calendar, landing page. All deferred until the dashboard reliably shows data.

## Order of execution
1. Migration: create the refresh function, `X-Refresh-Key` secret via `generate_secret`, and schedule `pg_cron` every 5 min.
2. New public route `refresh-providers.ts` + shared refresher module.
3. Rewrite `fetchWidgetData` to read-through cache with soft cooldown + always-serve-stale.
4. Swap Reddit for Hacker News; add NASA key prompt with graceful fallback.
5. Update `LiveWidget` to never hide data behind the error state.
6. Purge stale cache rows, bump cache-key versions, trigger a warm-up refresh.
7. Verify: hard-refresh the dashboard 3× with a fresh browser session; all cards should show data within 2 s of load.

## Success criteria
- On a cold load in an incognito window, every widget in the default preset renders live data (not the amber error) within 2 seconds.
- Repeated refresh does not trigger 429s from any provider.
- If a provider does 429, the widget still shows the last-good data with a small "cached" badge instead of an error card.
