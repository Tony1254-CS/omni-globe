## Goal
Make all 17 catalog widgets genuinely useful. No widget will be presented as available unless it loads real data or clearly explains a missing integration.

## Confirmed problem
The dashboard currently routes every widget type to the same `PlaceholderWidget`, so the catalog advertises capabilities that are not implemented. The widget configuration CRUD exists, but the actual widget content layer does not.

## Implementation plan

1. **Stabilize the dashboard lifecycle**
   - Validate add, list, delete, drag, resize, and automatic layout persistence.
   - Replace fire-and-forget layout saves with a debounced mutation that reports failures and avoids overlapping writes.
   - Add per-widget loading, refresh, stale-data, empty, and retry states so one failed provider never breaks the dashboard.
   - Ensure new widgets are positioned safely without magic coordinates or validation failures.

2. **Build a shared live-data architecture**
   - Add typed server functions and provider adapters; private credentials remain server-side.
   - Add a backend cache for provider payloads, fetch timestamps, expiry, and error status to control rate limits and keep widgets useful during upstream outages.
   - Use scheduled refreshes only where needed; allow safe on-demand refreshes with throttling.
   - Normalize provider errors into user-friendly widget states rather than blank screens or raw exceptions.

3. **Implement the keyless widgets**
   - Earthquakes: USGS feed, magnitude/time filters, latest-event list.
   - ISS Tracker: current coordinates, velocity/altitude where available, last update.
   - SpaceX: next launch, countdown, mission and launch status.
   - World Clocks: configurable time zones with live clocks.
   - Reddit: configurable subreddit and hot-post list using a viable public feed/fallback.
   - Crypto Ticker: selected assets, prices, 24-hour movement, compact trend display.
   - Currency: base/quote selection, conversion, current rate.
   - Country Explorer: search/random country, flag, capital, population, region, map link.
   - GitHub Trending: trending/popular repositories with language and stars using the best available public source or connected GitHub access.
   - Quote of the Day: daily cached quote with attribution.
   - COVID Stats: global/country statistics with source timestamp and graceful handling if the upstream dataset is retired.

4. **Implement credential-backed widgets**
   - Weather: location search, current conditions, forecast, unit preference.
   - Air Quality: AQI category, pollutants, health guidance, selected location.
   - News: top headlines, country/category/keyword filtering, source links.
   - Astronomy Picture of the Day: media, title, date, explanation, source link.
   - Mars Rover: rover/camera/date controls and real photo results.
   - Near-Earth Objects: upcoming approaches, size, distance, velocity, hazard status.
   - First check existing project connections and securely stored credentials; only request provider credentials that are actually missing, using the secure secret flow.

5. **Add widget settings and real rendering**
   - Replace `PlaceholderWidget` dispatch with a typed widget registry mapping every catalog type to its real component.
   - Add a settings action to each widget for location, symbols, currencies, time zones, country, subreddit, filters, and refresh preferences as applicable.
   - Persist settings in each widget’s existing configuration record and validate them server-side.
   - Show data source and “updated at” information without exposing implementation details.

6. **Make availability honest**
   - During implementation, mark unfinished or credential-blocked widgets as unavailable instead of allowing users to add fake widgets.
   - Once complete, every enabled catalog item must have a real renderer, real data path, useful empty state, and retry behavior.

7. **Verify end-to-end**
   - Test all 17 widgets independently and together on the dashboard.
   - Verify add/remove/settings persistence, refresh, drag/resize persistence, hard reload, provider failure, expired cache, and signed-out behavior.
   - Check desktop and the current narrow viewport for clipping, overlapping controls, and unreadable widget content.
   - Confirm route metadata remains complete and run the relevant security/database checks after backend changes.

## Technical boundaries
- App-internal data access will use authenticated TanStack server functions.
- Scheduled external refreshes will use secured public server routes plus backend scheduling, not browser polling.
- User-owned settings remain protected by row-level access rules; shared cached provider data exposes only safe public payloads.
- API keys will never be stored in frontend code or widget settings.