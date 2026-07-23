// Forecasting math: no external ML, uses well-known formulas over free APIs.

export type Forecast = {
  headline: string;
  detail: string;
  confidence: number; // 0..1
  method: string;
  source: string;
};

async function json(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "OmniSphere/1.0" }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Provider ${r.status}`);
  return r.json() as Promise<any>;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function forecastWeather(lat: number, lon: number): Promise<Forecast> {
  const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&past_days=14&forecast_days=5&timezone=auto`);
  const maxs: number[] = data?.daily?.temperature_2m_max ?? [];
  const past = maxs.slice(0, 14);
  const future = maxs.slice(14);
  if (past.length < 5 || !future.length) throw new Error("Not enough climate data");
  const mean = past.reduce((a, b) => a + b, 0) / past.length;
  const sd = Math.sqrt(past.reduce((s, n) => s + (n - mean) ** 2, 0) / past.length) || 1;
  let peakIdx = 0, peakDev = 0;
  future.forEach((t, i) => { const d = (t - mean) / sd; if (Math.abs(d) > Math.abs(peakDev)) { peakDev = d; peakIdx = i; } });
  const hours = (peakIdx + 1) * 24;
  const direction = peakDev > 0 ? "heat spike" : "cold snap";
  const conf = clamp(0.5 + Math.abs(peakDev) * 0.15, 0.5, 0.95);
  if (Math.abs(peakDev) < 1) {
    return { headline: "Weather steady", detail: "Next 5 days near 14-day mean.", confidence: 0.7, method: "z-score vs 14-day baseline", source: "Open-Meteo" };
  }
  return {
    headline: `Unusual ${direction} in ~${hours}h`,
    detail: `Peak ${future[peakIdx].toFixed(1)}°C, ${Math.abs(peakDev).toFixed(1)}σ from 14-day mean of ${mean.toFixed(1)}°C.`,
    confidence: conf,
    method: "z-score vs 14-day rolling baseline",
    source: "Open-Meteo",
  };
}

export async function forecastAqi(lat: number, lon: number): Promise<Forecast> {
  const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&forecast_days=2&timezone=auto`);
  const hourly: number[] = data?.hourly?.us_aqi ?? [];
  if (!hourly.length) throw new Error("No AQI forecast");
  const tomorrow = hourly.slice(24, 48);
  const peak = Math.max(...tomorrow);
  const band = peak >= 150 ? "Unhealthy" : peak >= 100 ? "Unhealthy for sensitive groups" : peak >= 50 ? "Moderate" : "Good";
  const advisory = peak >= 100 ? "Limit outdoor exertion." : "No special precautions.";
  return {
    headline: `Peak AQI tomorrow ≈ ${Math.round(peak)} (${band})`,
    detail: advisory,
    confidence: 0.75,
    method: "Open-Meteo hourly forecast, max over 24h",
    source: "Open-Meteo Air Quality",
  };
}

export async function forecastAftershocks(): Promise<Forecast> {
  const feed = await json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
  const events: any[] = feed?.features ?? [];
  const main = events.reduce<any>((best, e) => (!best || (e.properties?.mag ?? 0) > (best.properties?.mag ?? 0) ? e : best), null);
  if (!main || (main.properties?.mag ?? 0) < 4) {
    return { headline: "No significant mainshock", detail: "Highest 24h event below M4 — aftershock forecast not applicable.", confidence: 0.6, method: "Modified Omori's law", source: "USGS" };
  }
  const mag = main.properties.mag as number;
  const hoursSince = Math.max(1, (Date.now() - (main.properties.time as number)) / 3600000);
  // Reasenberg-Jones style estimate: N(≥M') per day ~ 10^(a + b(M - M'))
  const a = -1.67, b = 0.91; const Mprime = 3;
  const dailyRate = Math.pow(10, a + b * (mag - Mprime));
  const next24 = Math.max(0, dailyRate); // rough
  const conf = clamp(0.4 + Math.min(0.4, (mag - 4) * 0.1), 0.4, 0.85);
  return {
    headline: `≈${next24.toFixed(1)} aftershocks M≥3 expected in next 24h`,
    detail: `Mainshock M${mag.toFixed(1)} · ${main.properties.place} · ${hoursSince.toFixed(1)}h ago.`,
    confidence: conf,
    method: "Reasenberg–Jones / Omori",
    source: "USGS",
  };
}

export async function forecastCrypto(coin: string): Promise<Forecast> {
  const data = await json(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin)}/market_chart?vs_currency=usd&days=30&interval=daily`);
  const prices: number[] = (data?.prices ?? []).map((p: [number, number]) => p[1]);
  if (prices.length < 20) throw new Error("Not enough price history");
  // RSI-14
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const window = changes.slice(-14);
  const gains = window.filter((c) => c > 0).reduce((a, b) => a + b, 0) / 14;
  const losses = -window.filter((c) => c < 0).reduce((a, b) => a + b, 0) / 14 || 1e-9;
  const rs = gains / losses;
  const rsi = 100 - 100 / (1 + rs);
  const last = prices[prices.length - 1];
  const first = prices[prices.length - 30] ?? prices[0];
  const monthPct = ((last - first) / first) * 100;
  let headline: string;
  if (rsi >= 70) headline = `Overbought (RSI ${rsi.toFixed(0)}) — reversal signal`;
  else if (rsi <= 30) headline = `Oversold (RSI ${rsi.toFixed(0)}) — potential bounce`;
  else headline = `Neutral momentum (RSI ${rsi.toFixed(0)})`;
  const conf = clamp(0.4 + Math.abs(rsi - 50) / 100, 0.4, 0.85);
  return {
    headline,
    detail: `${coin} · ${monthPct >= 0 ? "+" : ""}${monthPct.toFixed(1)}% over 30 days · last $${last.toFixed(2)}`,
    confidence: conf,
    method: "RSI-14 over daily closes",
    source: "CoinGecko",
  };
}
