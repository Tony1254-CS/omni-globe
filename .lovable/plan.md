# OMNISPHERE 2.0 — Layer 1: Predictive Intelligence

Adds an AI-powered "Insights" layer on top of the existing widgets. All using free/keyless data sources + Lovable AI. No new paid dependencies.

## What ships

### 1. Anomaly Detection Engine
- New shared helper that scores each widget's current data against a rolling baseline (z-score for numeric series, magnitude/threshold rules for events).
- Rules per widget type:
  - **Earthquakes**: flag events > 2σ above 30-day magnitude mean, or in low-seismicity regions.
  - **Crypto**: flag 24h change > 2σ vs 30-day volatility.
  - **AQI**: flag jumps > 50 vs 24h mean, or crossing WHO thresholds.
  - **Weather**: flag temp/wind > 2σ vs seasonal norm from Open-Meteo climate endpoint.
  - **ISS / SpaceX / news**: no anomaly score (event-based).
- Each `LiveWidget` gets an **Attention Score** badge (green/amber/red) computed client-side from the fetched data. Red widgets glow with a neon pulse ring.

### 2. Forecasting
- Uses providers we already query — no new keys:
  - **Weather anomaly**: Open-Meteo already returns 5-day forecast; compare vs climate normals → "Unusual cold snap in 72h — 87% confidence".
  - **Aftershocks**: apply Omori's law (`p(t) = K/(t+c)^p`) to recent mainshock → "≈4 aftershocks M≥3 expected next 24h". Pure math, no ML training.
  - **Crypto reversal**: RSI + MACD crossover from CoinGecko history → "Momentum weakening, reversal signal (62% conf)".
  - **AQI tomorrow**: Open-Meteo air-quality forecast endpoint (already available) with health-band advisory.
- Confidence is derived, not fabricated (variance-based). Every forecast card shows source + method.

### 3. Daily "Executive Briefing" (in-app, on demand)
- New route `/_authenticated/briefing` and a dashboard card with a "Generate briefing" button.
- Server function collects:
  - User favourite locations (weather + AQI snapshots)
  - Current widget snapshots on their dashboard
  - Top anomalies from the anomaly engine
  - Top 5 headlines from their news/reddit widgets
- Passes the compact snapshot to Lovable AI (`google/gemini-3.6-flash`) with a strict system prompt: "2-page executive briefing — key world events, weather risks, financial shifts, space milestones. Prioritise the user's watched locations and topics."
- Rendered in-app with `react-markdown`. "Copy" and "Download as .md" buttons. Cached in a new `briefings` table so re-opening the page shows the last one instantly.

## Where things live

```text
src/lib/
  anomaly.ts                    # pure scoring functions, no I/O
  forecast.server.ts            # aftershock/RSI/climate normals math
  forecast.functions.ts         # getForecast server fn
  briefing.server.ts            # snapshot collector + AI call
  briefing.functions.ts         # generateBriefing, listBriefings

src/components/omni/
  AttentionBadge.tsx            # green/amber/red pill + tooltip
  ForecastCard.tsx              # forecast rendering (in LiveWidget footer)
  BriefingView.tsx              # markdown briefing UI

src/routes/_authenticated/
  briefing.tsx                  # new route, dashboard nav item
```

Modified: `LiveWidget.tsx` (mount anomaly badge + forecast footer where relevant), `AppShell.tsx` (add "Briefing" nav item), `dashboard.tsx` (add briefing shortcut card).

## Backend

One migration:

```sql
CREATE TABLE public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own briefings" ON public.briefings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

`LOVABLE_API_KEY` is already provisioned — no user action needed.

## Explicitly out of scope this iteration
- What-If simulator (Layer 1 item 3) — deferred; needs a UI surface we'll design after briefing lands.
- Scheduled/email/voice briefing delivery (needs email domain setup + TTS budget).
- Everything in Layers 2–8.

## Verification
- Playwright: open dashboard → verify red badge appears when a synthetic quake/crypto value is out-of-band; open `/briefing` → click generate → assert markdown renders with the user's location names in it.
