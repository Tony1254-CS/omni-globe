# OMNISPHERE audit — what's broken and the fix plan

I traced the widget data path (`src/lib/widget-data.server.ts`, `src/components/omni/LiveWidget.tsx`), profile/location flow (`src/lib/profile.functions.ts`, `src/routes/_authenticated/settings.tsx`) and the clocks/AQI rendering. Below is what is actually broken, followed by the exact fixes.

## Findings

### 1. AQI widget
- **Silent zero when `us_aqi` is null.** `current.us_aqi` from Open-Meteo returns `null` for a lot of non-US regions. Renderer does `Number(data.current?.us_aqi ?? 0)` → shows a big "0 / Good" instead of a real reading.
- **Cache-validator rejects valid rows.** `isFinite(Number(null ?? null))` → `false`, so a successful response with only European AQI + pollutants is thrown away and the provider is re-hit until it 429s.
- **No European AQI fallback.** Open-Meteo exposes `european_aqi` that is populated everywhere in EU/UK; we never request it.
- **Pollutant tiles show unit-less numbers** (PM2.5 "7.8" with no µg/m³).
- **Fallback branch keeps hourly values but drops `us_aqi` band-labelling** — same null issue cascades.

### 2. Timezone / clocks
- **Clocks are frozen.** Server returns `now: Date.now()` (cached ≥1 s, client `staleTime: 5 min`, no `refetchInterval`). The card renders that one timestamp — seconds never tick.
- **Global location's timezone is ignored.** `profiles.timezone` is stored (Settings saves it, LocationSearch fills it in) but no widget reads it. Clocks widget only takes a hand-typed comma list.
- **`date()` helper uses browser TZ**, not the profile TZ, so timestamps on quake/space/news cards disagree with the user's selected location.

### 3. Global-location propagation
- Only `weather` and `aqi` honour `useGlobalLocation` + `profile.home_*`. `clocks`, `news`, `covid` (defaults to hard-coded country), `countries`, `mars` do not — users expect "change global location" to move local news/AQI/clock all at once.
- Settings' LocationSearch updates state but the "Save profile" button is required; nothing tells the user that. Fine, but the widgets' per-card LocationSearch writes `timezone` into widget settings that is then unused.

### 4. Units
- Weather widget always renders °C / km·h⁻¹ regardless of `profile.units = imperial`.
- AQI/quake magnitude renderers ignore units too (magnitude is unitless, OK, but wind/temperature aren't).

### 5. Minor
- `WIDGET_STATES` has no entry for `clocks`, `quote`, `covid` → falls back to generic "Live source unavailable" copy.
- `refetchInterval` is only set for `iss`; other real-time-ish widgets (crypto, fx, clocks) never auto-refresh in the tab.

## Fix plan (scoped, no unrelated changes)

**A. AQI correctness**
1. `widget-data.server.ts` › `case "aqi"`: request both `us_aqi,european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`. In the response, compute `primary_aqi = us_aqi ?? european_aqi` and attach `aqi_scale = "US" | "EU"`. Update the hourly fallback identically.
2. Update `isValidPayload` for `aqi` to accept any of: `us_aqi`, `european_aqi`, `pm2_5`, `pm10` finite.
3. `LiveWidget` › `case "aqi"`: read `data.current?.primary_aqi`; when missing, don't render "0 / Good" — render "—" and label from `aqi_scale`. Add units (µg/m³) to `<Metric>` pollutant tiles.
4. Mirror the same field selection in `alerts.server.ts` and `forecast.server.ts` `forecastAqi` (use `european_aqi` fallback so EU users get a curve).

**B. Timezone + clocks**
5. Make the clocks card tick client-side: keep server payload for the zone list, but render `new Date()` inside a `useEffect` interval (1 s) local to the clocks view. Drop the server `now` reliance.
6. Add a "Use my global timezone" toggle in the clocks settings form; when on, prepend `profile.timezone` to the zone list.
7. Replace the shared `date()` helper with a small `formatInTz(value, tz)` and pass `profile.timezone` in from `LiveWidget` for date-heavy widgets (quakes/news/spacex/apod/mars). Fallback to browser TZ if profile missing.

**C. Global-location propagation**
8. Extend `LiveWidget`'s `settings`-merging block: for widgets in `LOCATION_AWARE = {weather, aqi, news, clocks}` inject `{lat, lon, label, timezone}` from profile when `useGlobalLocation !== false`.
9. For `news`, when global location is on, append `&gl=<countryFromTZ>` (derive ISO from `profile.home_label` via a tiny lookup, or from timezone → country map already used by Intl `resolvedOptions`).
10. Show a compact "📍 Home · <label>" chip in cards that are using the global location, so the effect is visible.

**D. Units**
11. Weather renderer respects `profile.units`: convert °C→°F and km/h→mph when `imperial`.
12. Pass `units` through the same profile query already made in `LiveWidget`; broaden its `enabled` to also cover `weather | aqi | news | clocks`.

**E. Small polish**
13. Add `WIDGET_STATES` entries for `clocks`, `quote`, `covid`.
14. Add `refetchInterval` for `crypto` (60 s) and `fx` (5 min).

## Out of scope
- Sidebar/theme/globe/history/pulse/foresight — untouched.
- No DB migrations. All fixes live in `src/lib/widget-data.server.ts`, `src/lib/forecast.server.ts`, `src/lib/alerts.server.ts`, `src/components/omni/LiveWidget.tsx`, and a tiny `src/lib/format.ts` helper for TZ/unit formatting.

## Verification after build
- Load AQI card on London profile → shows a non-zero European AQI + PM values with units.
- Switch profile home to Delhi in Settings → weather, AQI, news and clocks all shift; clocks card lists `Asia/Kolkata` first and ticks every second.
- Toggle `units = imperial` → weather card shows °F/mph.
- Confirm no 429 loops on AQI (validator now accepts EU-only payloads → server cache retains them).
