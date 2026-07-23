## Problem

On `/oracle` the header bar ("COMMAND CENTER · Dhaka … · 19:43 UTC") renders **twice**, stacked. Cause:

- `src/routes/_authenticated/route.tsx` already wraps every authenticated child in `<AppShell>` (which renders the header).
- `src/routes/_authenticated/oracle.tsx` **also** wraps its own JSX in `<AppShell>`, so `AppShell` nests inside itself and the header renders twice.

No other authenticated route does this — they render bare content and let the layout provide the shell.

## Fix

Edit `src/routes/_authenticated/oracle.tsx`:
- Remove the `import { AppShell } from "@/components/omni/AppShell"` line.
- Replace the outer `<AppShell> … </AppShell>` in the component with a fragment (or the existing container div) so the page content renders inside the shell provided by `_authenticated/route.tsx`.

## Verification

- Reload `/oracle`; confirm only one header bar is visible.
- Spot-check `/dashboard`, `/globe`, `/pulse` still render normally (they don't use `AppShell` directly, so they're unaffected).

## Files touched

- `src/routes/_authenticated/oracle.tsx` — remove duplicate `AppShell` wrapper.

## Out of scope

No styling, header, or layout changes elsewhere.