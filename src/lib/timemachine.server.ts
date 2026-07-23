// Server-only helpers for the Global Time Machine.
// GIBS tile URL builder, USGS historical earthquakes, GDELT headlines, and AI narration.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GIBS_MODIS_START = "2000-02-24"; // MODIS Terra earliest date
const GDELT_START = "2015-02-19"; // GDELT Doc 2.0 earliest

export type DaySnapshot = {
  date: string; // YYYY-MM-DD
  quakes: Array<{ id: string; magnitude: number; place: string; lat: number; lon: number; time: number; url: string }>;
  headlines: Array<{ title: string; source: string; url: string; seendate?: string }>;
  gibs: { available: boolean; layer: string; templateUrl: string | null; note?: string };
  iss: { available: boolean; note?: string };
};

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

export function normalizeDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * NASA GIBS true-color WMTS template. globe.gl accepts a plain image URL
 * (not a tiled layer), so we use the WMS single-image endpoint at a modest
 * resolution — good enough as a globe basemap and one request per date swap.
 */
export function buildGibsImageUrl(date: string): { url: string | null; note?: string; layer: string } {
  const normalized = normalizeDate(date);
  const layer = "MODIS_Terra_CorrectedReflectance_TrueColor";
  if (normalized < GIBS_MODIS_START) {
    return { url: null, layer, note: `MODIS true-color imagery starts ${GIBS_MODIS_START}` };
  }
  // GIBS "snapshots" is a WMS endpoint that returns a full-earth image for a
  // given date and layer. Bbox is the whole globe in EPSG:4326.
  const params = new URLSearchParams({
    REQUEST: "GetSnapshot",
    TIME: normalized,
    BBOX: "-90,-180,90,180",
    CRS: "EPSG:4326",
    LAYERS: layer,
    FORMAT: "image/jpeg",
    WIDTH: "2048",
    HEIGHT: "1024",
  });
  return { url: `https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params.toString()}`, layer };
}

async function jsonFetch(url: string, timeoutMs = 12000) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OmniSphere-TimeMachine/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json() as Promise<any>;
}

/** Cache historical results in `provider_cache` — they never change once past. */
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  try {
    const { data } = await supabaseAdmin.from("provider_cache").select("payload, expires_at").eq("cache_key", key).maybeSingle();
    if (data?.payload && new Date(data.expires_at).getTime() > Date.now()) return data.payload as T;
  } catch { /* ignore */ }
  const fresh = await fn();
  try {
    await supabaseAdmin.from("provider_cache").upsert({
      cache_key: key,
      payload: fresh as any,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch { /* ignore */ }
  return fresh;
}

async function fetchQuakes(date: string) {
  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59Z`;
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}&minmagnitude=4.5&orderby=magnitude&limit=50`;
  try {
    const data = await jsonFetch(url);
    const features = Array.isArray(data?.features) ? data.features : [];
    return features.map((f: any) => ({
      id: String(f.id),
      magnitude: Number(f.properties?.mag ?? 0),
      place: String(f.properties?.place ?? "Unknown"),
      time: Number(f.properties?.time ?? 0),
      lat: Number(f.geometry?.coordinates?.[1] ?? 0),
      lon: Number(f.geometry?.coordinates?.[0] ?? 0),
      url: String(f.properties?.url ?? ""),
    })).filter((q: any) => Number.isFinite(q.lat) && Number.isFinite(q.lon));
  } catch {
    return [];
  }
}

async function fetchHeadlines(date: string) {
  if (date < GDELT_START) return [];
  // GDELT Doc API: full-day window in yyyymmddhhmmss format
  const start = date.replace(/-/g, "") + "000000";
  const end = date.replace(/-/g, "") + "235959";
  const query = encodeURIComponent("sourcelang:eng");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=8&format=json&startdatetime=${start}&enddatetime=${end}&sort=hybridrel`;
  try {
    const data = await jsonFetch(url, 15000);
    const arts = Array.isArray(data?.articles) ? data.articles : [];
    return arts.slice(0, 5).map((a: any) => ({
      title: String(a.title ?? "").trim(),
      source: String(a.domain ?? a.sourcecommonname ?? "").trim(),
      url: String(a.url ?? "").trim(),
      seendate: String(a.seendate ?? "").trim(),
    })).filter((h: any) => h.title && h.url);
  } catch {
    return [];
  }
}

export async function getDaySnapshot(dateInput: string): Promise<DaySnapshot> {
  const date = normalizeDate(dateInput);
  const today = normalizeDate(new Date().toISOString());
  // Historical days can cache aggressively (30d); today caches briefly (5m).
  const ttl = date < today ? 30 * 24 * 60 * 60_000 : 5 * 60_000;
  const key = `timemachine:${date}`;

  return cached<DaySnapshot>(key, ttl, async () => {
    const [quakes, headlines] = await Promise.all([fetchQuakes(date), fetchHeadlines(date)]);
    const gibs = buildGibsImageUrl(date);
    return {
      date,
      quakes,
      headlines,
      gibs: {
        available: !!gibs.url,
        layer: gibs.layer,
        templateUrl: gibs.url,
        note: gibs.note,
      },
      iss: date < "1998-11-20"
        ? { available: false, note: "ISS launched November 1998" }
        : { available: true },
    };
  });
}

export async function narrateDay(input: {
  label: string;
  date: string;
  homeLabel?: string | null;
  snapshot: DaySnapshot;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const topQuake = input.snapshot.quakes[0];
  const facts = {
    date: input.date,
    milestone: input.label,
    home: input.homeLabel ?? null,
    topEarthquake: topQuake ? { magnitude: topQuake.magnitude, place: topQuake.place } : null,
    otherQuakes: input.snapshot.quakes.slice(1, 4).map((q) => ({ m: q.magnitude, place: q.place })),
    topHeadlines: input.snapshot.headlines.slice(0, 3).map((h) => h.title),
    gibsAvailable: input.snapshot.gibs.available,
  };

  const system = `You are OMNISPHERE's Time Machine narrator. Write a short, cinematic 2–4 sentence paragraph about what the world was doing on a specific date, tying it to the user's personal milestone. Warm, vivid, factual — never invent events not present in the facts. If no earthquake or headline is provided, focus on the date and setting instead. No emojis. No headings.`;

  const user = `Facts (JSON):\n${JSON.stringify(facts)}\n\nWrite the narration now.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const body = await res.json() as any;
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return String(content).trim();
}
