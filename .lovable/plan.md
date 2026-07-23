# OMNISPHERE reliability and premium redesign

## 1. Fix the broken functionality first
- Repair the globe initialization so missing or delayed orbit controls cannot crash the page; make initialization, resize, cleanup, auto-rotate, texture loading, and data-layer failures defensive.
- Move the earthquake globe feed behind the existing authenticated server data path instead of relying on a browser-side third-party request.
- Audit every widget provider and renderer together, including returned `error` payloads, empty/changed response shapes, provider rate limits, invalid user settings, image failures, and unsupported data.
- Show explicit retryable source errors instead of presenting failed responses as “No current data.”
- Add resilient fallbacks/caching where public APIs are unreliable, and verify all 17 catalog widgets individually.

## 2. Make widget resizing genuinely usable
- Replace the nearly invisible southeast-only resize affordance with clear custom edge/corner handles that appear on hover/focus and work from supported directions.
- Relax the current restrictive minimum dimensions per widget while enforcing sensible type-specific minimums so content remains usable.
- Keep drag limited to the widget header, prevent settings/buttons from initiating drag, and persist width/height after resize.
- Add a short resize-state treatment—focused border, live dimensions, smooth settle animation—and support keyboard-accessible preset sizes where practical.
- Verify move, resize, reload persistence, compacting, and narrow-screen behavior.

## 3. Add global and per-widget location controls
- Add a searchable city/location picker using a keyless geocoding source; selecting a result stores label, latitude, longitude, and timezone.
- Add a global default location in Settings and expose the current location in the command bar.
- Weather and Air Quality widgets inherit the global location by default and can opt into a per-widget override from their settings.
- Reuse the saved global location for other location-aware experiences and keep manual coordinates as an advanced fallback, not the primary UX.

## 4. Build the selected Premium Apple Glass direction
- Implement the chosen “Premium Apple Glass” composition using the locked Obsidian Glass palette: `#08090B`, `#17191D`, `#E8EDF2`, `#36C5F0`.
- Load Sora for headings and Manrope for interface/body text.
- Preserve the left 64px navigation rail and its hover/focus expansion, but rebuild it with polished smoked-glass depth, precise icon alignment, stronger active states, and scroll-safe navigation.
- Recompose the dashboard as a coherent bento control room rather than the current sparse staggered columns, while preserving users’ draggable saved layouts.
- Replace the current neon/radial-heavy treatment with restrained translucent surfaces, fine keylines, inner highlights, layered shadows, and disciplined cyan status accents in both dark and light themes.
- Keep card radii controlled and avoid decorative orbs, purple gradients, nested-card clutter, and hardcoded component colors.

## 5. Add premium motion without hurting usability
- Add subtle spring sidebar expansion, staged dashboard entrance, glass hover refraction, widget lift/focus, resize feedback, and smooth bento settling.
- Keep motion short and functional; disable nonessential effects under `prefers-reduced-motion`.
- Stabilize the UTC clock/client-rendered values to avoid hydration mismatches.

## 6. Validate the complete experience
- Run targeted checks for globe initialization, each widget’s successful and failed states, settings persistence, global/per-widget location inheritance, theme persistence, and resize persistence.
- Use browser-driven desktop and mobile verification to confirm no sidebar overlap, clipped text, blank WebGL canvas, unusable controls, or widget collisions.
- Confirm all content routes retain unique metadata and report any larger unfinished product features separately from this repair/redesign scope.