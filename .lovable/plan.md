# OmniSphere reliability and Liquid Glass rebuild

## 1. Stop provider failures from breaking widgets
- Add a shared server-side provider cache keyed by widget type and normalized settings, so many users/widgets do not repeatedly hit the same public API.
- Deduplicate concurrent requests and assign provider-specific cache windows: short for ISS, moderate for weather/AQI/markets, longer for static and daily sources.
- Handle HTTP 429 correctly: honor `Retry-After`, apply exponential cooldown, stop immediate manual/query retries during cooldown, and serve the last successful cached result marked as stale when available.
- Add independent fallback providers for weather and air quality instead of retrying the same rate-limited host. The current code calls Open-Meteo directly for both cards with no server cache or backoff (`src/lib/widget-data.server.ts:11-27, 51-57`).
- Audit all remaining widget adapters for response-shape drift, rate limits, invalid settings, and unavailable sources; keep honest provider-specific error states when neither fresh nor cached data exists.

## 2. Make widget status and recovery clear
- Replace the generic “Live source unavailable” block with polished states for rate-limited, offline, stale-cache, invalid settings, and empty data.
- Show the next automatic retry time and disable repeated retry clicks during cooldown.
- Preserve last-known data with a subtle “cached” timestamp rather than blanking the entire card.
- Keep global/per-widget location controls and make location status visible on weather and AQI cards.

## 3. Implement the selected Liquid Glass Command design
- Match selected direction v2 using the locked **Graphite Glass** palette (`#0B0D10`, `#242831`, `#E8EDF4`, `#38BDF8`) and existing **Sora + Manrope** typography.
- Rebuild semantic tokens for both dark and light modes with layered translucent tint, strong backdrop blur/saturation, bright inner rim, top-edge specular sheen, dark ambient shadow, and subtle grain/refraction.
- Apply the liquid-glass material consistently to widget cards, command bar, sidebar, dialogs, controls, empty states, and error surfaces—without nesting decorative cards.
- Use restrained cyan only for active, focus, data, and resize feedback; remove the current cheap neon treatment and flat card fill.

## 4. Smooth, stable hover sidebar
- Keep icons perfectly fixed while the rail expands as an overlay, so the workspace never shifts.
- Use a spring-like 500ms width curve, delayed label fade/slide, coordinated active indicator, and softened hover highlights.
- Add a small close delay to prevent flicker when the pointer crosses gaps, plus keyboard focus behavior and reduced-motion support.
- Preserve a compact, usable mobile navigation rather than forcing desktop hover behavior on touch devices.

## 5. Premium asymmetric resizable canvas
- Preserve free drag/resize behavior while giving the workspace an asymmetric 8/4 visual hierarchy: larger primary intelligence widgets and compact supporting cards.
- Keep multi-edge resizing, but replace tiny cyan corner marks with discoverable edge/corner affordances, larger hit targets, live size feedback, and a refined active glass glow.
- Ensure widget internals reflow cleanly at minimum dimensions and do not clip controls or text.

## 6. Verification
- Test every widget adapter through its server function, including fallback, cache, stale data, cooldown, bad settings, and provider error paths.
- Verify sidebar hover/focus animation, light/dark contrast, drag/resize persistence, global location inheritance, and dashboard responsiveness at desktop and mobile widths.
- Run the project’s automated checks and browser smoke tests; confirm there are no console errors, overlapping controls, or failed primary widget flows.