## History repair plan

### 1. Make the controls reliable
- Move dataset, date range, coordinates, coin, and magnitude into validated URL search parameters so selections persist and navigation/refetches are deterministic.
- Replace continuous requests while dragging/typing with draft controls plus an explicit **Apply** action; show a clear updating state and disable Apply until values change.
- Validate latitude, longitude, coin ID, magnitude, and date range; add **Reset** and retry behavior.

### 2. Add actual personal history
- Add an authenticated history server function that reads the signed-in user’s existing records from:
  - alert triggers/checks
  - automation runs
  - AI agent runs
  - device readings
  - journal entries
  - personal milestones
  - widget creation/updates
- Normalize these records into a chronological activity feed with category filters, date range, status, title, summary, and timestamp.
- Keep all reads user-scoped through the existing authenticated backend and row-level access rules; no schema change is required.

### 3. Rebuild the History screen
- Add two clear views:
  - **My Activity** — real personal timeline with summary counters and useful empty states.
  - **Global Trends** — existing weather, crypto, and earthquake charts with repaired controls.
- Use distinct timeline/event visuals by category instead of presenting every record identically.
- Keep charts responsive and display the active source, selected range, point count, and last refresh time.

### 4. Harden external trend data
- Validate provider payloads before rendering.
- Add bounded caching and graceful fallback/error states so one unavailable provider does not make the whole History page appear broken.
- Ensure weather, crypto, and earthquake requests use the applied control values and visibly update the chart/source metadata.

### 5. Verify end to end
- Test all three global datasets with changed controls and confirm the plotted data/request parameters change.
- Test personal history with available user records and confirm filters/date range work.
- Verify loading, empty, provider-error, retry, desktop, and current mobile viewport states.