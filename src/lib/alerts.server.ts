type AlertRow = {
  id: string;
  kind: string;
  comparator: "gt" | "lt";
  threshold: number;
  params: Record<string, unknown> | null;
  label: string;
};

export type AlertEvaluation = {
  id: string;
  label: string;
  value: number | null;
  triggered: boolean;
  error?: string;
};

async function json(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OmniSphere/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Provider ${res.status}`);
  return res.json() as Promise<any>;
}

const num = (v: unknown, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

async function readValue(row: AlertRow): Promise<number | null> {
  const p = row.params ?? {};
  switch (row.kind) {
    case "crypto": {
      const coin = str(p.coin, "bitcoin").toLowerCase().replace(/[^a-z0-9-]/g, "");
      const data = await json(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
      return data?.[coin]?.usd ?? null;
    }
    case "weather": {
      const lat = num(p.lat, 0);
      const lon = num(p.lon, 0);
      const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
      return data?.current?.temperature_2m ?? null;
    }
    case "aqi": {
      const lat = num(p.lat, 0);
      const lon = num(p.lon, 0);
      const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
      return data?.current?.us_aqi ?? null;
    }
    case "earthquake": {
      const data = await json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
      const mags: number[] = (data.features ?? []).map((f: any) => Number(f.properties?.mag)).filter((n: number) => Number.isFinite(n));
      return mags.length ? Math.max(...mags) : null;
    }
    case "fx": {
      const base = str(p.base, "USD").toUpperCase().slice(0, 3);
      const quote = str(p.quote, "EUR").toUpperCase().slice(0, 3);
      const data = await json(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
      return data?.rates?.[quote] ?? null;
    }
    default:
      return null;
  }
}

export async function evaluateAllAlerts(rows: AlertRow[]): Promise<AlertEvaluation[]> {
  return Promise.all(rows.map(async (row) => {
    try {
      const value = await readValue(row);
      const triggered = value !== null && (row.comparator === "gt" ? value > row.threshold : value < row.threshold);
      return { id: row.id, label: row.label, value, triggered };
    } catch (err) {
      return { id: row.id, label: row.label, value: null, triggered: false, error: err instanceof Error ? err.message : "failed" };
    }
  }));
}
