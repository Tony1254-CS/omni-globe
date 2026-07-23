# Immediate OmniSphere repair

## Confirmed problems
- Every failed provider is rendered through the same generic error panel in `LiveWidget`, which is why Air Quality, APOD, SpaceX, ISS, and other cards look identical instead of retaining their own identity.
- Reddit uses Reddit’s anonymous public JSON endpoint directly; that endpoint commonly blocks/rate-limits server traffic and currently has no alternative feed.
- Several widgets depend on shared anonymous quotas: NASA uses `DEMO_KEY`, GitHub is unauthenticated, and Air Quality has no fallback. One upstream limit can therefore blank multiple cards.
- Provider cooldown state is mostly process-memory state. Successful responses are persisted, but failures without prior cached data still become empty cards.
- Widget content uses `overflow-auto`, creating the prominent native scrollbars visible inside many cards.
- The liquid-glass CSS manually declares the prefixed backdrop property after the standard property. The production CSS optimizer can retain only the prefixed declaration, causing the real blur effect to disappear in Chrome.
- The project still references the default `/favicon.ico`; there is no OmniSphere favicon asset.
- The published “Edit with Lovable” badge is currently visible.

## Implementation

### 1. Stabilize live data providers
- Replace Reddit JSON fetching with a resilient Reddit RSS pipeline, normalize it into the existing post shape, and keep JSON only as a secondary path.
- Add provider-specific fallbacks where practical: Air Quality fallback/last-known snapshot, alternative space/launch feeds, and resilient NASA handling when the demo quota is exhausted.
- Use per-provider request headers, timeout handling, and explicit status classification so blocked, rate-limited, empty, and malformed responses are not treated as the same failure.
- Persist last-known-good responses and cooldown metadata so retries do not hammer providers after restarts and widgets can show stale data instead of an empty error card.
- Avoid duplicate upstream requests for identical provider/settings combinations and validate each provider’s normalized response before caching it.

### 2. Make each widget visibly distinct and useful
- Add widget-specific visual states, icons, accent tokens, compact skeletons, and failure copy rather than one repeated warning layout.
- Preserve last-known content behind a small stale/offline status when a provider temporarily fails.
- Give Reddit a proper ranked-post presentation and each other domain a tailored layout, while keeping the common shell consistent.
- Replace full-card native scrolling with controlled inner content limits, subtle custom overflow treatment only for list widgets, and responsive density based on card dimensions.

### 3. Restore premium liquid glass in production
- Remove manually written vendor-prefixed backdrop declarations so the build pipeline emits correct cross-browser CSS.
- Rework the card material into layered translucent surfaces with a restrained top-edge highlight, depth/refraction, softer shadows, and domain-specific accent lighting.
- Reduce the heavy gray overlays and oversized identical warning blocks shown in the screenshot.
- Keep motion smooth and subtle, with reduced-motion support and no layout shifts during refresh/resize.

### 4. Add OmniSphere brand favicon
- Create a crisp square globe/latitude-longitude OmniSphere mark that remains legible at 16–32px.
- Add the new favicon under a brand-specific filename, update the root head reference, and delete the default Lovable favicon so crawlers cannot continue serving it.

### 5. Remove the published badge
- Set the project’s published badge visibility to hidden. This is already authorized by your request; if the workspace plan does not support hiding it, I will report that limitation precisely rather than pretending it was removed.

### 6. Verify the real experience
- Run lint/build checks.
- Smoke-test every widget type through the authenticated dashboard, including Reddit, weather, AQI, NASA, ISS, SpaceX, finance, news, countries, and GitHub.
- Confirm cards render distinct content or a provider-specific degraded state, no large internal browser scrollbars appear, resizing remains usable, the glass blur survives the production build, and the new favicon is loaded.