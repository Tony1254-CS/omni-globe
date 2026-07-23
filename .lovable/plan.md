
# Premium Polish Pass

Goal: keep the current clean UI, but make it feel Apple-grade — instant, fluid, tactile, and correct on every screen size. No feature changes, no backend changes.

## 1. Motion system (snappy + smooth)

- Add a shared motion token set in `src/styles.css`:
  - `--ease-out-quint: cubic-bezier(.22,1,.36,1)`
  - `--ease-spring: cubic-bezier(.34,1.56,.64,1)`
  - `--dur-fast: 140ms`, `--dur-base: 220ms`, `--dur-slow: 420ms`
- Standardize every transition on these tokens (sidebar, widgets, buttons, dialogs, tabs, popovers).
- Replace long 480–900ms transitions on `.widget-surface` and `.glass-specular` with `--dur-base`/`--dur-slow` so hover feels instant, not draggy.
- Add `will-change: transform` only on hover-lifted elements; remove after transition to keep GPU layers cheap.
- Respect `prefers-reduced-motion` (already partially handled — extend to new tokens).

## 2. Snappiness (perceived speed)

- Enable route preloading: `defaultPreload: "intent"` in `src/router.tsx` (currently only `defaultPreloadStaleTime: 0`) so hovering a sidebar link warms the route + loader.
- Add optimistic hover state to sidebar links and widget cards (translate + shadow within 120ms).
- Add `content-visibility: auto` + `contain-intrinsic-size` to off-screen widget cards for faster scroll/paint on the dashboard.
- Debounce grid layout persistence in `LayoutGrid` (already immediate) → coalesce to 250ms so drag/resize doesn't jank on network writes.
- Add skeleton shimmer that matches final layout dimensions (prevents layout shift when `LiveWidget` resolves).

## 3. Micro-interactions (tactile)

- Buttons: unify `.liquid-control` + `.primary-glass-button` press feedback (scale 0.97, 120ms) and add subtle inner highlight on active.
- Sidebar: icon springs (scale 1.0 → 1.08) on hover with `--ease-spring`; active rail indicator animates height/position instead of hard-swapping.
- Widget cards: hover lift capped at `translateY(-2px)` (currently -3px feels floaty at small sizes); add specular sheen sweep only on pointer:fine devices.
- Tabs / dialogs / popovers: use `animate-in fade-in-0 zoom-in-95` from `tw-animate-css` consistently.
- Focus rings: crisp 2px `--ring` with 2px offset, visible only on `:focus-visible`.

## 4. Responsive behavior

- Dashboard grid: verify breakpoints in `LayoutGrid` — add a proper `xxs` (< 480px) single-column layout, and shrink row height on mobile so widgets stay readable.
- `AppShell` sidebar: on `< 768px`, collapse into a bottom-safe floating pill or slide-over sheet (hover-to-expand doesn't work on touch); use `useIsMobile`.
- Header rows across pages (History, Pulse, Foresight, Oracle, Globe): apply the `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `truncate` pattern from responsive-layout guidance so titles + controls never clip on mobile.
- Command bar: stack vertically under `sm`, full-width inputs.
- Typography: clamp headline sizes (`clamp(1.5rem, 2.5vw, 2.25rem)`) so nothing overflows on 320–420px widths.
- Globe canvas: cap DPR on mobile (`renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`) for smoother frames.

## 5. Performance touch-ups

- Add `loading="lazy"` + `decoding="async"` to any `<img>` outside the viewport (APOD, Mars, share cards).
- Memoize heavy widget renderers (`LiveWidget` body per widget type) to avoid re-render storms on grid drag.
- Ensure Recharts on `/history` uses `ResponsiveContainer` with a fixed aspect ratio to avoid re-measure loops.

## Files touched (frontend/presentation only)

- `src/styles.css` — motion tokens, transition durations, focus/press states, content-visibility, reduced-motion.
- `src/router.tsx` — add `defaultPreload: "intent"`.
- `src/components/omni/AppShell.tsx` — mobile sidebar behavior, spring hover, icon micro-interactions.
- `src/components/omni/LayoutGrid.tsx` — xxs breakpoint, debounced persistence, skeleton sizing.
- `src/components/omni/LiveWidget.tsx` — memoization, lazy media, tighter skeleton.
- `src/components/omni/WidgetShell.tsx` — hover/press polish, will-change hygiene.
- `src/components/omni/GlobeInner.tsx` — DPR cap on mobile.
- Route files (`_authenticated/*.tsx`) — header row responsive pattern; no logic changes.

## Out of scope

- No new features, no data/provider changes, no schema changes, no copy rewrites, no palette changes.
