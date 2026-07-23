import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type HistoryKind = "weather" | "crypto" | "earthquakes";
export type HistoryPoint = { t: string; value: number; secondary?: number; label?: string };
export type HistoryResult = { kind: HistoryKind; title: string; subtitle: string; source: string; points: HistoryPoint[]; fetchedAt: string; cached: boolean };
type HistoryParams = { kind: HistoryKind; days: number; lat: number; lon: number; coin: string; magnitude: number };

const allowedCoins = new Set(["bitcoin", "ethereum", "solana"]);

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "OmniSphere/2.0" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`History provider returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const compactDate = (date: Date) => isoDate(date).replaceAll("-", "");

function clean(input: HistoryParams): HistoryParams {
  return { kind: input.kind, days: Math.max(1, Math.min(365, Math.round(input.days))), lat: Math.max(-90, Math.min(90, input.lat)), lon: Math.max(-180, Math.min(180, input.lon)), coin: allowedCoins.has(input.coin) ? input.coin : "bitcoin", magnitude: Math.max(1, Math.min(9, input.magnitude)) };
}

function assertUsable(result: HistoryResult) {
  if (!result.points.length || result.points.some((point) => !point.t || !Number.isFinite(point.value))) throw new Error("History provider returned no usable data");
  return result;
}

async function fetchFresh(params: HistoryParams): Promise<HistoryResult> {
  if (params.kind === "weather") {
    const end = new Date(); end.setUTCDate(end.getUTCDate() - 5);
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - params.days + 1);
    try {
      const payload = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?latitude=${params.lat}&longitude=${params.lon}&start_date=${isoDate(start)}&end_date=${isoDate(end)}&daily=temperature_2m_max,temperature_2m_min&timezone=UTC`) as { daily?: { time?: string[]; temperature_2m_max?: Array<number | null>; temperature_2m_min?: Array<number | null> } };
      const points = (payload.daily?.time ?? []).flatMap((t, index) => typeof payload.daily?.temperature_2m_max?.[index] === "number" ? [{ t, value: payload.daily.temperature_2m_max[index] as number, secondary: typeof payload.daily?.temperature_2m_min?.[index] === "number" ? payload.daily.temperature_2m_min[index] as number : undefined }] : []);
      return assertUsable({ kind: params.kind, title: "Temperature history", subtitle: `${params.lat.toFixed(2)}°, ${params.lon.toFixed(2)}° · daily high / low`, source: "Open-Meteo Archive", points, fetchedAt: new Date().toISOString(), cached: false });
    } catch {
      const payload = await fetchJson(`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN&community=AG&longitude=${params.lon}&latitude=${params.lat}&start=${compactDate(start)}&end=${compactDate(end)}&format=JSON`) as { properties?: { parameter?: { T2M_MAX?: Record<string, number>; T2M_MIN?: Record<string, number> } } };
      const maximums = payload.properties?.parameter?.T2M_MAX ?? {};
      const minimums = payload.properties?.parameter?.T2M_MIN ?? {};
      const points = Object.entries(maximums).flatMap(([date, maximum]) => Number.isFinite(maximum) && maximum > -900 ? [{ t: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`, value: maximum, secondary: Number.isFinite(minimums[date]) && minimums[date] > -900 ? minimums[date] : undefined }] : []);
      return assertUsable({ kind: params.kind, title: "Temperature history", subtitle: `${params.lat.toFixed(2)}°, ${params.lon.toFixed(2)}° · daily high / low`, source: "NASA POWER", points, fetchedAt: new Date().toISOString(), cached: false });
    }
  }
  if (params.kind === "crypto") {
    const payload = await fetchJson(`https://api.coingecko.com/api/v3/coins/${params.coin}/market_chart?vs_currency=usd&days=${params.days}&interval=daily`) as { prices?: Array<[number, number]> };
    const points = (payload.prices ?? []).flatMap(([timestamp, price]) => Number.isFinite(price) ? [{ t: new Date(timestamp).toISOString(), value: Number(price.toFixed(2)) }] : []);
    return assertUsable({ kind: params.kind, title: `${params.coin[0]?.toUpperCase()}${params.coin.slice(1)} price`, subtitle: `${params.days}-day USD close`, source: "CoinGecko", points, fetchedAt: new Date().toISOString(), cached: false });
  }
  const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - Math.min(params.days, 30));
  const payload = await fetchJson(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${isoDate(start)}&endtime=${isoDate(end)}&minmagnitude=${params.magnitude}&orderby=time&limit=500`) as { features?: Array<{ properties?: { time?: number; mag?: number; place?: string } }> };
  const points = (payload.features ?? []).flatMap((feature) => typeof feature.properties?.time === "number" && typeof feature.properties?.mag === "number" ? [{ t: new Date(feature.properties.time).toISOString(), value: feature.properties.mag, label: feature.properties.place ?? "Recorded event" }] : []).sort((a, b) => a.t.localeCompare(b.t));
  return assertUsable({ kind: params.kind, title: "Earthquake activity", subtitle: `M${params.magnitude.toFixed(1)}+ · last ${Math.min(params.days, 30)} days`, source: "USGS Earthquake Hazards Program", points, fetchedAt: new Date().toISOString(), cached: false });
}

export async function fetchHistory(input: HistoryParams): Promise<HistoryResult> {
  const params = clean(input);
  const cacheKey = `history:v2:${params.kind}:${params.days}:${params.lat.toFixed(2)}:${params.lon.toFixed(2)}:${params.coin}:${params.magnitude.toFixed(1)}`;
  const { data: cached, error: cacheReadError } = await supabaseAdmin.from("provider_cache").select("payload, expires_at").eq("cache_key", cacheKey).maybeSingle();
  if (cacheReadError) throw new Error("History cache could not be read");
  const stale = cached?.payload as unknown as HistoryResult | undefined;
  if (cached && stale?.points?.length && new Date(cached.expires_at).getTime() > Date.now()) return { ...stale, cached: true };
  try {
    const result = await fetchFresh(params);
    const { error: cacheWriteError } = await supabaseAdmin.from("provider_cache").upsert({ cache_key: cacheKey, payload: result as unknown as Json, expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), created_at: new Date().toISOString() });
    if (cacheWriteError) console.error("[history] cache write failed", cacheWriteError.message);
    return result;
  } catch (error) {
    if (stale?.points?.length) return { ...stale, cached: true };
    console.error("[history] providers unavailable", error instanceof Error ? error.message : error);
    throw new Error("Historical data is temporarily unavailable from all sources");
  }
}
