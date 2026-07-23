# OMNISPHERE 2.0 — Layers 2‑8 Rollout

Layer 1 (Predictive Intelligence) already shipped. Below is the plan for the rest, scoped to what's realistically buildable on the current stack (TanStack Start + Lovable Cloud + Lovable AI) with no paid third‑party accounts. Anything requiring real hardware/paid APIs is simulated honestly (labelled "demo") rather than faked.

## Layer 2 — Automation & Workflows
- New table `automations` (trigger kind, params, action kind, action params, enabled).
- Trigger kinds reuse the alert evaluator (crypto/weather/AQI/quake/FX threshold, plus "on briefing generated", "on schedule").
- Action kinds: in‑app notification, append to a "journal" table, generate a briefing, toggle a widget setting.
- `pg_cron` job (every 5 min) → `/api/public/hooks/run-automations` (verified via anon key) executes due automations.
- UI: `/automations` route with rule builder (trigger + action pickers) and run history.

## Layer 3 — Collaboration (lightweight)
- Tables: `workspaces`, `workspace_members` (role: owner/editor/viewer), `shared_dashboards` (share a widget layout snapshot via slug).
- Public read‑only route `/s/$slug` renders a snapshot of widgets (data still fetched live, no auth needed for public sources).
- Invite by email = generate share link (no email sending, keeps it keyless).

## Layer 4 — Custom AI Agents
- Table `agents` (name, system_prompt, tools[], schedule).
- Runtime: server fn `runAgent` uses Lovable AI (`google/gemini-3.6-flash`) with tool‑calling over a fixed toolset: `getWidgetData`, `getForecast`, `listAlerts`, `createAlert`, `appendJournal`.
- UI: `/agents` route to create/edit/run agents; results streamed into an activity log.

## Layer 5 — IoT (demo mode)
- Table `devices` + `device_readings`; a public ingest route `/api/public/hooks/device-ingest` accepting `{device_key, metric, value}` with HMAC.
- Ship a "Simulator" panel that pushes synthetic readings so the pipeline works out‑of‑the‑box. Real devices can POST later with the same contract.
- New widget type `iot_device` charts the latest readings.

## Layer 6 — Vertical Modules
Four new dashboard *presets* (one‑click layouts) plus a couple of dedicated widgets each — no new backend beyond what layers 1‑2 provide:
- **Humanitarian**: quakes + ReliefWeb RSS + AQI + weather alerts.
- **Financial**: crypto + FX + market‑anomaly forecast + news.
- **Travel**: weather (multi‑city favourites) + AQI + local time + news.
- **Space**: ISS + launches + NASA APOD + solar/geomagnetic (NOAA SWPC keyless feed).

## Layer 7 — Gamification
- Table `achievements` + `user_achievements`.
- Server‑side awarder runs on key actions (first widget, first alert triggered, first briefing, 7‑day streak, first automation, etc.).
- UI: `/achievements` page + toast on unlock + small streak counter in header.

## Layer 8 — Infrastructure Polish
- Rate‑limit external fetches with an in‑memory token bucket per provider inside `widget-data.server.ts`.
- Cache upstream responses in a `provider_cache` table (short TTL) so widgets survive provider hiccups and reduce load.
- Global error boundary + Sentry‑style client log table (`client_errors`) for debugging.
- Perf: memoise `LiveWidget` renders, virtualise history charts >180 pts.

## Suggested build order (I'll ship in this order unless you say otherwise)
1. Layer 8 caching + rate‑limit first (stabilises everything below).
2. Layer 2 Automations (reuses alert engine, immediate value).
3. Layer 6 Vertical presets (cheap win, big perceived scope).
4. Layer 4 Custom Agents.
5. Layer 7 Gamification.
6. Layer 5 IoT demo.
7. Layer 3 Collaboration (last — most surface area, least critical for a solo user).

## Explicit non‑goals
- No paid APIs, no SMS/email delivery, no real device hardware.
- No mobile app; PWA install stays as a later polish task.
- Voice assistant remains from the original spec and is out of this plan unless you ask.

Say "go" to start with step 1, or tell me to reorder / drop layers.