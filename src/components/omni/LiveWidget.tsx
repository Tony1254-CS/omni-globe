import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Save, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getWidgetData } from "@/lib/widget-data.functions";
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from "@/lib/widget-data.types";
import { updateWidgetSettings } from "@/lib/widgets.functions";

type Props = { id: string; type: string; settings: unknown };

const asSettings = (value: unknown): WidgetSettings =>
  value && typeof value === "object" && !Array.isArray(value) ? value as WidgetSettings : {};

const num = (value: unknown, digits = 0) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const date = (value: unknown) => value ? new Date(value as string | number).toLocaleString() : "—";
const linkClass = "inline-flex items-center gap-1 text-primary hover:underline";

export function LiveWidget({ id, type, settings: stored }: Props) {
  const qc = useQueryClient();
  const fetchData = useServerFn(getWidgetData);
  const saveSettings = useServerFn(updateWidgetSettings);
  const settings = useMemo(() => ({ ...(DEFAULT_WIDGET_SETTINGS[type] ?? {}), ...asSettings(stored) }), [stored, type]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  const query = useQuery({
    queryKey: ["widget-data", id, type, settings],
    queryFn: () => fetchData({ data: { type, settings } }),
    staleTime: type === "iss" ? 15_000 : 5 * 60_000,
    refetchInterval: type === "iss" ? 20_000 : false,
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-end gap-1">
        <button title="Refresh data" aria-label="Refresh data" onClick={() => query.refetch()} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
        </button>
        {Object.keys(DEFAULT_WIDGET_SETTINGS[type] ?? {}).length > 0 && (
          <button title="Widget settings" aria-label="Widget settings" onClick={() => setEditing((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <SettingsForm type={type} draft={draft} setDraft={setDraft} onSave={() => save.mutate()} saving={save.isPending} />
      ) : query.isLoading ? (
        <div className="grid flex-1 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : query.isError ? (
        <div className="grid flex-1 place-items-center text-center">
          <div><AlertTriangle className="mx-auto h-5 w-5 text-neon-amber" /><p className="mt-2 text-xs font-medium">Live source unavailable</p><p className="mt-1 text-[11px] text-muted-foreground">{query.error.message}</p><button onClick={() => query.refetch()} className="mt-3 rounded bg-secondary px-2 py-1 text-xs">Try again</button></div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto"><WidgetView type={type} data={query.data?.data as any} /></div>
      )}

      {query.data && !editing && <div className="mt-2 flex shrink-0 justify-between border-t border-glass-border pt-2 text-[10px] text-muted-foreground"><span>{query.data.source}</span><span>{new Date(query.data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: unknown; onChange: (value: string | number) => void; type?: "text" | "number" }) {
  return <label className="block"><span className="mb-1 block text-[10px] uppercase text-muted-foreground">{label}</span><input type={type} value={String(value ?? "")} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-1.5 text-xs outline-none focus:border-primary" /></label>;
}

function SettingsForm({ type, draft, setDraft, onSave, saving }: { type: string; draft: WidgetSettings; setDraft: (v: WidgetSettings) => void; onSave: () => void; saving: boolean }) {
  const set = (key: string, value: string | number) => setDraft({ ...draft, [key]: value });
  const fields: Record<string, Array<[string, string, "text" | "number"]>> = {
    weather: [["label", "Location label", "text"], ["lat", "Latitude", "number"], ["lon", "Longitude", "number"]],
    aqi: [["label", "Location label", "text"], ["lat", "Latitude", "number"], ["lon", "Longitude", "number"]],
    earthquakes: [["minMagnitude", "Minimum magnitude", "number"]],
    clocks: [["zones", "Time zones (comma-separated)", "text"]],
    news: [["query", "News search", "text"]], reddit: [["subreddit", "Subreddit", "text"]],
    crypto: [["coins", "Coin IDs", "text"]],
    fx: [["amount", "Amount", "number"], ["base", "From currency", "text"], ["quote", "To currency", "text"]],
    countries: [["country", "Country", "text"]], github: [["language", "Language", "text"]],
    mars: [["rover", "Rover", "text"]], covid: [["country", "Country or all", "text"]],
  };
  return <div className="space-y-2 overflow-auto">{(fields[type] ?? []).map(([key, label, inputType]) => <Field key={key} label={label} value={draft[key]} type={inputType} onChange={(v) => set(key, v)} />)}<button onClick={onSave} disabled={saving} className="mt-2 inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save</button></div>;
}

function WidgetView({ type, data }: { type: string; data: any }) {
  if (!data) return <Empty />;
  switch (type) {
    case "weather": return <div><div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground">{data.label}</p><p className="text-4xl font-semibold neon-text">{num(data.current?.temperature_2m, 1)}°</p><p className="text-xs text-muted-foreground">Feels {num(data.current?.apparent_temperature, 1)}° · Humidity {num(data.current?.relative_humidity_2m)}%</p></div><p className="text-sm">Wind {num(data.current?.wind_speed_10m, 1)} km/h</p></div><div className="mt-4 grid grid-cols-5 gap-1">{(data.daily?.time ?? []).map((d: string, i: number) => <div key={d} className="rounded bg-secondary/50 p-1.5 text-center"><p className="text-[10px] text-muted-foreground">{new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: "short" })}</p><p className="text-xs font-medium">{num(data.daily.temperature_2m_max[i])}°</p><p className="text-[10px] text-muted-foreground">{num(data.daily.temperature_2m_min[i])}°</p></div>)}</div></div>;
    case "aqi": { const aqi = Number(data.current?.us_aqi ?? 0); const label = aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy for sensitive groups" : "Unhealthy"; return <div><p className="text-xs text-muted-foreground">{data.label}</p><div className="mt-2 flex items-end gap-3"><p className="text-4xl font-semibold neon-text">{num(aqi)}</p><p className="pb-1 text-sm">{label}</p></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Metric label="PM2.5" value={data.current?.pm2_5} /><Metric label="PM10" value={data.current?.pm10} /><Metric label="NO₂" value={data.current?.nitrogen_dioxide} /><Metric label="Ozone" value={data.current?.ozone} /></div></div>; }
    case "earthquakes": return <List items={data.events} render={(e: any) => <><span className="mr-2 inline-grid h-7 w-7 place-items-center rounded bg-destructive/15 text-xs font-bold text-destructive">{num(e.magnitude, 1)}</span><span className="min-w-0 flex-1 truncate">{e.place}</span><a className={linkClass} href={e.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></>} />;
    case "iss": return <div><p className="text-4xl font-semibold neon-text">{num(data.position?.altitude, 0)} km</p><p className="text-xs text-muted-foreground">Altitude · {num(data.position?.velocity, 0)} km/h</p><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Latitude" value={num(data.position?.latitude, 3)} /><Metric label="Longitude" value={num(data.position?.longitude, 3)} /></div>{data.crew?.number && <p className="mt-3 text-xs">{data.crew.number} people currently in space</p>}</div>;
    case "spacex": return <div><p className="text-xs uppercase text-muted-foreground">Next launch</p><p className="mt-1 text-xl font-semibold">{data.name}</p><p className="mt-2 text-sm neon-text">{date(data.date_utc)}</p><p className="mt-3 line-clamp-4 text-xs text-muted-foreground">{data.details || "Mission details pending."}</p></div>;
    case "apod": return <div>{(data.url || data.thumbnail_url) && <img src={data.thumbnail_url || data.url} alt={data.title || "NASA astronomy media"} className="mb-3 aspect-video w-full rounded object-cover" loading="lazy" />}<p className="font-semibold">{data.title}</p><p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{data.explanation}</p></div>;
    case "mars": return data.photos?.length ? <div className="grid grid-cols-2 gap-2">{data.photos.map((p: any) => <a key={p.id} href={p.img_src} target="_blank" rel="noreferrer"><img src={p.img_src} alt={`${p.rover?.name} ${p.camera?.full_name}`} className="aspect-square w-full rounded object-cover" loading="lazy" /><p className="mt-1 truncate text-[10px] text-muted-foreground">{p.camera?.name} · {p.earth_date}</p></a>)}</div> : <Empty label="No recent rover photos found" />;
    case "neo": return <List items={data} render={(o: any) => <><span className={`h-2 w-2 rounded-full ${o.is_potentially_hazardous_asteroid ? "bg-destructive" : "bg-neon-lime"}`} /><span className="min-w-0 flex-1 truncate">{o.name}</span><span className="text-muted-foreground">{num(o.estimated_diameter?.meters?.estimated_diameter_max)} m</span></>} />;
    case "clocks": return <div className="space-y-2">{data.zones?.map((zone: string) => <div key={zone} className="flex items-center justify-between rounded bg-secondary/50 p-2"><span className="text-xs text-muted-foreground">{zone.replaceAll("_", " ")}</span><span className="font-mono text-lg">{new Intl.DateTimeFormat([], { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(data.now))}</span></div>)}</div>;
    case "news": return <List items={data.items} render={(item: any) => <a href={item.link} target="_blank" rel="noreferrer" className="block w-full"><p className="line-clamp-2 text-xs font-medium">{item.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.source || date(item.published)}</p></a>} />;
    case "reddit": return <List items={data.posts} render={(p: any) => <a href={p.url} target="_blank" rel="noreferrer" className="block w-full"><p className="line-clamp-2 text-xs font-medium">{p.title}</p><p className="mt-1 text-[10px] text-muted-foreground">↑ {num(p.score)} · {num(p.comments)} comments</p></a>} />;
    case "crypto": return <div className="space-y-2">{Object.entries(data).map(([coin, value]: [string, any]) => <div key={coin} className="flex items-center justify-between rounded bg-secondary/50 p-2"><div><p className="text-xs font-semibold capitalize">{coin.replaceAll("-", " ")}</p><p className="text-lg">${num(value.usd, 4)}</p></div><Change value={value.usd_24h_change} /></div>)}</div>;
    case "fx": return <div className="grid h-full place-items-center text-center"><div><p className="text-xs text-muted-foreground">{num(data.requestedAmount, 2)} {data.base}</p><p className="my-2 text-4xl font-semibold neon-text">{num(data.rates?.[data.quote], 4)}</p><p className="text-sm">{data.quote}</p><p className="mt-3 text-[10px] text-muted-foreground">Rate date {data.date}</p></div></div>;
    case "countries": return <div><div className="flex items-center gap-3"><img src={data.flags?.svg} alt={data.flags?.alt || `${data.name?.common} flag`} className="h-12 w-16 rounded object-cover" /><div><p className="text-xl font-semibold">{data.name?.common}</p><p className="text-xs text-muted-foreground">{data.name?.official}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Capital" value={data.capital?.[0]} /><Metric label="Population" value={num(data.population)} /><Metric label="Region" value={data.region} /><Metric label="Subregion" value={data.subregion} /></div>{data.maps?.googleMaps && <a className={`mt-3 text-xs ${linkClass}`} href={data.maps.googleMaps} target="_blank" rel="noreferrer">Open map <ExternalLink className="h-3 w-3" /></a>}</div>;
    case "github": return <List items={data.items} render={(repo: any) => <a href={repo.html_url} target="_blank" rel="noreferrer" className="block w-full"><p className="truncate text-xs font-semibold">{repo.full_name}</p><p className="line-clamp-1 text-[10px] text-muted-foreground">{repo.description || "No description"}</p><p className="mt-1 text-[10px] text-neon-amber">★ {num(repo.stargazers_count)}</p></a>} />;
    case "quote": return <div className="grid h-full place-items-center text-center"><blockquote><p className="text-lg leading-relaxed">“{data.quote}”</p><footer className="mt-4 text-xs text-muted-foreground">— {data.author}</footer></blockquote></div>;
    case "covid": return <div><p className="text-xs text-muted-foreground">{data.country || "Global"} · historical reporting</p><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Cases" value={num(data.cases)} /><Metric label="Today" value={num(data.todayCases)} /><Metric label="Recovered" value={num(data.recovered)} /><Metric label="Deaths" value={num(data.deaths)} /></div><p className="mt-3 text-[10px] text-muted-foreground">Latest available provider dataset: {date(data.updated)}</p></div>;
    default: return <Empty label="Unsupported widget" />;
  }
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded bg-secondary/50 p-2"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-semibold">{String(value ?? "—")}</p></div>; }
function Change({ value }: { value: unknown }) { const n = Number(value ?? 0); return <span className={`inline-flex items-center text-xs font-semibold ${n >= 0 ? "text-neon-lime" : "text-destructive"}`}>{n >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}{num(Math.abs(n), 2)}%</span>; }
function List({ items, render }: { items: any[]; render: (item: any) => React.ReactNode }) { return items?.length ? <div className="space-y-1.5">{items.map((item, index) => <div key={item.id ?? item.url ?? item.link ?? index} className="flex items-center gap-2 rounded bg-secondary/40 p-2 text-xs">{render(item)}</div>)}</div> : <Empty />; }
function Empty({ label = "No current data" }: { label?: string }) { return <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">{label}</div>; }