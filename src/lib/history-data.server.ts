type Params = Record<string, string | number | boolean | null>;
export type HistoryResult = {
  kind: string;
  source: string;
  series: Array<{ t: string; v: number }>;
  unit?: string;
  error?: string;
};

const num = (v: unknown, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

async function json(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OmniSphere/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Provider ${res.status}`);
  return res.json() as Promise<any>;
}

function clampDays(v: unknown, def: number, max: number) {
  const n = Math.round(num(v, def));
  return Math.max(1, Math.min(max, n));
}

export async function fetchHistory(kind: string, params: Params): Promise<HistoryResult> {
  const days = clampDays(params.days, 30, 365);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  switch (kind) {
    case "weather": {
      const lat = num(params.lat, 51.5072);
      const lon = num(params.lon, -0.1276);
      const data = await json(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${iso(start)}&end_date=${iso(end)}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
      const times: string[] = data?.daily?.time ?? [];
      const max: number[] = data?.daily?.temperature_2m_max ?? [];
      const min: number[] = data?.daily?.temperature_2m_min ?? [];
      const series = times.map((t, i) => ({ t, v: (Number(max[i]) + Number(min[i])) / 2 }))
        .filter((p) => Number.isFinite(p.v));
      return { kind, source: "Open-Meteo Archive", series, unit: "°C" };
    }
    case "crypto": {
      const coin = str(params.coin, "bitcoin").toLowerCase().replace(/[^a-z0-9-]/g, "");
      const data = await json(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${Math.min(days, 365)}&interval=daily`);
      const series = (data.prices ?? []).map((p: [number, number]) => ({
        t: new Date(p[0]).toISOString().slice(0, 10),
        v: p[1],
      }));
      return { kind, source: "CoinGecko", series, unit: "USD" };
    }
    case "earthquakes": {
      const minMag = Math.max(0, Math.min(10, num(params.minMagnitude, 4.5)));
      const usgsDays = Math.min(days, 30);
      const usgsStart = new Date(end.getTime() - usgsDays * 86400000);
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${iso(usgsStart)}&endtime=${iso(end)}&minmagnitude=${minMag}&orderby=time`;
      const data = await json(url);
      const buckets = new Map<string, number>();
      for (const f of data.features ?? []) {
        const t = f.properties?.time;
        if (!t) continue;
        const day = new Date(t).toISOString().slice(0, 10);
        buckets.set(day, (buckets.get(day) ?? 0) + 1);
      }
      const series = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v }));
      return { kind, source: "USGS", series, unit: "events / day" };
    }
    default:
      throw new Error("Unsupported history kind");
  }
}
