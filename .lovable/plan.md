## Problem

`/globe`, `/alerts`, and `/history` are still placeholder "coming in Phase X" screens — they render a single icon + text with no functionality. That's why they appear broken.

## Plan: make all three pages functional

### 1. Globe (`/globe`) — interactive 3D globe
- Add `globe.gl` + `three` as deps.
- New `src/components/omni/GlobeView.tsx`, browser-only via `React.lazy` behind `<ClientOnly>` (Leaflet/globe.gl rule).
- Data layers driven by the existing `getWidgetData` server fn:
  - ISS position (auto-refresh every 5s) — moving marker + orbit ring.
  - Earthquakes (last 24h, USGS) — pulsing points sized by magnitude.
  - Favourite locations from `favourite_locations` table — labeled pins.
- Controls: toggle each layer, auto-rotate on/off, click a point to see a detail popover (place, magnitude, time, link).
- Full-viewport dark canvas with neon glow matching the design system.

### 2. Alerts (`/alerts`) — threshold alerts
- New table `public.alerts` (id, user_id, kind, params jsonb, threshold, comparator, enabled, last_triggered_at, created_at) with RLS `auth.uid() = user_id` and standard grants.
- Server fns in `src/lib/alerts.functions.ts`: `listAlerts`, `createAlert`, `updateAlert`, `deleteAlert`, `evaluateAlerts` (pulls latest values via existing widget-data fetchers, compares, updates `last_triggered_at`, returns fired alerts).
- UI: list of alerts with enable toggle, add-alert dialog with kind picker (Crypto price, Earthquake magnitude, Weather temp, AQI), comparator (`>`, `<`), threshold input, and per-kind params (coin, coordinates, min magnitude).
- Client polls `evaluateAlerts` every 60s while page open; fired alerts show a sonner toast + inline "triggered" badge.

### 3. History (`/history`) — historical charts
- No new tables; use free historical APIs already keyless:
  - Weather: Open-Meteo `archive-api` (`/v1/archive`) for temperature by lat/lon + date range.
  - Crypto: CoinGecko `/coins/{id}/market_chart` for price history.
  - Earthquakes: USGS `query` endpoint filtered by date + min magnitude, shown as a time-bucketed bar chart.
- Extend `widget-data.server.ts` with a `fetchHistory(kind, params)` helper and expose `getHistoryData` server fn (auth-gated, same pattern as `getWidgetData`).
- UI: dataset picker + parameter inputs + date-range slider (default last 30 days). Charts via `recharts` (already common in this stack; add if missing). URL search params (`?kind=&from=&to=&...`) drive state so views are shareable.

### 4. SEO / metadata
- Give each route a route-specific `head()` title + description + og:title/og:description (already partly there; extend to include og:type + twitter:card and unique copy).

## Technical notes
- All data fetches go through authenticated `createServerFn` + `requireSupabaseAuth` (matches existing pattern).
- Errors return `{ error }` shape like `getWidgetData` so pages never blank.
- Loaders on `_authenticated/*` routes are safe (route gate handles auth); use `ensureQueryData` + `useSuspenseQuery`.
- Add `errorComponent` + `notFoundComponent` to each new route.

Ready to build once you approve. Want all three in one pass, or should I ship them one route at a time (Globe first)?
