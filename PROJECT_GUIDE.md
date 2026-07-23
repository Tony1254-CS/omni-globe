# OMNISPHERE — The Complete Project Guide

> **One dashboard. The entire planet. Your voice in control.**

This guide explains **everything** about OMNISPHERE in plain English — what it is, how to use it, how it's built, and what every folder and file in the codebase does. If you've never written code before, start at the top and read straight through. If you're a developer, jump to the section you need from the table of contents.

---

## Table of Contents

1. [What is OMNISPHERE?](#1-what-is-omnisphere)
2. [Page-by-Page Tour](#2-page-by-page-tour)
3. [How to Use It (Non-Technical)](#3-how-to-use-it-non-technical)
4. [Feature Catalogue](#4-feature-catalogue)
5. [The Tech Stack, Explained](#5-the-tech-stack-explained)
6. [Architecture at a Glance](#6-architecture-at-a-glance)
7. [Two Real Data-Flow Examples](#7-two-real-data-flow-examples)
8. [Folder-by-Folder, File-by-File](#8-folder-by-folder-file-by-file)
9. [The Database](#9-the-database)
10. [Security Model](#10-security-model)
11. [External Data Providers](#11-external-data-providers)
12. [AI Usage](#12-ai-usage)
13. [Caching & Reliability](#13-caching--reliability)
14. [Design System](#14-design-system)
15. [Running & Publishing](#15-running--publishing)
16. [Glossary for Non-Coders](#16-glossary-for-non-coders)
17. [FAQ & Troubleshooting](#17-faq--troubleshooting)

---

## 1. What is OMNISPHERE?

OMNISPHERE is a **personal global awareness command center**. Think of it as your own private "mission control" for the planet: weather where you live, earthquakes on the other side of the world, the price of Bitcoin, the next rocket launch, the news, the air you're breathing, the space station passing overhead — all in one calm, beautiful place.

It goes further than a plain dashboard:

- **Pulse** — a cinematic morning briefing written by AI from your live data.
- **Foresight** — AI predictions with an honest scorecard so you can see how right (or wrong) they were.
- **Oracle** — an AI you can ask *why* and *what if* questions about the world.
- **Time Machine** — rewind the globe by decades to see satellite imagery, quakes, and headlines from any date.
- **Automations & Agents** — rules and AI helpers that watch the world for you.
- **Devices** — plug in your own sensors (temperature, motion, anything).

**Who it's for:** curious people, analysts, traders, teachers, hobbyists, anyone who wants signal instead of noise.

**Tagline:** *One dashboard. The entire planet. Your voice in control.*

---

## 2. Page-by-Page Tour

Every page lives on its own URL. The sidebar on the left (icons) takes you to each one.

| URL | Page | What it does |
|---|---|---|
| `/` | **Landing** | Public marketing page. Sign up / sign in. |
| `/auth` | **Sign In** | Email + password. Google login supported. |
| `/pulse` | **Pulse** | AI-written daily briefing built from your widgets. Big cinematic headline, key metrics, "what to pay attention to". |
| `/dashboard` | **Dashboard** | Your drag-and-drop grid of live widgets. Resize, rearrange, add, remove. |
| `/globe` | **Globe** | 3D interactive Earth with ISS, earthquakes, favourites, and the Time Machine slider (1975 → today). |
| `/oracle` | **Oracle** | Threaded chat with an AI that reasons about causes and consequences using live world data. |
| `/foresight` | **Foresight** | AI predictions ("70% chance BTC closes above $X by Friday") with a running Brier-score accuracy record. |
| `/briefing` | **Briefing** | Longer AI executive summary of the current world state. |
| `/alerts` | **Alerts** | Threshold rules ("tell me if AQI > 100") and their history. |
| `/automations` | **Automations** | If-this-then-that flows triggered by data or time. |
| `/agents` | **Agents** | Custom AI helpers with tool access — build a research assistant, a market watcher, etc. |
| `/devices` | **Devices** | Your own IoT devices sending readings in via a secure webhook. |
| `/presets` | **Presets** | One-click dashboard templates (Trader, Traveler, Weather Nerd…). |
| `/shares` | **Shares** | Public read-only share links for a dashboard snapshot. |
| `/achievements` | **Achievements** | Fun milestones you earn as you use the app. |
| `/history` | **History** | Two tabs: **My Activity** (what *you* did) and **Global Trends** (weather/crypto/quake charts). |
| `/settings` | **Settings** | Change your home location, timezone, units, theme, name. |
| `/s/:slug` | **Public share** | The read-only page a friend sees when you share a dashboard. |

---

## 3. How to Use It (Non-Technical)

**First 60 seconds:**

1. Open the app and click **Sign up**. Email verification is off for demo, so you're in instantly.
2. Go to **Settings** → search for your city under *Home Location*. Pick it. This drives weather, AQI, clocks, and news defaults.
3. Go to **Dashboard**. You'll see a starter grid of widgets. Drag them by the header, resize from the bottom-right corner, or click **+ Add widget** to pick more.
4. Click **Pulse** in the sidebar and hit **Generate Pulse**. In a few seconds you get a cinematic briefing of your world *right now*.

**Everyday moves:**

- **Change theme** — sun/moon icon in the top bar.
- **Set an alert** — go to Alerts → New → pick a metric ("AQI in Delhi") and a threshold.
- **Ask a question** — go to Oracle → type "Why did BTC drop today?" or "What if a magnitude-7 hit Tokyo?"
- **Share a dashboard** — Shares → Create → copy the link. It's public and read-only.
- **Add your own device** — Devices → New → copy the ingest URL and secret, send readings via HTTPS.

**On mobile:** the sidebar becomes a bottom nav bar; widgets stack in a single column.

---

## 4. Feature Catalogue

**Live data:** Weather, Air Quality, Earthquakes, Crypto, FX, News, Space (SpaceX / Launch Library), NASA APOD, Mars weather, ISS position, COVID stats, Hacker News, BBC headlines, Clocks (multi-timezone), and more.

**Signature features:**
- 🎬 **Pulse** — cinematic AI briefing.
- 🔮 **Foresight** — probabilistic predictions with a Brier-score audit trail.
- 🧠 **Oracle** — causal reasoning chat.
- ⏳ **Time Machine** — historical NASA GIBS + quakes + GDELT news.
- 🛡️ **Trust Layer** — every card shows where the number came from and how fresh it is.

**Power features:**
- 🎛️ **Custom Dashboards** — drag/resize/persist per user.
- 🚨 **Alerts** — thresholds, per-widget, with a history log.
- 🤖 **Automations** — rule engine that runs on a schedule.
- 🕵️ **Agents** — Gemini-powered helpers with tool calling.
- 📡 **Devices** — HMAC-signed webhook ingest for your own sensors.
- 📚 **Presets** — dashboard templates.
- 🏆 **Achievements** — gamified usage.
- 🔗 **Shares** — public read-only dashboards.

**Polish:**
- Liquid-glass Apple-style UI, light + dark themes.
- Snappy motion tokens, respects `prefers-reduced-motion`.
- Fully responsive down to 320px.

---

## 5. The Tech Stack, Explained

Each entry below has three parts: **What it is**, **Why we use it**, **Where you see it**.

### React 19
- **What:** the JavaScript library for building user interfaces.
- **Why:** the industry standard; huge ecosystem; component model matches how we think about widgets.
- **Where:** every `.tsx` file in `src/`.

### TanStack Start (v1)
- **What:** a full-stack React framework built on top of Vite. It handles server-side rendering (SSR) and **server functions** — functions you write once and can safely call from the browser.
- **Why:** we need both a fast client app *and* a place to talk to Supabase/APIs with secrets. Server functions give us that without spinning up a separate backend.
- **Where:** `src/router.tsx`, `src/start.ts`, `src/server.ts`, and every `*.functions.ts` file in `src/lib/`.

### TanStack Router
- **What:** a type-safe, file-based router.
- **Why:** each file in `src/routes/` becomes a page automatically; the URL and the file name always match.
- **Where:** `src/routes/**`, generated `src/routeTree.gen.ts`.

### TanStack Query
- **What:** a data-fetching + caching library for React.
- **Why:** it turns "load data, show loading, retry on error, refresh in background" into a one-line hook.
- **Where:** `useQuery`, `useSuspenseQuery` inside route components and `LiveWidget.tsx`.

### Vite 7
- **What:** the build tool. Compiles TypeScript/JSX, bundles assets, runs the dev server.
- **Why:** instant hot reload, tiny production bundles.
- **Where:** `vite.config.ts`.

### Tailwind CSS v4
- **What:** utility-first CSS framework. Instead of writing CSS, you compose classes like `flex items-center gap-2`.
- **Why:** fast to iterate, consistent spacing/colors, tiny final CSS.
- **Where:** every component's `className=`, tokens defined in `src/styles.css`.

### shadcn/ui
- **What:** a set of accessible React components (buttons, dialogs, tabs, etc.) you copy into your project and style with Tailwind.
- **Why:** unlike a library, you own the code and can restyle freely. Perfect for our "liquid glass" look.
- **Where:** `components.json` config; component patterns throughout `src/components/`.

### Lovable Cloud (Supabase under the hood)
- **What:** hosted Postgres database + authentication + storage, with row-level security (RLS).
- **Why:** one product gives us the DB, login, and a client SDK. RLS lets each user only see their own rows.
- **Where:** `src/integrations/supabase/*`, `supabase/migrations/*`.

### Lovable AI Gateway
- **What:** a single API endpoint that proxies to Gemini (and other) models. No API keys to manage in code — the platform injects them.
- **Why:** free tier for demos, unified billing, easy model swaps.
- **Where:** `src/lib/pulse.server.ts`, `oracle.functions.ts`, `briefing.server.ts`, `agents.server.ts`, `foresight.server.ts`.

### Cloudflare Workers (via Nitro)
- **What:** where the server code actually runs in production — edge servers around the world.
- **Why:** near-zero cold start, global low latency, cheap.
- **Where:** implicit — set by `vite.config.ts` through `@lovable.dev/vite-tanstack-config`. Read `<server-runtime>` in `AGENTS.md` for the constraints.

### globe.gl + Three.js
- **What:** a WebGL 3D globe library.
- **Why:** a real 3D Earth is the "wow" moment; globe.gl wraps Three.js so we don't have to hand-write shaders.
- **Where:** `src/components/omni/GlobeInner.tsx`.

### react-grid-layout
- **What:** drag-and-resize grid for React.
- **Why:** widgets need to be freely arrangeable per user; this is the mature choice.
- **Where:** `src/components/omni/LayoutGrid.tsx`.

### recharts
- **What:** chart library built on React + D3.
- **Why:** simple declarative charts that match our theme via CSS variables.
- **Where:** `src/routes/_authenticated/history.tsx`.

### Zod
- **What:** a schema validator for TypeScript.
- **Why:** every server function validates its input with Zod so bad data can't crash the backend.
- **Where:** the `.inputValidator(...)` block in every `*.functions.ts` file.

### Lucide Icons
- **What:** open-source icon set.
- **Why:** clean, consistent, tree-shakable.
- **Where:** every `import { X } from "lucide-react"` line.

---

## 6. Architecture at a Glance

```text
                       ┌───────────────────────────────┐
                       │           Browser             │
                       │  React 19 + TanStack Router   │
                       │  TanStack Query cache         │
                       └──────────────┬────────────────┘
                                      │  (typed RPC via createServerFn)
                                      ▼
                       ┌───────────────────────────────┐
                       │  TanStack Start on Cloudflare │
                       │  Workers (SSR + server fns)   │
                       └──┬──────────────┬─────────────┘
                          │              │
                ┌─────────▼───┐   ┌──────▼────────────────┐
                │  Supabase   │   │  External Providers   │
                │  Postgres + │   │  Open-Meteo, USGS,    │
                │  Auth + RLS │   │  NASA, CoinGecko …    │
                └──────┬──────┘   └──────┬────────────────┘
                       │                 │
                       │      cached in  │
                       └──────► provider_cache table ◄──── refresh-widgets webhook
                                          ▲
                                          │  Lovable AI Gateway
                                  ┌───────┴────────┐
                                  │  Gemini models │
                                  │ (Pulse, Oracle,│
                                  │  Foresight …)  │
                                  └────────────────┘
```

Key ideas:

- Browser never talks to external APIs directly — it always goes through a server function so secrets stay server-side and responses can be cached.
- `provider_cache` is the shared brain: any user's request warms it for everyone else.
- Auth is enforced by RLS in Postgres, not in the app code, so it can't be bypassed.

---

## 7. Two Real Data-Flow Examples

### A) "I open the Weather widget"

1. `LiveWidget.tsx` calls `useQuery` with key `["widget-data","weather",{lat,lon}]`.
2. The query function calls the server function `getWidgetData` (`src/lib/widget-data.functions.ts`).
3. On the server, `widget-data.server.ts` looks in `provider_cache` for a fresh entry.
4. **Hit:** return the cached JSON immediately (with a `stale: false` flag).
   **Miss:** fetch Open-Meteo → if 429, fall back to MET Norway → cache the response with a TTL → return it.
5. Browser receives the JSON, renders temperature, wind, and a Trust badge showing the source and freshness.
6. Every 5 minutes, React Query silently refreshes; if the provider is cooling down, it serves stale data with a "warming up" badge.

### B) "I click Generate Pulse"

1. Button on `/pulse` calls the server function `generatePulse` (`src/lib/pulse.functions.ts`).
2. Middleware `requireSupabaseAuth` verifies the user's JWT and gives the handler an authenticated Supabase client.
3. `buildPulseSnapshot` fetches weather, AQI, quakes, crypto, space, and news in parallel via the same widget-data pipeline.
4. `synthesizePulse` sends the snapshot to the Lovable AI Gateway (Gemini) with a strict JSON schema prompt.
5. The parsed JSON is written to the `pulses` table (RLS scopes it to the user).
6. The row is returned to the browser and rendered as a cinematic headline + metrics + moment + insight + attention chip.

---

## 8. Folder-by-Folder, File-by-File

Each entry uses the same shape: **Path** — *What it is* — *Why it exists*.

### Root

- **`package.json`** — the project manifest. Lists every dependency and the `dev` / `build` scripts. Why: npm/bun read this to install and run the app.
- **`vite.config.ts`** — Vite build configuration. Uses `@lovable.dev/vite-tanstack-config` which pre-wires TanStack Start, Tailwind v4, Cloudflare target, and the `@` path alias. Why: keeps our config to just the deltas.
- **`tsconfig.json`** — TypeScript compiler settings. Strict mode is on. Why: catches bugs before runtime.
- **`components.json`** — shadcn/ui config (aliases, style). Why: tells the shadcn CLI where components live.
- **`eslint.config.js`** — linting rules. Why: enforces consistent code style.
- **`bunfig.toml`** — Bun package manager config. Why: we use Bun for install speed.
- **`.env`** — auto-generated environment variables (Supabase URL/key). **Never edit by hand.** Why: Lovable Cloud writes these.
- **`.prettierrc` / `.prettierignore`** — code formatter settings.
- **`README.md`** — short project readme.
- **`AGENTS.md`** — instructions for the Lovable AI agent working on this repo.
- **`PROJECT_GUIDE.md`** — the file you're reading.
- **`.lovable/`** — internal Lovable metadata (project config, previous plans). Managed by the platform.

### `public/`

- **`omnisphere-mark.svg`** — the favicon and app mark.

### `src/`

Top-level entrypoints and boot chain.

- **`src/router.tsx`** — creates the TanStack Router with a QueryClient. Sets `defaultPreload: "intent"` so hovering a link warms the route.
- **`src/start.ts`** — registers global server middleware: `errorMiddleware` catches thrown errors, `attachSupabaseAuth` attaches the user's JWT to every server-function call from the browser.
- **`src/server.ts`** — the Cloudflare Worker entry. Wraps SSR with a safety net that renders `error-page.ts` if the framework throws.
- **`src/styles.css`** — all global CSS. Design tokens (colors, gradients, shadows), the **liquid-glass** utility classes, **motion tokens** (`--ease-out-quint`, `--dur-fast/base/slow`), and reduced-motion overrides.
- **`src/routeTree.gen.ts`** — **auto-generated** route tree. Never edit.

### `src/routes/` — every URL in the app

Each file's name maps to a URL (dots become slashes, `$param` = dynamic segment, `_prefix` = layout without a URL segment).

- **`__root.tsx`** — the root layout. Sets `<html>`, `<head>` metadata, theme provider, error boundary, and the `<Outlet />` where all pages render.
- **`index.tsx`** — the public landing page (`/`). Hero, feature cards, call-to-action.
- **`auth.tsx`** — sign in / sign up page (`/auth`). Uses Supabase Auth.
- **`s.$slug.tsx`** — public share page (`/s/:slug`). Read-only rendering of a shared dashboard.
- **`_authenticated/route.tsx`** — the auth gate. Runs `beforeLoad` to check the session; unauthenticated users get redirected to `/auth`. Wraps children in `<AppShell>`.
- **`_authenticated/pulse.tsx`** — the Pulse page.
- **`_authenticated/dashboard.tsx`** — the widget grid.
- **`_authenticated/globe.tsx`** — the 3D globe + Time Machine.
- **`_authenticated/oracle.tsx`** — Oracle chat.
- **`_authenticated/foresight.tsx`** — predictions and scoreboard.
- **`_authenticated/briefing.tsx`** — long-form AI briefing.
- **`_authenticated/alerts.tsx`** — alert rules and events.
- **`_authenticated/automations.tsx`** — automation rules and run history.
- **`_authenticated/agents.tsx`** — AI agent builder.
- **`_authenticated/devices.tsx`** — device registration + readings.
- **`_authenticated/presets.tsx`** — dashboard templates.
- **`_authenticated/shares.tsx`** — manage share links.
- **`_authenticated/achievements.tsx`** — earned milestones.
- **`_authenticated/history.tsx`** — activity + global trends charts.
- **`_authenticated/settings.tsx`** — home location, timezone, units, theme.

**Public API endpoints** — under `/api/public/*` these bypass auth so external systems can call them. Security is enforced inside each handler via HMAC.

- **`api/public/hooks/device-ingest.ts`** — receives sensor readings from your IoT devices. Verifies HMAC signature.
- **`api/public/hooks/refresh-widgets.ts`** — the cache warmer. A cron hits this to keep `provider_cache` fresh for everyone.
- **`api/public/hooks/run-automations.ts`** — triggers automation evaluation on a schedule.

- **`routes/README.md`** — quick reference for the routing conventions.

### `src/components/omni/` — the app's custom components

- **`AppShell.tsx`** — the frame around every authenticated page: left sidebar (hover-expand on desktop, bottom nav on mobile), top command bar (theme toggle, UTC clock, home label), sign-out.
- **`LayoutGrid.tsx`** — the drag/resize widget grid. Persists layout to `widget_configs`. Handles breakpoints down to mobile.
- **`LiveWidget.tsx`** — the single component that renders **any** widget type. It fetches data via TanStack Query, shows skeletons, error/cooldown states, and delegates rendering per widget kind.
- **`WidgetShell.tsx`** — the glass card frame around each widget: header, remove button, hover lift, focus ring.
- **`WidgetPicker.tsx`** — the "+ Add widget" modal listing all available widget types.
- **`GlobeInner.tsx`** — the 3D globe implementation (globe.gl + textures). ISS marker, quake dots, favourites, click-to-inspect. Caps DPR on mobile for smooth frames.
- **`LocationSearch.tsx`** — autocomplete city search (Open-Meteo geocoding) used in Settings and elsewhere.
- **`TimelineScrubber.tsx`** — the decade-spanning slider on the Globe page.
- **`MilestoneNarration.tsx`** — the "on this day in your life" narrator on the Time Machine.
- **`OnThisDayTray.tsx`** — small tray of historical events for the selected date.
- **`AttentionBadge.tsx`** — the little "⚠ warm / alert" chip on widgets when anomaly detection fires.
- **`ForecastCard.tsx`** — the small forecast preview shown inside applicable widgets.
- **`TrustBadge.tsx`** — the tiny "source · freshness · verified" chip on every data card. This is the visible face of the Trust Layer.
- **`theme-provider.tsx`** — light/dark theme context with `localStorage` persistence and system fallback.

### `src/lib/` — server functions and helpers

Naming convention:

- **`*.functions.ts`** — files that export `createServerFn` RPCs. Safe to import from the browser; only the handler body runs on the server.
- **`*.server.ts`** — server-only implementation. Never imported directly by the browser.
- Plain **`.ts`** files — shared pure utilities usable anywhere.

| Path | What it is | Why it exists |
|---|---|---|
| `pulse.functions.ts` | RPCs: `listPulses`, `generatePulse`, `deletePulse`. | Client entry points for the Pulse feature. |
| `pulse.server.ts` | `buildPulseSnapshot` + `synthesizePulse` (Gemini call). | Isolates the AI prompt and provider fanout. |
| `foresight.functions.ts` / `foresight.server.ts` | Prediction generation + scoring. | Foresight page. |
| `oracle.functions.ts` | Threaded Oracle chat with Gemini. | Powers `/oracle`. |
| `briefing.functions.ts` / `briefing.server.ts` | Executive summary generator. | Powers `/briefing`. |
| `agents.functions.ts` / `agents.server.ts` | CRUD + run loop for custom AI agents (tool calling). | Powers `/agents`. |
| `alerts.functions.ts` / `alerts.server.ts` | Alert rules + evaluation. | Powers `/alerts`. |
| `automations.functions.ts` | Automation CRUD + trigger. | Powers `/automations` (evaluated by `run-automations` webhook). |
| `devices.functions.ts` | Register devices, list readings. | Powers `/devices`. |
| `achievements.functions.ts` / `achievements.server.ts` | Milestone unlock logic. | Gamification. |
| `presets.functions.ts` + `presets.ts` | Apply preset dashboards; preset definitions. | Powers `/presets`. |
| `shares.functions.ts` | Create/revoke share slugs; RPC read. | Powers `/shares` + `/s/:slug`. |
| `favourites.functions.ts` | Add/remove favourite locations. | Used on Globe. |
| `forecast.functions.ts` / `forecast.server.ts` | Weather/AQI/crypto forecasts. | Feeds `ForecastCard`. |
| `history-data.functions.ts` / `history-data.server.ts` | Global trends + my-activity aggregation. | Powers `/history`. |
| `timemachine.functions.ts` / `timemachine.server.ts` | Historical data at a chosen date. | Powers Time Machine on Globe. |
| `widget-data.functions.ts` / `widget-data.server.ts` | The universal provider fanout with caching + fallbacks. | Every widget goes through here. |
| `widget-data.types.ts` | Shared TypeScript types for widget payloads. | Type safety across client/server. |
| `widgets.functions.ts` | Widget config CRUD (add, remove, layout). | Powers Dashboard editing. |
| `location.functions.ts` | City search + reverse geocode. | Used by Settings and Location picker. |
| `profile.functions.ts` | Read/update the user's profile (home, timezone, units, theme). | Everywhere. |
| `anomaly.ts` | Pure scoring functions ("is this AQI dangerous?"). | Feeds `AttentionBadge`. |
| `format.ts` | Timezone-aware date/number/unit formatters. | Consistent display. |
| `utils.ts` | `cn()` classname helper + tiny utilities. | Standard shadcn helper. |
| `error-capture.ts` | Captures uncaught SSR errors for the safety-net response. | Backs `src/server.ts`. |
| `error-page.ts` | Renders the fallback 500 HTML. | Never leaves the user staring at a blank page. |
| `lovable-error-reporting.ts` | Ships client errors to the platform. | Debugging. |

### `src/integrations/supabase/` — **auto-generated, don't edit**

- **`client.ts`** — browser Supabase client (publishable key, RLS applies).
- **`client.server.ts`** — server-only admin client (`supabaseAdmin`, bypasses RLS — use only in verified webhooks and admin paths).
- **`auth-middleware.ts`** — `requireSupabaseAuth` for server functions; injects the authenticated `supabase` client + `userId` into `context`.
- **`auth-attacher.ts`** — client-side middleware that attaches the JWT bearer to every server-function call.
- **`types.ts`** — generated TypeScript types for every table.

### `src/hooks/`

- **`use-mobile.tsx`** — `useIsMobile()` — true under 768px. Used by `AppShell` and `LayoutGrid` to swap layouts.
- **`use-debounce.ts`** — debounce helper for the layout-save loop and search inputs.

### `supabase/`

- **`config.toml`** — auto-managed project settings (auth providers, email templates). Don't edit project-level fields.
- **`migrations/`** — every SQL migration, timestamped. Together they define the entire schema, RLS policies, and grants. Each migration is immutable — new changes go into new files.

### Files you must **never** touch by hand

- `src/routeTree.gen.ts`
- `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`
- `.env`
- `supabase/config.toml` project-level fields

---

## 9. The Database

All tables live in the `public` schema, all have RLS on, and all user-scoped tables enforce `user_id = auth.uid()`.

| Table | Stores | Who can read/write |
|---|---|---|
| `profiles` | Home location, timezone, units, display name, theme. | Owner only. |
| `user_roles` | User → role (admin, moderator, user). Separate table to prevent privilege escalation. | Owner reads; only admins mutate. |
| `favourite_locations` | Cities the user pinned on the globe. | Owner only. |
| `widget_configs` | Per-user widget list, positions, sizes, settings. | Owner only. |
| `alerts` | Alert rules (metric, threshold, target). | Owner only. |
| `alert_events` | Fired alert history. | Owner only. |
| `automations` | If-this-then-that rules. | Owner only. |
| `automation_runs` | Log of each run. | Owner only. |
| `agents` | Custom AI agent definitions (name, prompt, tools). | Owner only. |
| `agent_runs` | Conversation/tool-call history. | Owner only. |
| `devices` | Registered IoT devices + HMAC secret. | Owner only. |
| `device_readings` | Sensor readings received via webhook. | Owner reads; webhook inserts after HMAC check. |
| `achievements` | Milestones a user has earned. | Owner only. |
| `pulses` | Generated Pulse briefings. | Owner only. |
| `predictions` | Foresight predictions + resolutions. | Owner only. |
| `briefings` | Executive summaries. | Owner only. |
| `shared_dashboards` | Slug → dashboard snapshot. | Owner writes; public reads via `get_shared_dashboard` RPC (no direct SELECT). |
| `personal_milestones` | User-authored life events for Time Machine narration. | Owner only. |
| `calendar_events` | Optional calendar integration cache. | Owner only. |
| `client_errors` | Client-side error reports. | Authenticated users insert their own rows. |
| `provider_cache` | Shared cache of external API responses (key → JSON + TTL). | Server-only (admin client). |

---

## 10. Security Model

- **Auth:** Supabase (email/password + Google OAuth). Sessions are JWTs stored in `localStorage` by the Supabase client.
- **RLS everywhere:** every user table has policies that scope reads/writes to `auth.uid()`. Even if the client code is compromised, the DB refuses to leak.
- **Roles table:** roles live in `user_roles`, never on `profiles`, to prevent trivial privilege escalation. A `SECURITY DEFINER` `has_role()` function is used inside policies.
- **Public shares:** the `shared_dashboards` table has **no** public SELECT policy. Instead, a `SECURITY DEFINER` RPC `get_shared_dashboard(slug)` returns exactly the fields the share page needs.
- **Webhooks:** every `/api/public/hooks/*` endpoint verifies an HMAC-SHA256 signature before doing any work. Bodies are validated with Zod.
- **Server secrets:** `LOVABLE_API_KEY`, HMAC secrets, and the Supabase service role are read from `process.env` **inside** handlers (never at module scope). Service-role secrets are never sent to the browser.
- **Password hardening:** HaveIBeenPwned leaked-password protection is enabled at the auth layer.

---

## 11. External Data Providers

| Provider | Widget / feature | Fallback if it fails |
|---|---|---|
| Open-Meteo | Weather, geocoding | MET Norway (weather), Nominatim (geocoding) |
| MET Norway | Weather fallback | — |
| NASA POWER | Historical weather | — |
| NASA GIBS | Time Machine satellite imagery | Cached tiles |
| NASA APOD | Astronomy Picture of the Day | Cached last image |
| NASA Image Library | Space imagery | — |
| USGS Earthquake API | Quakes (live + history) | Cached |
| Launch Library 2 | Rocket launches | SpaceX legacy |
| CoinGecko | Crypto prices | Cached |
| exchangerate.host | FX rates | Cached |
| GDELT | Historical news for Time Machine | — |
| Hacker News (Algolia) | Tech news | — |
| BBC RSS | World news | — |
| ISS Open Notify / Where the ISS at | ISS position | Cached |
| disease.sh | COVID stats | Cached |

Whenever a provider returns 429/5xx, the server falls back to (a) the alternate provider if one is listed, then (b) the last good `provider_cache` entry marked `stale: true`. The UI shows a "warming up" chip instead of an error.

---

## 12. AI Usage

All AI calls go through the **Lovable AI Gateway** at `https://ai.gateway.lovable.dev/v1/chat/completions` with `Authorization: Bearer $LOVABLE_API_KEY`.

| Feature | Model | Prompt shape |
|---|---|---|
| Pulse | `google/gemini-3.6-flash` | JSON-schema constrained cinematic briefing |
| Oracle | Gemini flash | Threaded chat with world-context system prompt |
| Foresight | Gemini flash | JSON: `{question, probability, horizon, rationale}` |
| Briefing | Gemini flash | Long-form markdown executive summary |
| Agents | Gemini flash | Tool-calling loop with allowed tools per agent |
| Milestone narration | Gemini flash | Short paragraph per personal milestone |

**Rate/cost handling:** 429 = "Rate limit — please try again in a moment." 402 = "AI credits exhausted." All AI functions have a 45-second `AbortSignal.timeout`.

---

## 13. Caching & Reliability

The `provider_cache` table is the shared brain:

- Key = `provider:params-hash`.
- Value = the raw JSON we returned.
- Two timestamps: `fresh_until` and `stale_until`.
- Behavior:
  - **Fresh** → return immediately.
  - **Stale but not expired** → return + trigger a background refresh.
  - **Expired** → fetch live; on failure return the last stale copy with a warning flag.
- **Warmer:** `/api/public/hooks/refresh-widgets` iterates every distinct widget config across all users and refreshes each key so the next visitor never waits.
- **Validation:** empty / null / suspiciously small payloads are rejected before caching, so we never persist a broken response.

This is why the dashboard feels instant even when an external API is rate-limited.

---

## 14. Design System

Defined entirely in `src/styles.css` as CSS variables so both light and dark themes share the same shape.

**Color roles (semantic, never hardcoded in components):** `--background`, `--foreground`, `--card`, `--muted`, `--primary`, `--accent`, `--border`, `--ring`, plus glass tokens `--glass`, `--glass-border`, `--glass-highlight`.

**Liquid glass utilities:**
- `.liquid-glass` — `backdrop-filter: blur(46px) saturate(190%)`, layered highlights, soft border.
- `.widget-surface` — card body with hover lift and specular sheen.
- `.command-bar`, `.sidebar-rail`, `.brand-orb` — themed variants.

**Motion tokens:**
- `--ease-out-quint: cubic-bezier(.22,1,.36,1)` — the standard "fast then settle" curve.
- `--ease-spring: cubic-bezier(.34,1.56,.64,1)` — playful bounce for icons.
- Durations: `--dur-fast: 140ms`, `--dur-base: 220ms`, `--dur-slow: 420ms`.

**Accessibility:** `prefers-reduced-motion` overrides collapse durations. Focus rings are `2px solid var(--ring)` with `2px` offset, only on `:focus-visible`.

**Responsive:** sidebar → bottom nav under 768px; grid drops to single column under 480px; headline sizes use `clamp()`.

---

## 15. Running & Publishing

**In Lovable:** the app is already running. Every save auto-deploys the preview at `id-preview--<project>.lovable.app`. Publish from the UI to push to `omni-globe.lovable.app` (or your custom domain).

**Environment variables:** `.env` is populated automatically by Lovable Cloud with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Server-side, `LOVABLE_API_KEY` is injected at request time by the Cloudflare Worker — never in `.env`.

**Local dev (if you clone it):**
```bash
bun install
bun run dev
```
The dev server binds to port 8080. Because Supabase URLs are baked in via `VITE_*`, the same backend is used locally and in preview.

---

## 16. Glossary for Non-Coders

- **RLS (Row-Level Security):** database rules that say "user A can only see rows where `user_id = A`."
- **Server function:** a function you write once; the framework arranges for it to run on the server even when called from the browser.
- **SSR (Server-Side Rendering):** the server sends fully-rendered HTML on the first request so the page shows up fast.
- **Cache:** a fast copy of a slow answer, kept for a while so we don't ask again.
- **RPC (Remote Procedure Call):** calling a function that runs somewhere else, as if it were local.
- **Webhook:** a URL another system POSTs to when something happens.
- **HMAC:** a signature that proves a message hasn't been tampered with and came from someone who knows a shared secret.
- **JWT (JSON Web Token):** a signed string that proves who you are; the Supabase session is a JWT.
- **Migration:** one SQL file describing a change to the database schema.
- **Zod:** a library that checks incoming data matches an expected shape.
- **Provider:** an external service we pull data from (Open-Meteo, USGS…).
- **DPR (Device Pixel Ratio):** how many real pixels per CSS pixel; capping it on mobile keeps 3D smooth.
- **Brier score:** a way to measure how well-calibrated probabilistic predictions are.

---

## 17. FAQ & Troubleshooting

**A widget shows "warming up" / "cooling down".**
The provider is rate-limiting us. We're serving the last known good value from the cache and will refresh automatically. No action needed.

**Clocks aren't moving.**
Set your timezone in Settings. The clock reads it once per second on the client.

**I can't sign in.**
Email verification is off for the demo, so sign-up should log you in immediately. If Google login errors with "Unsupported provider", the Google provider isn't configured for that environment.

**Pulse says "Rate limit — please try again in a moment".**
The AI gateway is throttling. Wait ~30 seconds and retry.

**The dashboard is empty.**
Click **+ Add widget**. If nothing appears, apply a Preset from `/presets` for a starter kit.

**The globe is blank / slow on mobile.**
Move around — textures load lazily. On very old phones, WebGL 3D may not be available; use another page in the meantime.

**Where is the Supabase dashboard?**
On Lovable Cloud you don't need it — schema and secrets are managed for you. Use `/settings` for user-facing options, and the Lovable UI for platform settings.

---

*Last updated: 2026-07-23. This guide covers OMNISPHERE at the state described in the codebase — routes, tables, components, and providers listed above are the source of truth. If you add a new page, widget, or table, extend the relevant table here.*
