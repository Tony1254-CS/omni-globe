
## Goal

1. World Clocks widget shows the correct local time for each zone.
2. AQI widget stops showing "unavailable" and reliably renders a reading.

## 1. World Clocks — wrong time

**Suspected causes (to verify while implementing):**
- `formatTimeInTz` swallows invalid IANA zone names via `catch` and silently falls back to *browser local time*, so a bad zone (e.g. a display name like "India Standard Time" saved in `profile.timezone`, or a stray label) renders as the user's local clock — looks like "the same wrong time for every row".
- `LiveWidget` prepends `profile.timezone` to the zones list for `clocks`; if that value isn't a real IANA zone it poisons every render.
- Server-provided `zones` list is only refreshed every 1s cache TTL but the actual ticking is client-side, so that isn't the cause — good.

**Fix in `src/lib/format.ts`:**
- Add a `isValidTz(tz)` helper that probes `Intl.DateTimeFormat` once and memoises the result.
- `formatTimeInTz` returns `"—"` (not local time) when tz is invalid, so a bad zone is visible instead of masquerading as the right time.
- Also expose a `formatOffsetLabel(tz)` returning e.g. `GMT+5:30` for the clock row subtitle.

**Fix in `src/components/omni/LiveWidget.tsx`:**
- Filter out invalid IANA zones before prepending `profile.timezone` to `clocks` zones.
- `LiveClocks` row shows the resolved offset next to the zone name so wrong entries are obvious and easy to remove.
- Ensure the client `setInterval` uses `Date.now()`-based scheduling that survives tab throttling (align to next second).

## 2. AQI — "Shows unavailable / no reading"

**Root cause:** `hasUsableData` for `aqi` requires one of `us_aqi | european_aqi | pm2_5 | pm10` to be finite. Open-Meteo's `current=` endpoint returns `us_aqi` only inside the US and `european_aqi` only inside Europe; for many locations (India, LATAM, Africa, most of Asia) all four fields can come back `null` at request time, so `assertUsable` throws and the widget flips to the unavailable card. There's a hourly fallback but it queries the same provider with the same regional gaps.

**Fix in `src/lib/widget-data.server.ts` (`case "aqi"`):**
1. Broaden the usability check to accept *any* pollutant field (`pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, `sulphur_dioxide`, `carbon_monoxide`) — a valid PM reading is a valid AQI widget, even without a regional index.
2. When neither `us_aqi` nor `european_aqi` is present but PM2.5 is, compute a **US EPA AQI locally from PM2.5** (standard breakpoint formula) and set `aqi_scale = "US (derived)"`. This gives every location on Earth a number to show.
3. Add a second real fallback provider — **World Air Quality Index (WAQI) public token `demo`** at `https://api.waqi.info/feed/geo:{lat};{lon}/?token=demo` — used only when Open-Meteo returns no pollutants. Map its `aqi` + `iaqi.*` fields into the same shape.
4. Bump `CACHE_VERSION` to `v6` so old empty payloads don't keep the widget stuck.

**Fix in `src/components/omni/LiveWidget.tsx` (`case "aqi"`):**
- Display the derived scale label and a small "based on PM2.5" note when scale is `"US (derived)"`.
- Keep existing band coloring; extend it to accept the derived US value.

## Files touched

- `src/lib/format.ts` — validity helper + offset label, safer fallback.
- `src/components/omni/LiveWidget.tsx` — clocks row shows offset, filters bad zones; AQI shows derived scale note.
- `src/lib/widget-data.server.ts` — AQI usability check, PM2.5→AQI derivation, WAQI fallback, cache bump.

## Out of scope

No changes to profile settings UI, no schema changes, no other widgets.
