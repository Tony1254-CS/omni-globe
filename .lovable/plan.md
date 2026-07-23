## Widget reliability repair

The screenshot is accurate: several cards still do not have usable data. The backend cache confirms the main defects:
- SpaceX is stored as a successful `live` result even though its cached payload is `null`, so the card renders blank.
- Air Quality has no successful warmed cache row.
- Warmed cache keys do not match many real widget settings (for example custom locations and `useGlobalLocation`), so the global warmer does not help those cards.
- The “Reddit” card is actually Hacker News data but is still labelled and configured as Reddit.
- APOD data in the database is now valid, but the UI needs to sanitize legacy feed markup and handle image/text layouts safely.
- The refresh endpoint exists, but creating an endpoint alone does not guarantee regular refreshes.

### Implementation
1. **Reject empty provider responses**
   - Add per-widget payload validation before any response is marked `live` or written to cache.
   - Treat `null`, empty launch lists, empty article lists, and missing required fields as provider failures.
   - Never overwrite a valid stale cache entry with an empty response.

2. **Fix each broken card shown**
   - Air Quality: add a reliable local fallback derived from weather/air components when the primary air-quality endpoint fails.
   - SpaceX: normalize both launch providers correctly and add a stable upcoming-launch fallback; require a launch name and date before caching.
   - Near-Earth Objects: add a keyless NASA small-body fallback and validate that objects exist.
   - APOD: sanitize encoded HTML, preserve readable plain text, and correctly distinguish image/video media.
   - News: keep a real news fallback rather than silently presenting technology-only stories as world news.
   - Community feed: rename the current Hacker News-backed “Reddit” widget to “Community News” throughout the picker, settings, card header, and source text so the UI is honest.

3. **Make cache keys reusable**
   - Canonicalize settings by widget type, excluding presentation-only fields such as `label` and `useGlobalLocation`.
   - Key location widgets by rounded coordinates so equivalent location settings share cache.
   - Warm the actual distinct widget configurations currently saved by users, not only a hard-coded London/default list.

4. **Make refresh dependable**
   - Add stale-while-revalidate behavior that attempts refresh while always retaining the last valid payload.
   - Trigger a guarded warm-up when a cold cache is encountered, with request deduplication to prevent rate-limit bursts.
   - Protect the public refresh route with a server secret before it can perform provider-wide refreshes.

5. **Improve card recovery states**
   - Show skeletons only during a genuine first load.
   - Show cached content with a small freshness badge when upstream data is unavailable.
   - For a first-load failure, show the exact source status and an enabled retry action rather than a generic permanent “warming up” message.
   - Ensure empty data never renders as a visually blank card.

6. **Verify the dashboard end to end**
   - Test Air Quality, Astronomy, Community News, SpaceX, Near-Earth Objects, and News with the saved configurations visible in the screenshot.
   - Confirm every card displays meaningful content, refreshes without duplicate provider calls, survives an upstream failure using valid cached data, and remains usable at the current compact widget sizes.