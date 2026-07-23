import type { WidgetDataResult, WidgetDataValue, WidgetSettings } from "./widget-data.types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CacheEntry = { value?: WidgetDataResult; expiresAt: number; retryAt: number; failures: number; pending?: Promise<WidgetDataResult> };
const providerCache = new Map<string, CacheEntry>();
const CACHE_TTL: Record<string, number> = {
  iss: 15_000, weather: 10 * 60_000, aqi: 15 * 60_000, earthquakes: 5 * 60_000,
  crypto: 2 * 60_000, fx: 30 * 60_000, news: 10 * 60_000, reddit: 10 * 60_000,
  spacex: 30 * 60_000, apod: 6 * 60 * 60_000, mars: 6 * 60 * 60_000,
  neo: 60 * 60_000, countries: 24 * 60 * 60_000, github: 30 * 60_000,
  quote: 24 * 60 * 60_000, covid: 60 * 60_000, clocks: 1_000,
};

class ProviderError extends Error {
  constructor(message: string, public status: number, public retryAfter = 0) { super(message); }
}

const number = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

async function json(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OmniSphere/1.0" },
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
      "User-Agent": "OmniSphere global-awareness-dashboard/2.0",
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
  type,
  source,
  updatedAt: new Date().toISOString(),
  data,
});

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

const stableSettings = (settings: WidgetSettings) => Object.fromEntries(Object.entries(settings).sort(([a], [b]) => a.localeCompare(b)));

export async function fetchWidgetData(type: string, settings: WidgetSettings): Promise<WidgetDataResult> {
  const cacheVersion = type === "iss" ? "v3:" : "";
  const cacheKey = `${cacheVersion}${type}:${JSON.stringify(stableSettings(settings))}`;
  const now = Date.now();
  let cached = providerCache.get(cacheKey);
  if (!cached) {
    const { data } = await supabaseAdmin.from("provider_cache").select("payload, expires_at").eq("cache_key", cacheKey).maybeSingle();
    if (data?.payload && typeof data.payload === "object" && !Array.isArray(data.payload)) {
      const value = data.payload as unknown as WidgetDataResult;
      cached = { value, expiresAt: new Date(data.expires_at).getTime(), retryAt: 0, failures: 0 };
      providerCache.set(cacheKey, cached);
    }
  }
  if (cached?.value && cached.expiresAt > now) return cached.value;
  if (cached?.retryAt && cached.retryAt > now) {
    if (cached.value) return { ...cached.value, stale: true, status: "cached", retryAt: new Date(cached.retryAt).toISOString() };
    throw new ProviderError("Provider cooling down after too many requests", 429, cached.retryAt - now);
  }
  if (cached?.pending) return cached.pending;

  const pending = fetchWidgetDataFresh(type, settings).then((value) => {
    const expiresAt = Date.now() + (CACHE_TTL[type] ?? 5 * 60_000);
    const liveValue = { ...value, status: "live" as const };
    providerCache.set(cacheKey, { value: liveValue, expiresAt, retryAt: 0, failures: 0 });
    void supabaseAdmin.from("provider_cache").upsert({ cache_key: cacheKey, payload: liveValue as any, expires_at: new Date(expiresAt).toISOString(), created_at: new Date().toISOString() });
    return { ...value, status: "live" as const };
  }).catch((error: unknown) => {
    const previous = providerCache.get(cacheKey);
    const failures = (previous?.failures ?? 0) + 1;
    const providerRetry = error instanceof ProviderError ? error.retryAfter : 0;
    const cooldown = Math.max(providerRetry, Math.min(30 * 60_000, 30_000 * 2 ** Math.min(failures - 1, 6)));
    const retryAt = Date.now() + cooldown;
    providerCache.set(cacheKey, { value: previous?.value, expiresAt: 0, retryAt, failures });
    if (previous?.value) return { ...previous.value, stale: true, status: "cached" as const, retryAt: new Date(retryAt).toISOString() };
    throw Object.assign(error instanceof Error ? error : new Error("Data source unavailable"), { retryAt });
  });
  providerCache.set(cacheKey, { ...(cached ?? { expiresAt: 0, retryAt: 0, failures: 0 }), pending });
  return pending;
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
      const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&timezone=auto`);
      return result(type, "Open-Meteo Air Quality", { label: text(settings.label, "Selected location"), ...data });
    }
    case "earthquakes": {
      const min = Math.max(0, Math.min(10, number(settings.minMagnitude, 2.5)));
      const feed = await json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
      const events = (feed.features ?? []).filter((e: any) => number(e.properties?.mag, 0) >= min).slice(0, 40).map((e: any) => ({
        id: e.id,
        magnitude: e.properties.mag,
        place: e.properties.place,
        time: e.properties.time,
        url: e.properties.url,
        lat: number(e.geometry?.coordinates?.[1], 0),
        lon: number(e.geometry?.coordinates?.[0], 0),
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
        return result(type, "Launch Library 2", next ?? null);
      } catch {
        const launches = await json("https://fdo.rocketlaunch.live/json/launches/next/5");
        const next = (launches.result ?? []).find((launch: any) => /spacex/i.test(launch.provider?.name ?? "")) ?? launches.result?.[0];
        return result(type, "RocketLaunch.Live", next ? { name: next.name, net: next.t0 ?? next.win_open, mission: { description: next.mission_description ?? next.launch_description }, status: { description: next.launch_description } } : null);
      }
    }
    case "apod": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      try {
        return result(type, "NASA", await json(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`));
      } catch {
        const xml = await feed("https://apod.nasa.gov/apod.rss");
        const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1] ?? "";
        const field = (name: string) => decodeXml(item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
        const image = item.match(/<enclosure[^>]+url=["']([^"']+)/)?.[1];
        return result(type, "NASA APOD feed", { title: field("title"), explanation: field("description"), url: image, hdurl: field("link") });
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
      const data = await json(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&api_key=${encodeURIComponent(key)}`);
      const objects = Object.values(data.near_earth_objects ?? {}).flat().slice(0, 12);
      return result(type, "NASA", objects as WidgetDataValue);
    }
    case "clocks": {
      const zones = text(settings.zones, "UTC,America/New_York,Asia/Tokyo").split(",").map((z) => z.trim()).filter(Boolean).slice(0, 6);
      return result(type, "IANA time zone database", { zones, now: Date.now() });
    }
    case "news": {
      const query = text(settings.query, "world").slice(0, 80);
      const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`News provider returned ${response.status}`);
      const xml = await response.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map((match) => {
        const block = match[1];
        const field = (name: string) => decodeXml(block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
        return { title: field("title"), link: field("link"), published: field("pubDate"), source: field("source") };
      });
      return result(type, "Google News", { query, items });
    }
    case "reddit": {
      const subreddit = text(settings.subreddit, "worldnews").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
      try {
        const xml = await feed(`https://www.reddit.com/r/${subreddit}/hot.rss?limit=12`);
        const posts = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 12).map((match, index) => {
          const block = match[1];
          const field = (name: string) => decodeXml(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
          const href = block.match(/<link[^>]+href=["']([^"']+)/)?.[1] ?? "";
          return { id: field("id") || `${subreddit}-${index}`, title: field("title"), score: null, comments: null, url: href };
        }).filter((post) => post.title && post.url);
        if (!posts.length) throw new Error("Reddit feed returned no posts");
        return result(type, "Reddit RSS", { subreddit, posts });
      } catch {
        const data = await json(`https://old.reddit.com/r/${subreddit}/hot.json?limit=12&raw_json=1`);
        const posts = (data.data?.children ?? []).map((p: any) => ({ id: p.data.id, title: p.data.title, score: p.data.score, comments: p.data.num_comments, url: `https://reddit.com${p.data.permalink}` }));
        return result(type, "Reddit", { subreddit, posts });
      }
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