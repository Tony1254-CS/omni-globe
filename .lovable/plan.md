
## Problems (verified)

1. **Two "Command Center" headers.** `src/routes/_authenticated/route.tsx` wraps `<Outlet />` in `AppShell`, and most child routes (`agents`, `alerts`, `automations`, `achievements`, `devices`, `presets`, `shares`, and likely `dashboard`, `globe`, `briefing`, `history`, `settings`) ALSO wrap their content in `<AppShell>`. Result: shell + header + sidebar render twice, matching the screenshot.
2. **Sidebar bottom cut off.** In `AppShell.tsx` the `<nav>` uses `overflow-hidden` and there is no scroll region. On a 582px-tall viewport, 12 nav items + brand + sign-out don't fit, and the user can't reach Settings / Sign out.
3. **Cards don't feel like liquid glass.** Current `.liquid-glass` is a flat translucent panel with a static specular line. No animated blur, no gradient sheen tracking, no press state, no depth on hover.

## Fix

### 1. Single shell (remove duplicates)
Remove the `<AppShell>` wrapper from every child route file under `src/routes/_authenticated/*.tsx`. Keep it only in `_authenticated/route.tsx` around `<Outlet />`. Files to edit: `dashboard.tsx`, `globe.tsx`, `briefing.tsx`, `alerts.tsx`, `automations.tsx`, `agents.tsx`, `devices.tsx`, `presets.tsx`, `shares.tsx`, `achievements.tsx`, `history.tsx`, `settings.tsx` — replace `<AppShell>…</AppShell>` with the inner content and drop the import.

### 2. Scrollable sidebar
In `AppShell.tsx`:
- Change nav to `flex-1 overflow-y-auto` with thin custom scrollbar hidden until hover.
- Add `max-h-screen` on the aside and switch `inset-y-4` layout so brand stays sticky top, sign-out sticky bottom, nav scrolls between.
- Add a subtle top/bottom fade mask so users see there's more content.

### 3. True Apple-style liquid glass (widget cards)
Rewrite `.liquid-glass` and `.widget-surface` in `src/styles.css`:
- Layered background: base translucent tint + radial highlight in top-left + soft radial shadow in bottom-right, all in `color-mix` with the primary token.
- `backdrop-filter: blur(40px) saturate(180%) brightness(1.05)` with a keyframed shimmer that slowly drifts the highlight (8s ease-in-out infinite, respects `prefers-reduced-motion`).
- Border: 1px gradient border via `border-image` from `oklch(1 0 0 / .35)` to `oklch(1 0 0 / .06)`.
- Inner shadows for the "wet glass" edge: bright inset top, dark inset bottom, plus a faint colored glow ring.
- `.glass-specular::before` becomes a conic/linear sheen that animates position on hover (transform: translateX).
- Hover: lift `translateY(-3px)`, boost blur to 48px, brighten border, add primary-tinted glow.
- Active/press: `scale(0.985)` with reduced shadow — gives the "liquid settling" feel.
- Add a `.liquid-glass-strong` variant for the sidebar/header so the whole system reads consistent.

Apply the same treatment to `.command-bar`, `.sidebar-rail`, and `.liquid-control` so buttons and header share the material.

### 4. Verify
- `bun run build` clean.
- Playwright screenshot of `/dashboard` at 734×582 confirming: one header only, sidebar Settings + Sign out reachable via scroll, widget cards showing the new material and hover lift.

## Out of scope
Widget data reliability, resize logic, and the 429 recovery UI already staged in `LiveWidget.tsx` — untouched this turn.
