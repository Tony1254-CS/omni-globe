import type { WidgetDataResult, WidgetDataValue, WidgetSettings } from "./widget-data.types";

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
  if (!response.ok) throw new Error(`Data provider returned ${response.status}`);
  return response.json() as Promise<any>;
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

export async function fetchWidgetData(type: string, settings: WidgetSettings): Promise<WidgetDataResult> {
  const lat = Math.max(-90, Math.min(90, number(settings.lat, 51.5072)));
  const lon = Math.max(-180, Math.min(180, number(settings.lon, -0.1276)));

  switch (type) {
    case "weather": {
      const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`);
      return result(type, "Open-Meteo", { label: text(settings.label, "Selected location"), ...data });
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
      const [position, crew] = await Promise.all([
        json("https://api.wheretheiss.at/v1/satellites/25544"),
        json("https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json").catch(() => ({ number: null, people: [] })),
      ]);
      return result(type, "Where The ISS At", { position, crew });
    }
    case "spacex": {
      const data = await json("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10");
      const next = (data.results ?? []).find((launch: any) => /spacex/i.test(`${launch.launch_service_provider?.name ?? ""} ${launch.name ?? ""}`)) ?? data.results?.[0];
      return result(type, "Launch Library 2", next ?? null);
    }
    case "apod": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      return result(type, "NASA", await json(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`));
    }
    case "mars": {
      const key = process.env.NASA_API_KEY || "DEMO_KEY";
      const rover = text(settings.rover, "curiosity").toLowerCase().replace(/[^a-z]/g, "");
      const data = await json(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${encodeURIComponent(key)}`);
      return result(type, "NASA", { rover, photos: (data.latest_photos ?? []).slice(0, 8) });
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
      const data = await json(`https://www.reddit.com/r/${subreddit}/hot.json?limit=12&raw_json=1`);
      const posts = (data.data?.children ?? []).map((p: any) => ({ id: p.data.id, title: p.data.title, score: p.data.score, comments: p.data.num_comments, url: `https://reddit.com${p.data.permalink}` }));
      return result(type, "Reddit", { subreddit, posts });
    }
    case "crypto": {
      const coins = text(settings.coins, "bitcoin,ethereum,solana").toLowerCase().replace(/[^a-z0-9,-]/g, "").slice(0, 100);
      const data = await json(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coins)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`);
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