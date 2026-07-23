
# OMNISPHERE — Build Plan (Lovable Stack)

## Stack Mapping (Django spec → Lovable equivalents)

| Original | Lovable equivalent |
|---|---|
| Django + DRF | TanStack Start route handlers + `createServerFn` |
| PostgreSQL + PostGIS | Lovable Cloud Postgres (PostGIS extension enabled) |
| django-allauth (Google/GitHub) | Lovable Cloud Auth (email + Google; GitHub not native — will use Supabase provider) |
| Django Channels (WebSocket) | Lovable Cloud Realtime (Postgres change streams) |
| Celery + Celery Beat | `pg_cron` scheduling public API routes under `/api/public/cron/*` |
| Redis cache | Postgres cached tables with `fetched_at` + TTL |
| OpenAI (GPT-3.5) | Lovable AI Gateway (Gemini/GPT models) |
| Docker / Nginx / Gunicorn | Lovable hosting (Cloudflare Workers) |

The functionality is preserved; only the runtime changes.

## Architecture

```text
Browser (React + TanStack Router)
  ├─ 3D Globe (react-globe.gl / three.js)
  ├─ Draggable grid (react-grid-layout)
  ├─ Widgets (Framer Motion, shadcn)
  ├─ Voice (Web Speech API)
  └─ Realtime subscriptions (Supabase JS)
        │
        ▼
TanStack Server Functions & Routes (Cloudflare Workers)
  ├─ /api/public/cron/fetch-*      ← pg_cron every 60s
  ├─ /api/public/cron/daily-brief  ← pg_cron 08:00 per user
  ├─ /api/public/cron/alerts       ← threshold evaluator
  ├─ createServerFn: widget CRUD, favourites, alerts, AI query
  └─ Lovable AI Gateway (briefings, NL→SQL)
        │
        ▼
Lovable Cloud (Postgres + Auth + Realtime + Storage)
```

## Data Model (Postgres)

- `profiles` (id, avatar_url, timezone, units, home_lat, home_lon)
- `user_roles` (id, user_id, role) + `has_role()` SECURITY DEFINER
- `favourite_locations` (id, user_id, label, lat, lon)
- `widget_configs` (id, user_id, widget_type, x, y, w, h, settings jsonb)
- `user_alerts` (id, user_id, metric, operator, threshold, active, last_fired_at, notify_email, notify_sound)
- `notifications` (id, user_id, title, body, severity, read_at, created_at)
- Cached data (public read, service-role write):
  - `cache_weather` (location_key, lat, lon, payload jsonb, fetched_at)
  - `cache_aqi`, `cache_earthquakes`, `cache_crypto`, `cache_news`,
    `cache_iss`, `cache_neo`, `cache_spacex`, `cache_apod`,
    `cache_mars_photos`, `cache_countries`, `cache_reddit`,
    `cache_github_trending`, `cache_quote`, `cache_covid`, `cache_fx`
- Historical time-series:
  - `hist_weather`, `hist_aqi`, `hist_crypto`, `hist_earthquake`
    (all with `observed_at timestamptz` + relevant metrics; indexed by time)
- `daily_briefings` (id, user_id, date, summary, audio_url)
- `voice_command_log` (id, user_id, transcript, intent, response, created_at)

Every table gets explicit GRANTs and RLS: users read/write only their own rows; cache tables are `TO anon SELECT` (public read) and service-role write from cron.

## Backend Jobs (pg_cron → `/api/public/cron/*`)

Each cron route is signed with a `CRON_SECRET` header check.

- `fetch-weather` every 10 min for all favourite locations + top cities
- `fetch-aqi` every 15 min
- `fetch-earthquakes` every 5 min (USGS)
- `fetch-iss` every 30 sec (Open Notify) + realtime broadcast
- `fetch-crypto` every 60 sec (CoinGecko top 50)
- `fetch-fx` daily (ExchangeRate-API)
- `fetch-news` every 15 min (NewsAPI)
- `fetch-apod` daily (NASA)
- `fetch-mars-photos` daily
- `fetch-neo` daily
- `fetch-spacex` hourly
- `fetch-reddit` every 10 min per tracked subreddit
- `fetch-github-trending` hourly
- `fetch-quote` daily
- `fetch-covid` hourly
- `evaluate-alerts` every 60 sec → inserts `notifications`, sends email via connector
- `daily-briefing` hourly (checks each user's 08:00 in their timezone)

Each fetch writes to `cache_*` (upsert) and appends to `hist_*` when applicable.

## Frontend Routes

- `/` — public landing with sign-in CTA
- `/auth` — Lovable-managed auth gate
- `/_authenticated/dashboard` — main cockpit (globe + widget grid)
- `/_authenticated/globe` — full-screen globe mode ("Zen")
- `/_authenticated/history` — analytics + time-machine slider
- `/_authenticated/alerts` — manage thresholds
- `/_authenticated/settings` — profile, timezone, units, favourites
- `/_authenticated/briefings` — past AI briefings

Keyboard shortcut `⌘K` opens a command palette (cmdk).

## Widgets (20+)

Weather · Forecast · AQI · Earthquakes · APOD · Mars Rover · NEO · SpaceX · ISS crew & passes · World clocks · News · Reddit · Crypto ticker · FX converter · Countries explorer · GitHub trending · Quote · COVID · Notifications · Voice log · AI chat.

Each widget = a React component fed by `useSuspenseQuery` against a `createServerFn` reading `cache_*`. Realtime subscription updates the query cache. Draggable/resizable via `react-grid-layout`; layout persisted to `widget_configs`.

## 3D Globe

- `react-globe.gl` with day/night texture
- Layers toggled from a control bar:
  - ISS marker (updates via realtime channel)
  - Earthquake markers (size = magnitude, pulse animation)
  - Weather tile overlay (OpenWeatherMap tile URL template)
  - Click anywhere → spawn weather+AQI widget for that lat/lon
- Rendered client-only (dynamic import behind `<ClientOnly>`) — Three.js is browser-only.

## AI Voice Assistant

- Web Speech API for wake word "Omni" and STT
- `createServerFn: aiVoiceQuery` → Lovable AI Gateway with tool definitions:
  - `show_widget(type, params)`, `get_weather(city)`, `get_earthquakes(min_mag)`,
    `add_alert(metric, op, threshold)`, `summarize_news()`, `query_history(sql_intent)`
- NL→SQL restricted to a whitelisted read-only view set
- Response spoken via Web Speech `speechSynthesis`
- Daily 08:00 briefing generated server-side, stored in `daily_briefings`,
  optional TTS audio via Lovable AI TTS uploaded to storage

## Alerts

- `evaluate-alerts` cron reads active `user_alerts`, compares to latest `cache_*`
- On fire: insert `notifications` row (triggers realtime bell badge),
  send email via a mail connector (Resend), optional chime client-side

## Historical Data & Time Machine

- History pages use Recharts against `hist_*` tables
- Time-machine: date slider on `/history` — server function returns snapshots
  from `hist_*` for the selected timestamp; widgets re-render in read-only mode
- CSV export via server function → `text/csv` response
- PDF export via `@react-pdf/renderer` on the client

## Design System

- Dark-first neon glassmorphism theme in `src/styles.css`
- oklch semantic tokens: `--neon-cyan`, `--neon-magenta`, `--glass-bg`,
  `--glass-border`, gradients + glow shadows
- Framer Motion for panel transitions, hover glows, widget spawn animations
- Fully responsive: grid collapses to single column on mobile; globe becomes
  a compact preview with tap-to-expand
- Light theme toggle via `.dark` variant class

## Secrets Required

Please have ready to paste into `add_secret` when we reach each phase:
`OPENWEATHERMAP_API_KEY`, `AQICN_TOKEN`, `NEWSAPI_KEY`, `NASA_API_KEY`,
`THEYSAIDSO_KEY`, `RESEND_API_KEY` (for email alerts), and confirm Google OAuth
setup in Lovable Cloud auth settings. `LOVABLE_API_KEY` and `CRON_SECRET`
will be auto-provisioned. Keyless APIs (USGS, SpaceX, CoinGecko, ISS, Reddit,
REST Countries, GitHub, disease.sh, ExchangeRate-API free tier) need nothing.

## Build Phases (each phase is a separate turn / delivery)

1. **Foundation** — Enable Cloud, auth (email + Google), profiles, RLS, roles,
   design system tokens, app shell, landing page, authenticated layout,
   dashboard skeleton with draggable empty grid, favourites CRUD, settings page.
2. **Cached data pipeline** — Cache & history tables, cron routes for all
   keyless APIs (USGS, ISS, SpaceX, CoinGecko, Reddit, REST Countries, GitHub,
   ExchangeRate, disease.sh), pg_cron schedules, realtime channels.
3. **Widgets v1** — 10 widgets bound to phase-2 caches, `react-grid-layout`
   persistence, widget picker, per-widget settings.
4. **3D Globe** — react-globe.gl integration, ISS + earthquake layers,
   click-to-spawn widget, layer controls, Zen mode route.
5. **Keyed APIs** — add OpenWeatherMap, AQICN, NewsAPI, NASA (APOD/Mars/NEO),
   TheySaidSo; remaining 10+ widgets; weather-tile overlay on globe.
6. **AI voice assistant** — Web Speech wake word + STT, tool-calling server fn
   via Lovable AI Gateway, TTS response, command palette (`⌘K`).
7. **Alerts + notifications** — alert CRUD UI, evaluator cron, notification
   bell + realtime badge, Resend email integration, chime.
8. **History & time machine** — Recharts pages, date slider, CSV/PDF export.
9. **Daily briefings** — 08:00 cron per-user-timezone, briefing storage, TTS
   audio, `/briefings` page.
10. **Polish** — animations pass, keyboard shortcuts, social share, PWA
    manifest, onboarding tour, i18n (en/es), Zen mode audio, SEO metadata per route.

Each phase ends buildable and testable. Approving this plan starts Phase 1.

## Non-goals / deviations from original spec

- No Django, Celery, Redis, Docker, Nginx, Gunicorn (Lovable stack replaces them).
- GitHub OAuth login: not natively supported on Lovable Cloud. Google login ships in Phase 1; GitHub login can be added later by switching to the Supabase integration if you need it.
- "PostGIS queries" from globe are done client-side against cached GeoJSON;
  PostGIS extension is enabled but only used for indexed nearest-favourite lookups.
