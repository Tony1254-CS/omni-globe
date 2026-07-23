import type { WidgetDataResult, WidgetDataValue, WidgetSettings } from "./widget-data.types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// v5 rejects empty payloads and canonicalizes settings so equivalent widgets share cache.
const CACHE_VERSION = "v6";

type CacheEntry = { value?: WidgetDataResult; expiresAt: number; retryAt: number; pending?: Promise<WidgetDataResult> };
const providerCache = new Map<string, CacheEntry>();

// Longer TTLs (fresh window) — after this we still serve the cached value but trigger a background refresh.
const CACHE_TTL: Record<string, number> = {
  iss: 20_000, weather: 15 * 60_000, aqi: 20 * 60_000, earthquakes: 10 * 60_000,
  crypto: 3 * 60_000, fx: 60 * 60_000, news: 15 * 60_000, reddit: 15 * 60_000,
  spacex: 60 * 60_000, apod: 6 * 60 * 60_000, mars: 6 * 60 * 60_000,
  neo: 6 * 60 * 60_000, countries: 24 * 60 * 60_000, github: 60 * 60_000,
  quote: 24 * 60 * 60_000, covid: 60 * 60_000, clocks: 1_000,
};

// Short soft cooldown after failure. We never lock the widget for long, and we always keep serving any cached value.
const SOFT_COOLDOWN_MS = 2 * 60_000;

class ProviderError extends Error {
  constructor(message: string, public status: number, public retryAfter = 0) { super(message); }
}

const number = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

async function json(url: string, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OmniSphere/2.0 (+https://omni-globe.lovable.app)", ...extraHeaders },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const retryHeader = response.headers.get("retry-after");
    const retryAfter = retryHeader ? Math.max(0, Number(retryHeader) * 1000) : 0;
    throw new ProviderError(`Data provider returned ${response.status}`, response.status, retryAfter);
  }
  return response.json() as Promise<any>;
}

async function feed(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml",
      "User-Agent": "OmniSphere/2.0 (+https://omni-globe.lovable.app)",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new ProviderError(`Feed provider returned ${response.status}`, response.status);
  return response.text();
}

async function jsonWithFallback(primary: string, fallback?: string) {
  try {
    return await json(primary);
  } catch (error) {
    if (!fallback) throw error;
    return json(fallback);
  }
}

const result = (type: string, source: string, data: WidgetDataValue): WidgetDataResult => ({
  type, source, updatedAt: new Date().toISOString(), data,
});

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function issPositionFromElements(element: Record<string, unknown>, at = new Date()) {
  const epoch = new Date(String(element.EPOCH));
  const meanMotion = number(element.MEAN_MOTION, 15.5);
  const eccentricity = number(element.ECCENTRICITY, 0.0007);
  const inclination = number(element.INCLINATION, 51.64) * Math.PI / 180;
  const ascendingNode = number(element.RA_OF_ASC_NODE, 0) * Math.PI / 180;
  const argumentOfPerigee = number(element.ARG_OF_PERICENTER, 0) * Math.PI / 180;
  const elapsedSeconds = (at.getTime() - epoch.getTime()) / 1000;
  const meanAnomaly = (number(element.MEAN_ANOMALY, 0) * Math.PI / 180 + meanMotion * 2 * Math.PI * elapsedSeconds / 86400) % (2 * Math.PI);
  let eccentricAnomaly = meanAnomaly;
  for (let step = 0; step < 7; step += 1) eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(eccentricAnomaly);
  const semiMajorAxis = Math.cbrt(398600.4418 / (meanMotion * 2 * Math.PI / 86400) ** 2);
  const orbitalX = semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const orbitalY = semiMajorAxis * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentricAnomaly);
  const cosO = Math.cos(ascendingNode), sinO = Math.sin(ascendingNode);
  const cosI = Math.cos(inclination), sinI = Math.sin(inclination);
  const cosW = Math.cos(argumentOfPerigee), sinW = Math.sin(argumentOfPerigee);
  const x = (cosO * cosW - sinO * sinW * cosI) * orbitalX + (-cosO * sinW - sinO * cosW * cosI) * orbitalY;
  const y = (sinO * cosW + cosO * sinW * cosI) * orbitalX + (-sinO * sinW + cosO * cosW * cosI) * orbitalY;
  const z = sinW * sinI * orbitalX + cosW * sinI * orbitalY;
  const julianDate = at.getTime() / 86400000 + 2440587.5;
  const daysSinceJ2000 = julianDate - 2451545;
  const greenwichAngle = ((280.46061837 + 360.98564736629 * daysSinceJ2000) % 360) * Math.PI / 180;
  const longitude = Math.atan2(y, x) - greenwichAngle;
  const wrappedLongitude = ((longitude * 180 / Math.PI + 540) % 360) - 180;
  const radius = Math.hypot(x, y, z);
  return { latitude: Math.asin(z / radius) * 180 / Math.PI, longitude: wrappedLongitude, altitude: radius - 6371, velocity: meanMotion * 2 * Math.PI * semiMajorAxis / 24 };
}

function cacheSettings(type: string, settings: WidgetSettings): WidgetSettings {
  const relevant: Record<string, string[]> = {
    weather: ["lat", "lon"], aqi: ["lat", "lon"], earthquakes: ["minMagnitude"],
    mars: ["rover"], news: ["query", "country"], reddit: ["subreddit"], crypto: ["coins"],
    fx: ["amount", "base", "quote"], countries: ["country"], github: ["language"],
    covid: ["country"], clocks: ["zones"],
  };
  const keys = relevant[type] ?? [];
  const normalized = Object.fromEntries(keys.flatMap((key) => settings[key] == null ? [] : [[key, settings[key]]])) as WidgetSettings;
  if (typeof normalized.lat === "number") normalized.lat = Number(normalized.lat.toFixed(3));
  if (typeof normalized.lon === "number") normalized.lon = Number(normalized.lon.toFixed(3));
  return Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)));
}

const cacheKeyFor = (type: string, settings: WidgetSettings) =>
  `${CACHE_VERSION}:${type}:${JSON.stringify(cacheSettings(type, settings))}`;

function hasUsableData(type: string, data: WidgetDataValue): boolean {
  if (data == null) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data !== "object") return true;
  const value = data as Record<string, any>;
  switch (type) {
    case "weather": return Number.isFinite(Number(value.current?.temperature_2m));
    case "aqi": {
      const c = value.current ?? {};
      const keys = ["us_aqi", "european_aqi", "primary_aqi", "pm2_5", "pm10", "nitrogen_dioxide", "ozone", "sulphur_dioxide", "carbon_monoxide"];
      return keys.some((k) => Number.isFinite(Number(c[k])));
    }
    case "earthquakes": return Array.isArray(value.events);
    case "iss": return Number.isFinite(Number(value.position?.latitude)) && Number.isFinite(Number(value.position?.longitude));
    case "spacex": return Boolean(value.name && (value.net || value.date));
    case "apod": return Boolean(value.title && (value.url || value.thumbnail_url));
    case "mars": return Array.isArray(value.photos) && value.photos.length > 0;
    case "news": return Array.isArray(value.items) && value.items.length > 0;
    case "reddit": return Array.isArray(value.posts) && value.posts.length > 0;
    case "crypto": return Object.keys(value).length > 0;
    case "github": return Array.isArray(value.items) && value.items.length > 0;
    default: return Object.keys(value).length > 0;
  }
}

function assertUsable(resultValue: WidgetDataResult): WidgetDataResult {
  if (!hasUsableData(resultValue.type, resultValue.data)) throw new ProviderError(`${resultValue.source} returned no usable data`, 503);
  return resultValue;
}

/**
 * Read-through, always-serve-stale cache.
 * - If any cached value exists (fresh OR stale), return it immediately.
 * - When it's stale, kick off a background refresh (fire and forget).
 * - On failure, keep serving the stale value; short 2 min soft cooldown to
 *   throttle retries, but NEVER lock the user out for 30 min like the old code.
 */
export async function fetchWidgetData(type: string, settings: WidgetSettings): Promise<WidgetDataResult> {
  const cacheKey = cacheKeyFor(type, settings);
  const now = Date.now();
  let cached = providerCache.get(cacheKey);

  // Cold worker: hydrate in-memory from Supabase row (any age).
  if (!cached) {
    const { data } = await supabaseAdmin.from("provider_cache").select("payload, expires_at").eq("cache_key", cacheKey).maybeSingle();
    if (data?.payload && typeof data.payload === "object" && !Array.isArray(data.payload)) {
      cached = { value: data.payload as unknown as WidgetDataResult, expiresAt: new Date(data.expires_at).getTime(), retryAt: 0 };
      providerCache.set(cacheKey, cached);
    }
  }

  const isFresh = cached?.value && cached.expiresAt > now;
  const inCooldown = cached?.retryAt && cached.retryAt > now;

  // Fresh — just serve.
  if (isFresh) return { ...cached!.value!, status: "live" };

  // Stale or missing. If we already have a fetch in flight, prefer it when there's nothing cached; otherwise return stale immediately.
  if (cached?.pending && !cached.value) return cached.pending;

  // If we have any cached value, serve it and (unless cooling down) refresh in background.
  if (cached?.value) {
    if (!inCooldown && !cached.pending) {
      const pending = refresh(type, settings, cacheKey).catch(() => undefined);
      providerCache.set(cacheKey, { ...cached, pending: pending as Promise<WidgetDataResult> });
    }
    return { ...cached.value, stale: true, status: inCooldown ? "cached" : "cached" };
  }

  // Nothing cached at all — try fresh once, and if that also fails, throw.
  const pending = refresh(type, settings, cacheKey);
  providerCache.set(cacheKey, { ...(cached ?? { expiresAt: 0, retryAt: 0 }), pending });
  return pending;
}

async function refresh(type: string, settings: WidgetSettings, cacheKey: string): Promise<WidgetDataResult> {
  try {
    const value = assertUsable(await fetchWidgetDataFresh(type, settings));
    const expiresAt = Date.now() + (CACHE_TTL[type] ?? 5 * 60_000);
    const liveValue: WidgetDataResult = { ...value, status: "live" };
    providerCache.set(cacheKey, { value: liveValue, expiresAt, retryAt: 0 });
    // Fire-and-forget persistent cache write.
    void supabaseAdmin.from("provider_cache").upsert({
      cache_key: cacheKey, payload: liveValue as any, expires_at: new Date(expiresAt).toISOString(), created_at: new Date().toISOString(),
    });
    return liveValue;
  } catch (err) {
    const previous = providerCache.get(cacheKey);
    const retryAt = Date.now() + SOFT_COOLDOWN_MS;
    providerCache.set(cacheKey, { value: previous?.value, expiresAt: previous?.expiresAt ?? 0, retryAt });
    if (previous?.value) return { ...previous.value, stale: true, status: "cached", retryAt: new Date(retryAt).toISOString() };
    throw Object.assign(err instanceof Error ? err : new Error("Data source unavailable"), { retryAt });
  }
}

async function fetchWidgetDataFresh(type: string, settings: WidgetSettings): Promise<WidgetDataResult> {
  const lat = Math.max(-90, Math.min(90, number(settings.lat, 51.5072)));
  const lon = Math.max(-180, Math.min(180, number(settings.lon, -0.1276)));

  switch (type) {
    case "weather": {
      try {
        const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`);
        return result(type, "Open-Meteo", { label: text(settings.label, "Selected location"), ...data });
      } catch (primaryError) {
        const compact = await json(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
        const series = compact.properties?.timeseries ?? [];
        const current = series[0]?.data?.instant?.details ?? {};
        const days = series.filter((_: unknown, index: number) => index % 24 === 0).slice(0, 5);
        return result(type, "MET Norway fallback", { label: text(settings.label, "Selected location"), current: { temperature_2m: current.air_temperature, apparent_temperature: current.air_temperature, relative_humidity_2m: current.relative_humidity, wind_speed_10m: current.wind_speed }, daily: { time: days.map((d: any) => d.time.slice(0, 10)), temperature_2m_max: days.map((d: any) => d.data?.instant?.details?.air_temperature), temperature_2m_min: days.map((d: any) => d.data?.instant?.details?.air_temperature) }, fallbackReason: primaryError instanceof Error ? primaryError.message : "Primary unavailable" });
      }
    }
    case "aqi": {
      const pollutants = "us_aqi,european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide";
      const enrich = (current: Record<string, any>) => {
        const us = Number(current?.us_aqi);
        const eu = Number(current?.european_aqi);
        const primary = Number.isFinite(us) ? us : Number.isFinite(eu) ? eu : null;
        const scale = Number.isFinite(us) ? "US" : Number.isFinite(eu) ? "EU" : null;
        return { ...current, primary_aqi: primary, aqi_scale: scale };
      };
      try {
        const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=${pollutants}&timezone=auto`);
        return result(type, "Open-Meteo Air Quality", { label: text(settings.label, "Selected location"), ...data, current: enrich(data.current ?? {}) });
      } catch {
        const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=${pollutants}&past_days=1&forecast_days=1&timezone=auto`);
        const index = Math.max(0, (data.hourly?.time?.length ?? 1) - 1);
        const current = Object.fromEntries(pollutants.split(",").map((key) => [key, data.hourly?.[key]?.[index]]));
        return result(type, "Open-Meteo Air Quality · latest hourly", { label: text(settings.label, "Selected location"), current: enrich(current) });
      }
    }
    case "earthquakes": {
      const min = Math.max(0, Math.min(10, number(settings.minMagnitude, 2.5)));
      const feedData = await json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
      const events = (feedData.features ?? []).filter((e: any) => number(e.properties?.mag, 0) >= min).slice(0, 40).map((e: any) => ({
        id: e.id, magnitude: e.properties.mag, place: e.properties.place, time: e.properties.time, url: e.properties.url,
        lat: number(e.geometry?.coordinates?.[1], 0), lon: number(e.geometry?.coordinates?.[0], 0),
      }));
      return result(type, "USGS", { minMagnitude: min, events });
    }
    case "iss": {
      const crewPromise = json("https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json").catch(() => ({ number: null, people: [] }));
      try {
        const [position, crew] = await Promise.all([json("https://api.wheretheiss.at/v1/satellites/25544"), crewPromise]);
        return result(type, "Where The ISS At", { position, crew });
      } catch {
        const [records, crew] = await Promise.all([json("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON"), crewPromise]);
        if (!records?.[0]) throw new Error("ISS orbital elements unavailable");
        return result(type, "CelesTrak orbital model", { position: issPositionFromElements(records[0]), crew });
      }
    }
    case "spacex": {
      try {
        const data = await json("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10");
        const next = (data.results ?? []).find((launch: any) => /spacex/i.test(`${launch.launch_service_provider?.name ?? ""} ${launch.name ?? ""}`)) ?? data.results?.[0];
        if (!next?.name || !next?.net) throw new Error("Upcoming launch missing");
        return result(type, "Launch Library 2", next);
      } catch {
        const launches = await json("https://fdo.rocketlaunch.live/json/launches/next/5");
        const next = (launches.result ?? []).find((launch: any) => /spacex/i.test(launch.provider?.name ?? "")) ?? launches.result?.[0];
        if (!next?.name || !(next.t0 || next.win_open || next.sort_date)) throw new Error("Upcoming launch missing");
        return result(type, "RocketLaunch.Live", { name: next.name, net: next.t0 ?? next.win_open ?? Number(next.sort_date) * 1000, mission: { description: next.mission_description ?? next.launch_description }, status: { description: next.launch_description } });
      }
    }
    case "apod": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      try {
        return result(type, "NASA", await json(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`));
      } catch {
        try {
          const xml = await feed("https://apod.nasa.gov/apod.rss");
          const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1] ?? "";
          const field = (name: string) => decodeXml(item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
          const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
          const image = item.match(/<enclosure[^>]+url=["']([^"']+)/)?.[1]
            ?? description.match(/<img[^>]+src=["']([^"']+)/)?.[1];
          const feedResult = result(type, "NASA APOD feed", { title: field("title"), explanation: field("description"), url: image, hdurl: field("link") });
          return assertUsable(feedResult);
        } catch {
          const archive = await json("https://images-api.nasa.gov/search?q=astronomy&media_type=image&page_size=1&year_start=2024");
          const item = archive.collection?.items?.[0];
          return result(type, "NASA Image Library", {
            title: item?.data?.[0]?.title ?? "NASA astronomy image",
            explanation: item?.data?.[0]?.description ?? "A recent image from NASA's astronomy archive.",
            url: item?.links?.find((link: any) => link.render === "image")?.href,
          });
        }
      }
    }
    case "mars": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      const rover = text(settings.rover, "curiosity").toLowerCase().replace(/[^a-z]/g, "");
      try {
        const data = await json(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${encodeURIComponent(key)}`);
        if (!(data.latest_photos ?? []).length) throw new Error("No recent rover images");
        return result(type, "NASA", { rover, photos: data.latest_photos.slice(0, 8) });
      } catch {
        const archive = await json(`https://images-api.nasa.gov/search?q=${encodeURIComponent(`${rover} mars rover`)}&media_type=image&page_size=8`);
        const photos = (archive.collection?.items ?? []).map((item: any, index: number) => ({ id: item.data?.[0]?.nasa_id ?? index, img_src: item.links?.find((link: any) => link.render === "image")?.href, earth_date: item.data?.[0]?.date_created?.slice(0, 10), rover: { name: rover }, camera: { name: "NASA", full_name: item.data?.[0]?.title ?? "Mars rover image" } })).filter((photo: any) => photo.img_src);
        return result(type, "NASA Image Library", { rover, photos });
      }
    }
    case "neo": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      const start = new Date().toISOString().slice(0, 10);
      try {
        const data = await json(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&api_key=${encodeURIComponent(key)}`);
        const objects = Object.values(data.near_earth_objects ?? {}).flat().slice(0, 12);
        if (!objects.length) throw new Error("NEO feed empty");
        return result(type, "NASA", objects as WidgetDataValue);
      } catch {
        const data = await json("https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.2&date-min=now&date-max=%2B30&sort=date&limit=12");
        const fields: string[] = data.fields ?? [];
        const row = (values: unknown[]) => Object.fromEntries(fields.map((field, index) => [field, values[index]]));
        const objects = (data.data ?? []).map(row).map((object: any) => ({
          name: object.des, close_approach_data: [{ close_approach_date_full: object.cd, miss_distance: { astronomical: object.dist }, relative_velocity: { kilometers_per_second: object.v_rel } }],
          estimated_diameter: { meters: { estimated_diameter_max: Math.round(1329 / Math.sqrt(0.14) * 10 ** (-Number(object.h) / 5) * 1000) } }, is_potentially_hazardous_asteroid: Number(object.dist) < 0.05,
        }));
        return result(type, "NASA/JPL Close Approach", objects);
      }
    }
    case "clocks": {
      const zones = text(settings.zones, "UTC,America/New_York,Asia/Tokyo").split(",").map((z) => z.trim()).filter(Boolean).slice(0, 6);
      return result(type, "IANA time zone database", { zones, now: Date.now() });
    }
    case "news": {
      const query = text(settings.query, "world").slice(0, 80);
      const country = text(settings.country, "US").toUpperCase().slice(0, 2);
      try {
        const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-${country}&gl=${country}&ceid=${country}:en`, {
          headers: { "User-Agent": "OmniSphere/2.0" }, signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new ProviderError(`News provider returned ${response.status}`, response.status);
        const xml = await response.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map((match) => {
          const block = match[1];
          const field = (name: string) => decodeXml(block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
          return { title: field("title"), link: field("link"), published: field("pubDate"), source: field("source") };
        });
        if (!items.length) throw new Error("News feed empty");
        return result(type, "Google News", { query, country, items });
      } catch {
        const xml = await feed("https://feeds.bbci.co.uk/news/world/rss.xml");
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map((match) => {
          const block = match[1];
          const field = (name: string) => decodeXml(block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
          return { title: field("title"), link: field("link"), published: field("pubDate"), source: "BBC World" };
        });
        return result(type, "BBC World", { query, items });
      }
    }
    case "reddit": {
      // Community discussions use Hacker News because public Reddit endpoints block server traffic.
      const subreddit = text(settings.subreddit, "worldnews").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
      const topicMap: Record<string, string> = {
        worldnews: "world news", technology: "technology", science: "science",
        space: "space", programming: "programming", futurology: "futurology",
      };
      const query = topicMap[subreddit.toLowerCase()] ?? subreddit;
      const hn = await json(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=12`);
      const posts = (hn.hits ?? []).map((h: any) => ({
        id: h.objectID, title: h.title || h.story_title,
        score: h.points, comments: h.num_comments,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      })).filter((p: any) => p.title);
      return result(type, `Community News · ${query}`, { subreddit, posts });
    }
    case "crypto": {
      const coins = text(settings.coins, "bitcoin,ethereum,solana").toLowerCase().replace(/[^a-z0-9,-]/g, "").slice(0, 100);
      const data = await jsonWithFallback(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coins)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`, `https://api.coincap.io/v2/assets?limit=10`);
      if (data?.data && Array.isArray(data.data)) {
        const requested = new Set(coins.split(","));
        const normalized = Object.fromEntries(data.data.filter((coin: any) => requested.has(coin.id)).map((coin: any) => [coin.id, { usd: Number(coin.priceUsd), usd_24h_change: Number(coin.changePercent24Hr) }]));
        return result(type, "CoinCap", normalized);
      }
      return result(type, "CoinGecko", data);
    }
    case "fx": {
      const base = text(settings.base, "USD").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      const quote = text(settings.quote, "EUR").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      const amount = Math.max(0.01, Math.min(1_000_000, number(settings.amount, 1)));
      const data = await json(`https://api.frankfurter.app/latest?amount=${amount}&from=${base}&to=${quote}`);
      return result(type, "Frankfurter / ECB", { ...data, requestedAmount: amount, quote });
    }
    case "countries": {
      const country = text(settings.country, "Japan").slice(0, 60);
      const data = await json(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name,flags,capital,population,region,subregion,languages,maps`);
      return result(type, "REST Countries", Array.isArray(data) ? data[0] : data);
    }
    case "github": {
      const language = text(settings.language, "typescript").toLowerCase().replace(/[^a-z0-9+#.-]/g, "").slice(0, 30);
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const data = await json(`https://api.github.com/search/repositories?q=created:%3E${since}+language:${encodeURIComponent(language)}&sort=stars&order=desc&per_page=10`);
      return result(type, "GitHub", { language, items: data.items ?? [] });
    }
    case "quote": {
      const data = await json(`https://dummyjson.com/quotes/${new Date().getUTCDate() + 1}`);
      return result(type, "DummyJSON Quotes", data);
    }
    case "covid": {
      const country = text(settings.country, "all").slice(0, 60);
      const endpoint = country.toLowerCase() === "all" ? "all" : `countries/${encodeURIComponent(country)}`;
      return result(type, "disease.sh / Worldometer", await json(`https://disease.sh/v3/covid-19/${endpoint}`));
    }
    default:
      throw new Error("Unsupported widget type");
  }
}

/**
 * Widget types worth warming globally (no per-user state).
 * Called by the scheduled refresh route so provider_cache is always fresh
 * before a user loads the dashboard.
 */
export const GLOBAL_WARMUP_WIDGETS: Array<{ type: string; settings: WidgetSettings }> = [
  { type: "iss", settings: {} },
  { type: "earthquakes", settings: { minMagnitude: 2.5 } },
  { type: "spacex", settings: {} },
  { type: "apod", settings: {} },
  { type: "neo", settings: {} },
  { type: "mars", settings: { rover: "curiosity" } },
  { type: "news", settings: { query: "world" } },
  { type: "reddit", settings: { subreddit: "worldnews" } },
  { type: "reddit", settings: { subreddit: "technology" } },
  { type: "crypto", settings: { coins: "bitcoin,ethereum,solana" } },
  { type: "fx", settings: { base: "USD", quote: "EUR", amount: 1 } },
  { type: "github", settings: { language: "typescript" } },
  { type: "quote", settings: {} },
  { type: "covid", settings: { country: "all" } },
  // A few popular default-weather targets so cold users get instant data
  { type: "weather", settings: { lat: 51.5072, lon: -0.1276, label: "London" } },
  { type: "aqi", settings: { lat: 51.5072, lon: -0.1276, label: "London" } },
];

export async function warmAllProviders() {
  const results: Array<{ type: string; ok: boolean; source?: string; error?: string }> = [];
  const { data: configuredRows } = await supabaseAdmin.from("widget_configs").select("widget_type, settings");
  const configuredWidgets = (configuredRows ?? []).map((row) => ({
    type: row.widget_type,
    settings: row.settings && typeof row.settings === "object" && !Array.isArray(row.settings) ? row.settings as WidgetSettings : {},
  }));
  const uniqueWidgets = new Map<string, { type: string; settings: WidgetSettings }>();
  for (const widget of [...GLOBAL_WARMUP_WIDGETS, ...configuredWidgets]) uniqueWidgets.set(cacheKeyFor(widget.type, widget.settings), widget);

  await Promise.all([...uniqueWidgets.values()].map(async ({ type, settings }) => {
    const cacheKey = cacheKeyFor(type, settings);
    try {
      // Force a refresh path regardless of current cache state.
      const value = assertUsable(await fetchWidgetDataFresh(type, settings));
      const expiresAt = Date.now() + (CACHE_TTL[type] ?? 5 * 60_000);
      const liveValue: WidgetDataResult = { ...value, status: "live" };
      providerCache.set(cacheKey, { value: liveValue, expiresAt, retryAt: 0 });
      await supabaseAdmin.from("provider_cache").upsert({
        cache_key: cacheKey, payload: liveValue as any,
        expires_at: new Date(expiresAt).toISOString(), created_at: new Date().toISOString(),
      });
      results.push({ type, ok: true, source: value.source });
    } catch (err) {
      results.push({ type, ok: false, error: err instanceof Error ? err.message : "unknown" });
    }
  }));
  return results;
}
