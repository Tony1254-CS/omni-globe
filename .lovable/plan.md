
# Global Time Machine — v1

Turn the existing `/globe` page into a scrubbable time portal. Ships the interactive timeline, historical layers, personal milestone narration, and NASA GIBS satellite imagery. The 1‑minute cinematic video reel is a follow‑up.

## What ships

1. **Timeline scrubber** across the bottom of the globe — spans ~50 years (1975 → today) down to the day. Play/pause, speed control (1x/7x/30x/365x), and a date-picker jump. When paused the globe reflects that exact date.
2. **Historical layers on the globe**, all wired to the date:
   - **NASA GIBS satellite basemap** — swap the current night-lights texture for a dated true-color tile layer (MODIS Terra `CorrectedReflectance_TrueColor`, daily since 2000; night-lights fallback before 2000).
   - **Earthquakes** — USGS historical query for that day (M4.5+), rendered as pins with magnitude-scaled glow.
   - **ISS ground track** — for post‑1998 dates, computed from cached TLEs via `satellite.js` (already-buildable, no extra API).
   - **News headlines** — top 5 world headlines from that day via GDELT Doc API (keyless, goes back to 2015; older dates gracefully show "no headline data").
3. **Personal milestone overlay** — user adds milestones (birthday, graduation, wedding, etc.) in Settings. Clicking one flies the globe to that date and shows an AI‑narrated card: *"On July 4 2000, an M5.2 struck Japan, Cairo hit 32°C, and the ISS was over Madagascar."* Uses `google/gemini-3.6-flash` via the existing Lovable AI Gateway helper.
4. **"On this day" tray** — collapsible panel showing the top event, quake, and headline for the currently selected date, so the timeline is useful without hunting on the globe.

The video reel, causal oracle, and calendar orchestration are explicitly out of scope for this plan.

## How it fits the existing app

- Extends `src/routes/_authenticated/globe.tsx` + `src/components/omni/GlobeInner.tsx` — no new page.
- Adds one table `personal_milestones` (user_id, label, occurred_at, kind) with the standard grants + RLS + `has_role`-style policies used elsewhere.
- Adds one server-function module `src/lib/timemachine.functions.ts` (all data fetches go here so the browser never calls providers directly). Reuses the existing `provider_cache` table for GIBS availability and GDELT results, with the same 429/backoff pattern already in `widget-data.server.ts`.
- Narration goes through the existing gateway helper (`createLovableAiGatewayProvider`) inside a server fn — no new secrets.

## Technical notes

- **GIBS tiles**: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{YYYY-MM-DD}/{tileMatrixSet}/{z}/{y}/{x}.jpg`. Loaded into `globe.gl` via `.globeImageUrl()` on date change; debounce swaps to avoid tile thrash while scrubbing.
- **Timeline component**: shadcn `Slider` + a canvas density strip behind it showing quake counts per month (fetched once, cached) so the scrubber looks alive.
- **Scrub debouncing**: while dragging, only update the "On this day" tray text; commit globe layer swaps on release or every 250ms of stillness.
- **Graceful gaps**: GIBS MODIS starts 2000‑02‑24, GDELT 2015, USGS 1900. Each layer independently degrades and shows a small "not available before YYYY" chip.

## Files touched

```text
supabase/migrations/  → personal_milestones table + grants/RLS
src/lib/timemachine.server.ts        (new — GIBS URL builder, USGS/GDELT fetchers with cache)
src/lib/timemachine.functions.ts     (new — server fns: getDaySnapshot, narrateMilestone, listMilestones, addMilestone, deleteMilestone)
src/components/omni/TimelineScrubber.tsx  (new)
src/components/omni/OnThisDayTray.tsx     (new)
src/components/omni/MilestoneNarration.tsx (new)
src/components/omni/GlobeInner.tsx   (edit — accept `date` prop, swap GIBS layer, filter quakes/ISS by date)
src/routes/_authenticated/globe.tsx  (edit — timeline state, tray, milestone list)
src/routes/_authenticated/settings.tsx (edit — Personal Milestones section)
```

## Explicit non-goals (follow-ups)

- Auto-generated "Your World, Your Day" 1‑minute video reel.
- Causal Oracle AI (Feature 2).
- Symbiotic orchestration + Google Calendar (Feature 3).
