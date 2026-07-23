import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Clock, Cloud, Coins, ExternalLink, Github, Globe2, Heart, MessageSquare, Newspaper, Orbit, RefreshCw, Rocket, Save, Satellite, Settings2, TrendingDown, TrendingUp, Wind, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getWidgetData } from "@/lib/widget-data.functions";
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from "@/lib/widget-data.types";
import { updateWidgetSettings } from "@/lib/widgets.functions";
import { scoreWidget } from "@/lib/anomaly";
import { AttentionBadge } from "@/components/omni/AttentionBadge";
import { TrustBadge } from "@/components/omni/TrustBadge";
import { ForecastCard } from "@/components/omni/ForecastCard";
import { LocationSearch } from "@/components/omni/LocationSearch";
import { getMyProfile } from "@/lib/profile.functions";
import { formatInTz, formatTimeInTz, formatOffsetLabel, isValidTz, cToF, kmhToMph, countryFromTz } from "@/lib/format";

type Props = { id: string; type: string; settings: unknown };

const FORECASTABLE = new Set(["weather", "aqi", "earthquakes", "crypto"]);
const LOCATION_AWARE = new Set(["weather", "aqi", "news", "clocks"]);
const WIDGET_STATES: Record<string, { icon: LucideIcon; unavailable: string; hint: string }> = {
  weather: { icon: Cloud, unavailable: "Weather signal interrupted", hint: "Keeping your last forecast ready" },
  aqi: { icon: Wind, unavailable: "Air sensor network paused", hint: "Air readings will resume automatically" },
  earthquakes: { icon: Activity, unavailable: "Seismic feed is quiet", hint: "Reconnecting to the global sensor network" },
  iss: { icon: Satellite, unavailable: "Orbital telemetry interrupted", hint: "Reacquiring the station signal" },
  spacex: { icon: Rocket, unavailable: "Launch feed is delayed", hint: "The next mission update is queued" },
  apod: { icon: Orbit, unavailable: "Deep-space image delayed", hint: "NASA’s daily image will return shortly" },
  mars: { icon: Orbit, unavailable: "Mars relay unavailable", hint: "Waiting for the next rover downlink" },
  neo: { icon: Orbit, unavailable: "Object tracking paused", hint: "Near-Earth monitoring will retry automatically" },
  news: { icon: Newspaper, unavailable: "Headline feed interrupted", hint: "Reconnecting to global news sources" },
  reddit: { icon: MessageSquare, unavailable: "Community feed is unavailable", hint: "The discussion feed will retry automatically" },
  crypto: { icon: Coins, unavailable: "Market feed interrupted", hint: "Last prices remain protected in cache" },
  fx: { icon: Coins, unavailable: "Currency market unavailable", hint: "Exchange rates will refresh automatically" },
  countries: { icon: Globe2, unavailable: "Country data unavailable", hint: "The atlas service will retry shortly" },
  github: { icon: Github, unavailable: "Repository feed paused", hint: "Reconnecting to GitHub trends" },
  clocks: { icon: Clock, unavailable: "World clock unavailable", hint: "The clock will resume shortly" },
  quote: { icon: Heart, unavailable: "Quote of the day paused", hint: "A fresh quote will arrive soon" },
  covid: { icon: Activity, unavailable: "Health dataset unavailable", hint: "The provider will retry automatically" },
};

const asSettings = (value: unknown): WidgetSettings =>
  value && typeof value === "object" && !Array.isArray(value) ? value as WidgetSettings : {};

const num = (value: unknown, digits = 0) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const linkClass = "inline-flex items-center gap-1 text-primary hover:underline";

export function LiveWidget({ id, type, settings: stored }: Props) {
  const qc = useQueryClient();
  const fetchData = useServerFn(getWidgetData);
  const fetchProfile = useServerFn(getMyProfile);
  const saveSettings = useServerFn(updateWidgetSettings);
  const baseSettings = useMemo(() => ({ ...(DEFAULT_WIDGET_SETTINGS[type] ?? {}), ...asSettings(stored) }), [stored, type]);
  const profileEnabled = LOCATION_AWARE.has(type);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: profileEnabled, staleTime: 5 * 60_000 });
  const usingGlobal = profileEnabled && baseSettings.useGlobalLocation !== false && !!profile.data;
  const settings = useMemo(() => {
    if (!usingGlobal || !profile.data) return baseSettings;
    const merged: WidgetSettings = { ...baseSettings };
    if (profile.data.home_lat != null && profile.data.home_lon != null) {
      merged.lat = profile.data.home_lat;
      merged.lon = profile.data.home_lon;
      merged.label = profile.data.home_label ?? "Home";
    }
    const tz = profile.data.timezone;
    if (type === "clocks" && isValidTz(tz)) {
      const existing = String(baseSettings.zones ?? "").split(",").map((z) => z.trim()).filter(Boolean).filter(isValidTz).filter((z) => z !== tz);
      merged.zones = [tz, ...existing].slice(0, 6).join(",");
    }
    if (type === "news" && tz) merged.country = countryFromTz(tz);
    return merged;
  }, [baseSettings, profile.data, type, usingGlobal]);
  const profileTz = profile.data?.timezone ?? undefined;
  const units = (profile.data?.units as "metric" | "imperial") ?? "metric";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  const query = useQuery({
    queryKey: ["widget-data", id, type, settings],
    queryFn: () => fetchData({ data: { type, settings } }),
    staleTime: type === "iss" ? 15_000 : type === "crypto" ? 60_000 : 5 * 60_000,
    refetchInterval: type === "iss" ? 20_000 : type === "crypto" ? 60_000 : type === "fx" ? 5 * 60_000 : false,
    retry: 1,
  });

  const save = useMutation({
    mutationFn: () => saveSettings({ data: { id, settings: draft } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["widgets"] });
      setEditing(false);
      toast.success("Widget settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const anomaly = useMemo(() => scoreWidget(type, query.data?.data), [type, query.data]);
  const state = WIDGET_STATES[type] ?? { icon: Activity, unavailable: "Live source unavailable", hint: "Connection will retry automatically" };
  const StateIcon = state.icon;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-1">
        <AttentionBadge score={anomaly} />
        <div className="flex items-center gap-1">
          <button title="Refresh data" aria-label="Refresh data" onClick={() => query.refetch()} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          </button>
          {Object.keys(DEFAULT_WIDGET_SETTINGS[type] ?? {}).length > 0 && (
            <button title="Widget settings" aria-label="Widget settings" onClick={() => setEditing((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <SettingsForm type={type} draft={draft} setDraft={setDraft} onSave={() => save.mutate()} saving={save.isPending} />
      ) : query.isLoading ? (
        <div className="widget-skeleton flex flex-1 flex-col justify-end gap-3" aria-label="Loading live data"><div className="h-20 rounded-lg" /><div className="h-3 w-2/3 rounded-full" /><div className="h-3 w-1/3 rounded-full" /></div>
      ) : query.data?.data ? (
        // Always render data if we have any — even stale. The status footer shows freshness.
        <div className="widget-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {usingGlobal && (settings.label || profileTz) && (
            <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground">📍 {settings.label ?? "Home"}{profileTz ? ` · ${profileTz}` : ""}</p>
          )}
          <WidgetView type={type} data={query.data.data as any} tz={profileTz} units={units} />
          {FORECASTABLE.has(type) && <ForecastCard type={type as any} params={settings as any} />}
        </div>
      ) : (
        // Only show the error card when we've NEVER had data for this widget.
        <div className="flex flex-1 flex-col justify-between py-1">
          <div className="flex items-start gap-3">
            <div className="widget-state-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl"><StateIcon className="h-4.5 w-4.5" /></div>
            <div className="min-w-0"><p className="text-sm font-semibold">{state.unavailable}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{state.hint}</p></div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-glass-border pt-3">
            <div><p className="text-[9px] font-semibold uppercase text-muted-foreground">Source unavailable</p><p className="mt-1 text-[10px] text-muted-foreground">{query.data?.error ?? query.error?.message ?? "No valid data received yet."}</p></div>
            <button onClick={() => query.refetch()} className="liquid-control grid h-8 w-8 shrink-0 place-items-center rounded-full" aria-label="Retry connection"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      {query.data?.data && !editing && (
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-glass-border pt-2">
          <TrustBadge source={query.data.source} updatedAt={query.data.updatedAt} level={query.data.stale ? "cached" : "verified"} />
          <span className="text-[10px] text-muted-foreground">{new Date(query.data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: unknown; onChange: (value: string | number) => void; type?: "text" | "number" }) {
  return <label className="block"><span className="mb-1 block text-[10px] uppercase text-muted-foreground">{label}</span><input type={type} value={String(value ?? "")} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-1.5 text-xs outline-none focus:border-primary" /></label>;
}

function SettingsForm({ type, draft, setDraft, onSave, saving }: { type: string; draft: WidgetSettings; setDraft: (v: WidgetSettings) => void; onSave: () => void; saving: boolean }) {
  const set = (key: string, value: string | number) => setDraft({ ...draft, [key]: value });
  const fields: Record<string, Array<[string, string, "text" | "number"]>> = {
    weather: [],
    aqi: [],
    earthquakes: [["minMagnitude", "Minimum magnitude", "number"]],
    clocks: [["zones", "Time zones (comma-separated)", "text"]],
    news: [["query", "News search", "text"]], reddit: [["subreddit", "Subreddit", "text"]],
    crypto: [["coins", "Coin IDs", "text"]],
    fx: [["amount", "Amount", "number"], ["base", "From currency", "text"], ["quote", "To currency", "text"]],
    countries: [["country", "Country", "text"]], github: [["language", "Language", "text"]],
    mars: [["rover", "Rover", "text"]], covid: [["country", "Country or all", "text"]],
  };
  const locationAware = type === "weather" || type === "aqi";
  return <div className="space-y-2 overflow-auto">{locationAware && <><label className="flex items-center justify-between rounded-md bg-secondary/60 p-2 text-xs"><span>Use global location</span><input type="checkbox" checked={draft.useGlobalLocation !== false} onChange={(event) => setDraft({ ...draft, useGlobalLocation: event.target.checked })} className="accent-primary" /></label>{draft.useGlobalLocation === false && <LocationSearch onSelect={(location) => setDraft({ ...draft, label: location.label, lat: location.lat, lon: location.lon, timezone: location.timezone })} />}</>}{(fields[type] ?? []).map(([key, label, inputType]) => <Field key={key} label={label} value={draft[key]} type={inputType} onChange={(v) => set(key, v)} />)}<button onClick={onSave} disabled={saving} className="mt-2 inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save</button></div>;
}

function WidgetView({ type, data, tz, units }: { type: string; data: any; tz?: string; units?: "metric" | "imperial" }) {
  if (!data) return <Empty />;
  const fmt = (v: unknown) => formatInTz(v, tz);
  switch (type) {
    case "weather": {
      const imperial = units === "imperial";
      const t = Number(data.current?.temperature_2m);
      const feels = Number(data.current?.apparent_temperature);
      const wind = Number(data.current?.wind_speed_10m);
      const tempStr = Number.isFinite(t) ? (imperial ? `${num(cToF(t), 1)}°F` : `${num(t, 1)}°C`) : "—";
      const feelsStr = Number.isFinite(feels) ? (imperial ? `${num(cToF(feels), 1)}°F` : `${num(feels, 1)}°C`) : "—";
      const windStr = Number.isFinite(wind) ? (imperial ? `${num(kmhToMph(wind), 1)} mph` : `${num(wind, 1)} km/h`) : "—";
      const dayTemp = (v: number) => (imperial && Number.isFinite(Number(v)) ? num(cToF(Number(v))) : num(v));
      return <div><div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground">{data.label}</p><p className="text-4xl font-semibold neon-text">{tempStr}</p><p className="text-xs text-muted-foreground">Feels {feelsStr} · Humidity {num(data.current?.relative_humidity_2m)}%</p></div><p className="text-sm">Wind {windStr}</p></div><div className="mt-4 grid grid-cols-5 gap-1">{(data.daily?.time ?? []).map((d: string, i: number) => <div key={d} className="rounded bg-secondary/50 p-1.5 text-center"><p className="text-[10px] text-muted-foreground">{new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: "short", timeZone: tz })}</p><p className="text-xs font-medium">{dayTemp(data.daily.temperature_2m_max[i])}°</p><p className="text-[10px] text-muted-foreground">{dayTemp(data.daily.temperature_2m_min[i])}°</p></div>)}</div></div>;
    }
    case "aqi": {
      const c = data.current ?? {};
      const aqi = Number(c.primary_aqi ?? c.us_aqi ?? c.european_aqi);
      const rawScale: string = c.aqi_scale ?? (Number.isFinite(Number(c.us_aqi)) ? "US" : Number.isFinite(Number(c.european_aqi)) ? "EU" : "—");
      const isDerived = rawScale === "US (derived)";
      const scale = isDerived ? "US" : rawScale;
      const band = !Number.isFinite(aqi) ? "No reading" : scale === "EU"
        ? (aqi <= 20 ? "Good" : aqi <= 40 ? "Fair" : aqi <= 60 ? "Moderate" : aqi <= 80 ? "Poor" : aqi <= 100 ? "Very poor" : "Extremely poor")
        : (aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy for sensitive groups" : aqi <= 200 ? "Unhealthy" : aqi <= 300 ? "Very unhealthy" : "Hazardous");
      return <div><p className="text-xs text-muted-foreground">{data.label} · {scale} AQI{isDerived ? " · from PM2.5" : ""}</p><div className="mt-2 flex items-end gap-3"><p className="text-4xl font-semibold neon-text">{Number.isFinite(aqi) ? num(aqi) : "—"}</p><p className="pb-1 text-sm">{band}</p></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Metric label="PM2.5 µg/m³" value={num(c.pm2_5, 1)} /><Metric label="PM10 µg/m³" value={num(c.pm10, 1)} /><Metric label="NO₂ µg/m³" value={num(c.nitrogen_dioxide, 1)} /><Metric label="Ozone µg/m³" value={num(c.ozone, 1)} /></div></div>;
    }
    case "earthquakes": return <List items={data.events} render={(e: any) => <><span className="mr-2 inline-grid h-7 w-7 place-items-center rounded bg-destructive/15 text-xs font-bold text-destructive">{num(e.magnitude, 1)}</span><span className="min-w-0 flex-1 truncate">{e.place}</span><a className={linkClass} href={e.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></>} />;
    case "iss": return <div><p className="text-4xl font-semibold neon-text">{num(data.position?.altitude, 0)} km</p><p className="text-xs text-muted-foreground">Altitude · {num(data.position?.velocity, 0)} km/h</p><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Latitude" value={num(data.position?.latitude, 3)} /><Metric label="Longitude" value={num(data.position?.longitude, 3)} /></div>{data.crew?.number && <p className="mt-3 text-xs">{data.crew.number} people currently in space</p>}</div>;
    case "spacex": return <div><p className="text-xs uppercase text-muted-foreground">Next launch</p><p className="mt-1 text-xl font-semibold">{data.name}</p><p className="mt-2 text-sm neon-text">{fmt(data.net)}</p><p className="mt-3 line-clamp-4 text-xs text-muted-foreground">{data.mission?.description || data.status?.description || "Mission details pending."}</p></div>;
    case "apod": return <div>{(data.url || data.thumbnail_url) && data.media_type !== "video" && <img src={data.thumbnail_url || data.url} alt={data.title || "NASA astronomy media"} className="mb-3 aspect-video w-full rounded object-cover" loading="lazy" />}<p className="font-semibold">{data.title}</p><p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{String(data.explanation ?? "").replace(/<[^>]*>/g, " ").replace(/&#(\d+);/g, (_: string, code: string) => String.fromCodePoint(Number(code))).replace(/\s+/g, " ").trim()}</p></div>;
    case "mars": return data.photos?.length ? <div className="grid grid-cols-2 gap-2">{data.photos.map((p: any) => <a key={p.id} href={p.img_src} target="_blank" rel="noreferrer"><img src={p.img_src} alt={`${p.rover?.name} ${p.camera?.full_name}`} className="aspect-square w-full rounded object-cover" loading="lazy" /><p className="mt-1 truncate text-[10px] text-muted-foreground">{p.camera?.name} · {p.earth_date}</p></a>)}</div> : <Empty label="No recent rover photos found" />;
    case "neo": return <List items={data} render={(o: any) => <><span className={`h-2 w-2 rounded-full ${o.is_potentially_hazardous_asteroid ? "bg-destructive" : "bg-neon-lime"}`} /><span className="min-w-0 flex-1 truncate">{o.name}</span><span className="text-muted-foreground">{num(o.estimated_diameter?.meters?.estimated_diameter_max)} m</span></>} />;
    case "clocks": return <LiveClocks zones={data.zones ?? []} />;
    case "news": return <List items={data.items} render={(item: any) => <a href={item.link} target="_blank" rel="noreferrer" className="block w-full"><p className="line-clamp-2 text-xs font-medium">{item.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.source || fmt(item.published)}</p></a>} />;
    case "reddit": return <div><div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-neon-magenta" /><span className="text-xs font-semibold">{data.subreddit}</span></div><List items={data.posts} render={(p: any) => <a href={p.url} target="_blank" rel="noreferrer" className="block w-full"><p className="line-clamp-2 text-xs font-medium">{p.title}</p>{p.score != null && <p className="mt-1 text-[10px] text-muted-foreground">↑ {num(p.score)} · {num(p.comments)} comments</p>}</a>} /></div>;
    case "crypto": return <div className="space-y-2">{Object.entries(data).map(([coin, value]: [string, any]) => <div key={coin} className="flex items-center justify-between rounded bg-secondary/50 p-2"><div><p className="text-xs font-semibold capitalize">{coin.replaceAll("-", " ")}</p><p className="text-lg">${num(value.usd, 4)}</p></div><Change value={value.usd_24h_change} /></div>)}</div>;
    case "fx": return <div className="grid h-full place-items-center text-center"><div><p className="text-xs text-muted-foreground">{num(data.requestedAmount, 2)} {data.base}</p><p className="my-2 text-4xl font-semibold neon-text">{num(data.rates?.[data.quote], 4)}</p><p className="text-sm">{data.quote}</p><p className="mt-3 text-[10px] text-muted-foreground">Rate date {data.date}</p></div></div>;
    case "countries": return <div><div className="flex items-center gap-3"><img src={data.flags?.svg} alt={data.flags?.alt || `${data.name?.common} flag`} className="h-12 w-16 rounded object-cover" /><div><p className="text-xl font-semibold">{data.name?.common}</p><p className="text-xs text-muted-foreground">{data.name?.official}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Capital" value={data.capital?.[0]} /><Metric label="Population" value={num(data.population)} /><Metric label="Region" value={data.region} /><Metric label="Subregion" value={data.subregion} /></div>{data.maps?.googleMaps && <a className={`mt-3 text-xs ${linkClass}`} href={data.maps.googleMaps} target="_blank" rel="noreferrer">Open map <ExternalLink className="h-3 w-3" /></a>}</div>;
    case "github": return <List items={data.items} render={(repo: any) => <a href={repo.html_url} target="_blank" rel="noreferrer" className="block w-full"><p className="truncate text-xs font-semibold">{repo.full_name}</p><p className="line-clamp-1 text-[10px] text-muted-foreground">{repo.description || "No description"}</p><p className="mt-1 text-[10px] text-neon-amber">★ {num(repo.stargazers_count)}</p></a>} />;
    case "quote": return <div className="grid h-full place-items-center text-center"><blockquote><p className="text-lg leading-relaxed">“{data.quote}”</p><footer className="mt-4 text-xs text-muted-foreground">— {data.author}</footer></blockquote></div>;
    case "covid": return <div><p className="text-xs text-muted-foreground">{data.country || "Global"} · historical reporting</p><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Cases" value={num(data.cases)} /><Metric label="Today" value={num(data.todayCases)} /><Metric label="Recovered" value={num(data.recovered)} /><Metric label="Deaths" value={num(data.deaths)} /></div><p className="mt-3 text-[10px] text-muted-foreground">Latest available provider dataset: {fmt(data.updated)}</p></div>;
    default: return <Empty label="Unsupported widget" />;
  }
}

function LiveClocks({ zones }: { zones: string[] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timer);
  }, []);
  const valid = zones.filter(isValidTz);
  if (!valid.length) return <Empty label="No valid time zones configured" />;
  return <div className="space-y-2">{valid.map((zone) => <div key={zone} className="flex items-center justify-between rounded bg-secondary/50 p-2"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{zone.replaceAll("_", " ")}</p><p className="text-[10px] text-muted-foreground/70">{formatOffsetLabel(zone, now)}</p></div><span className="font-mono text-lg tabular-nums">{formatTimeInTz(zone, now)}</span></div>)}</div>;
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded bg-secondary/50 p-2"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-semibold">{String(value ?? "—")}</p></div>; }
function Change({ value }: { value: unknown }) { const n = Number(value ?? 0); return <span className={`inline-flex items-center text-xs font-semibold ${n >= 0 ? "text-neon-lime" : "text-destructive"}`}>{n >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}{num(Math.abs(n), 2)}%</span>; }
function List({ items, render }: { items: any[]; render: (item: any) => ReactNode }) { return items?.length ? <div className="space-y-1.5">{items.map((item, index) => <div key={item.id ?? item.url ?? item.link ?? index} className="flex items-center gap-2 rounded bg-secondary/40 p-2 text-xs">{render(item)}</div>)}</div> : <Empty />; }
function Empty({ label = "No current data" }: { label?: string }) { return <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">{label}</div>; }