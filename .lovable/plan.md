# Plan: Write `PROJECT_GUIDE.md` — the complete beginner-friendly guide to OMNISPHERE

Create one large, well-organized Markdown file at the project root: **`PROJECT_GUIDE.md`**. It will be the single source of truth for what OMNISPHERE is, how to use it, how it is built, and what every folder and file does — written so a non-coder can follow along.

## Goals

- One file, no code changes anywhere else.
- Plain English first, technical detail second (in clearly-labeled subsections).
- Cover **every** top-level folder and **every** meaningful file in `src/`, `supabase/`, and the project root.
- Explain **why** each piece exists, not just what it is.

## Document outline

1. **What is OMNISPHERE?** — one-paragraph pitch + tagline + who it's for.
2. **Screenshots / Tour** — page-by-page walkthrough of Pulse, Dashboard, Globe, Oracle, Foresight, Briefing, Alerts, Automations, Agents, Devices, Presets, Shares, Achievements, History, Settings. What each does, when to use it.
3. **How to use it (non-technical)** — sign in, set home location, pick widgets, resize, share, generate a Pulse, ask the Oracle, set an alert, etc.
4. **Feature catalogue** — grouped list (Live Widgets, 3D Globe, Time Machine, Pulse, Foresight, Oracle, Briefing, Alerts, Automations, Agents, Devices, Presets, Achievements, Shares, Trust Layer, Themes, Responsive/Mobile).
5. **The tech stack — explained like you're new**
   - React 19 + TanStack Start (why: full-stack React with SSR + server functions)
   - TanStack Router (file-based routing)
   - TanStack Query (data fetching + caching)
   - Vite 7 (build tool)
   - Tailwind CSS v4 + shadcn/ui (styling + components)
   - Lovable Cloud = Supabase under the hood (Postgres, Auth, Storage, RLS)
   - Lovable AI Gateway (Gemini models for Pulse, Oracle, Briefing, Agents, Foresight)
   - Cloudflare Workers runtime (where the server code runs)
   - `globe.gl` + Three.js (3D globe)
   - `react-grid-layout` (drag/resize dashboard)
   - `recharts` (history charts)
   - Zod (input validation)
   - For each: **what it is**, **why we chose it**, **where it shows up in the code**.
6. **Architecture at a glance** — an ASCII diagram showing Browser → TanStack Router → Server Functions → Supabase / External APIs / AI Gateway, plus the `provider_cache` warming loop.
7. **Data flow examples** — trace two real journeys end-to-end in plain language: (a) "I open the Weather widget" and (b) "I click Generate Pulse".
8. **Folder-by-folder, file-by-file reference** — the big section:
   - Project root: `package.json`, `vite.config.ts`, `tsconfig.json`, `components.json`, `eslint.config.js`, `bunfig.toml`, `.env`, `.prettierrc`, `AGENTS.md`, `README.md`, `.lovable/`.
   - `public/` — favicon and static assets.
   - `src/` overview.
   - `src/routes/` — every route file, what URL it maps to, what it renders. Explain `__root.tsx`, `_authenticated/route.tsx`, `auth.tsx`, `index.tsx`, `s.$slug.tsx`, and every page under `_authenticated/`. Explain `api/public/hooks/*` webhooks.
   - `src/components/omni/` — every component (AppShell, LayoutGrid, LiveWidget, WidgetShell, WidgetPicker, GlobeInner, LocationSearch, TimelineScrubber, MilestoneNarration, OnThisDayTray, AttentionBadge, ForecastCard, TrustBadge, theme-provider).
   - `src/lib/` — every `.functions.ts` (client-callable server RPC) paired with its `.server.ts` (server-only logic): pulse, foresight, oracle, briefing, agents, alerts, automations, devices, achievements, presets, shares, favourites, forecast, history-data, timemachine, widget-data, widgets, location, profile. Plus helpers: `anomaly.ts`, `format.ts`, `utils.ts`, `presets.ts`, `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts`.
   - `src/integrations/supabase/` — client.ts, client.server.ts, auth-middleware.ts, auth-attacher.ts, types.ts (mark as auto-generated).
   - `src/hooks/` — use-mobile, use-debounce.
   - `src/styles.css` — design tokens, liquid-glass system, motion tokens.
   - `src/router.tsx`, `src/start.ts`, `src/server.ts` — the boot chain, explained.
   - `supabase/` — `config.toml` and `migrations/` (summarize each migration by what tables/policies it added).
   - Generated files to **never** touch: `src/routeTree.gen.ts`, `src/integrations/supabase/*` (auto-gen ones), `.env`.
9. **The database** — plain-English table catalogue: `profiles`, `user_roles`, `favourite_locations`, `widget_configs`, `alerts`, `alert_events`, `automations`, `automation_runs`, `agents`, `agent_runs`, `devices`, `device_readings`, `achievements`, `pulses`, `predictions`, `briefings`, `shared_dashboards`, `personal_milestones`, `calendar_events`, `client_errors`, `provider_cache`. For each: what it stores, who can read/write (RLS in one sentence).
10. **Security model** — Auth via Supabase, RLS on every table, roles in a separate `user_roles` table, `has_role` security-definer, webhook HMAC verification, no service-role secrets exposed.
11. **External data providers** — table of every API used (Open-Meteo, MET Norway, NASA POWER/GIBS/APOD/Image Library, USGS, Launch Library 2, CoinGecko, ExchangeRate, GDELT, Hacker News, BBC RSS, ISS Open Notify, disease.sh COVID) with what widget uses it and the fallback if it fails.
12. **AI usage** — which pages call the AI gateway, which Gemini model, what prompt shape, and cost/rate-limit behavior.
13. **Caching + reliability** — `provider_cache` explained: how the "serve-stale-while-refreshing" and cooldown logic keeps widgets alive under rate limits; the `refresh-widgets` warmer webhook.
14. **Design system** — the liquid-glass tokens, motion tokens (`--ease-out-quint`, durations), light/dark theme, focus/press states, mobile behavior.
15. **How to run it locally / how to publish** — dev server, environment variables that Lovable manages for you, publishing from the Lovable UI.
16. **Glossary for non-coders** — RLS, server function, SSR, cache, RPC, webhook, HMAC, JWT, migration, Zod, provider, in one line each.
17. **FAQ / troubleshooting** — "a widget says cooling down", "clocks aren't ticking", "I can't sign in", "Pulse says rate limit", etc.

## Tone and formatting rules

- Short sentences. Plain words first, jargon in parentheses.
- Headings, tables, and bullet lists — no walls of text.
- Every folder/file entry uses the same 3-line shape: **Path** / **What it is** / **Why it exists**.
- Never expose Supabase project IDs or dashboard links.
- No code changes anywhere else in the repo.

## Deliverable

- New file: `PROJECT_GUIDE.md` at the repo root. Expected size ~1,500–2,500 lines of Markdown so it truly covers "everything".
- No other files touched.
