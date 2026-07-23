
# Plan — Shell polish + feature audit

## 1. Sidebar: collapse by default, expand on hover

Rework `src/components/omni/AppShell.tsx`:
- Sidebar stays fixed on the left but at `w-16` (icon‑only) by default and expands to `w-60` on `hover`/`focus-within` using a CSS transition (`group` + `group-hover:w-60`).
- Labels fade in only when expanded; icons always visible. Active route still highlighted.
- Push main content with a matching left margin (`ml-16`) so the expanded panel floats over content without reflowing (prevents jumpy layout).
- Mobile bottom nav stays as‑is.

## 2. Light / Dark mode

- Add `ThemeProvider` (`src/components/theme-provider.tsx`) that toggles the `dark` class on `<html>` and persists to `localStorage` (`omnisphere-theme`), reading it inside `useEffect` to avoid SSR hydration mismatch. Default = dark.
- Add `ThemeToggle` button (sun/moon icon) in the `AppShell` header.
- Extend `src/styles.css`: the current `:root` tokens become the dark palette (already dark‑first). Add a light palette under `:root:not(.dark)` (or move dark tokens under `.dark`) — light background near `oklch(0.98 0.005 250)`, dark foreground, softer glass, muted neon accents. Keep neon tokens identical so brand stays consistent.
- Wrap the app in `ThemeProvider` in `src/routes/__root.tsx`.

## 3. Widget resizing

`src/components/omni/LayoutGrid.tsx` currently omits `isResizable`, so RGL default (true) applies but no resize handle CSS is guaranteed and `WidgetShell` overflow may clip it. Fix:
- Pass `isResizable`, `resizeHandles: ['se']`, and ensure `react-resizable/css/styles.css` is already imported (it is).
- In `src/components/omni/WidgetShell.tsx`, drop `overflow-hidden` on the outer container (keep inner scroll) so the SE handle isn't clipped; add a subtle styled handle (`.react-resizable-handle` override in `styles.css`) matching the neon theme.
- Ensure `saveLayout` already persists `w`/`h` (it does).

## 4. Feature audit — what's actually done vs missing

From `.lovable/plan.md` (Layers 2–8) and current tree:

Done and wired:
- Layer 1 Predictive Intelligence (anomaly badges, forecasts, briefing).
- Layer 2 Automations (table + cron hook + `/automations`).
- Layer 3 Collaboration — `shared_dashboards` + `/shares` + `/s/$slug` public view. Workspaces/members NOT built.
- Layer 4 Custom Agents (`/agents`, tool‑calling).
- Layer 5 IoT demo (`/devices`, HMAC ingest). Missing: `iot_device` widget type in `widget-data.server.ts` / `LiveWidget`.
- Layer 6 Vertical presets (`/presets`).
- Layer 7 Gamification (`/achievements`). Missing: unlock toast + header streak counter.
- Layer 8 Infra polish: tables exist (`provider_cache`, `client_errors`), but `widget-data.server.ts` does NOT yet use `provider_cache` or a rate‑limit token bucket. No global error boundary logging into `client_errors`. `LiveWidget` not memoised, history charts not virtualised.

This turn implements only 1–3 above (UI/shell scope). The audit in section 4 is reported so you can pick the next batch — I won't start those without your say‑so.

## Technical notes

- Theme class on `<html>`: apply pre‑hydration via a tiny inline script in `__root.tsx` head to avoid a flash of dark on light preference.
- Sidebar hover: pure CSS (`group` + `peer` + transitions), no JS state — keeps SSR stable.
- Resize handle styling lives as an `@utility` or plain selector in `styles.css` so it themes with tokens.
