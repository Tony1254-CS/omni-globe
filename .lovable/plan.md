## History reliability repair

### Confirmed cause
- `provider_cache` is intentionally server-only, but History currently accesses it with a public backend client.
- Those cache reads and writes are rejected by RLS; the errors are not checked, so History behaves as if no cache exists.
- The database currently contains **zero `history:*` cache rows**. When Open-Meteo returns 429, there is therefore no stale result to serve and the raw provider error reaches the UI.

### Implementation
1. **Repair server-side caching**
   - Use the existing server-only admin client inside `history-data.server.ts` for `provider_cache` reads/writes.
   - Check cache-operation errors rather than silently treating them as misses.
   - Keep stale valid history available beyond the 15-minute freshness window and mark it as cached when served.

2. **Add weather-provider failover**
   - Keep Open-Meteo Archive as the primary historical source.
   - On rate limit, timeout, malformed, or empty data, fetch the same date/location range from NASA POWER.
   - Normalize both providers into the existing chart DTO and cache only validated, non-empty points.

3. **Prevent retry amplification**
   - Do not immediately retry known 429 responses from the client.
   - Make “Try again” invalidate/refetch once through the repaired server fallback path.
   - Present a concise availability message only if primary, fallback, and stale cache all fail.

4. **Verify controls and recovery**
   - Test range and coordinate changes to confirm Apply updates URL state, query keys, labels, and chart data.
   - Test Weather, Crypto, and Earthquake modes independently.
   - Simulate/observe a primary-provider 429 and verify fallback or stale data renders instead of the full-page error.
   - Confirm a successful request creates a valid `history:*` cache row and subsequent requests use it.