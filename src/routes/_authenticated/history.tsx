import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

import { getHistoryData } from "@/lib/history-data.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "History — OMNISPHERE" },
      { name: "description", content: "Rewind the planet: historical charts for weather, crypto prices, and seismic activity." },
      { property: "og:title", content: "OMNISPHERE History — the planet, rewound" },
      { property: "og:description", content: "Chart historical weather, crypto prices, and earthquakes over any recent window." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
  errorComponent: ({ error }) => (
    <div className="glass p-8 text-center text-sm text-muted-foreground">History failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

type Kind = "weather" | "crypto" | "earthquakes";

const KIND_META: Record<Kind, { label: string; params: Array<{ key: string; label: string; type: "text" | "number"; default: string | number }> }> = {
  weather: { label: "Weather (daily mean °C)", params: [{ key: "lat", label: "Lat", type: "number", default: 51.5072 }, { key: "lon", label: "Lon", type: "number", default: -0.1276 }] },
  crypto: { label: "Crypto price (USD)", params: [{ key: "coin", label: "Coin id", type: "text", default: "bitcoin" }] },
  earthquakes: { label: "Earthquakes / day", params: [{ key: "minMagnitude", label: "Min magnitude", type: "number", default: 4.5 }] },
};

function HistoryPage() {
  const historyFn = useServerFn(getHistoryData);
  const [kind, setKind] = useState<Kind>("weather");
  const [days, setDays] = useState(30);
  const meta = KIND_META[kind];
  const initial = useMemo(() => Object.fromEntries(meta.params.map((p) => [p.key, p.default])), [meta]);
  const [params, setParams] = useState<Record<string, string | number>>(initial);

  function switchKind(k: Kind) {
    setKind(k);
    setParams(Object.fromEntries(KIND_META[k].params.map((p) => [p.key, p.default])));
  }

  const query = useQuery({
    queryKey: ["history", kind, days, params],
    queryFn: () => historyFn({ data: { kind, params: { ...params, days } } }),
    staleTime: 5 * 60_000,
  });

  const data = query.data;
  const isBar = kind === "earthquakes";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">
          Time-machine view over the last {days} days. Sourced from open providers — Open-Meteo Archive, CoinGecko, USGS.
        </p>
      </div>

      <div className="glass flex flex-wrap items-end gap-3 p-4 text-xs">
        <label className="block">
          <span className="mb-1 block uppercase text-muted-foreground">Dataset</span>
          <select value={kind} onChange={(e) => switchKind(e.target.value as Kind)} className="rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm">
            {Object.entries(KIND_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block uppercase text-muted-foreground">Days: {days}</span>
          <input type="range" min={7} max={kind === "earthquakes" ? 30 : 365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-48 accent-primary" />
        </label>
        {meta.params.map((p) => (
          <label key={p.key} className="block">
            <span className="mb-1 block uppercase text-muted-foreground">{p.label}</span>
            <input
              type={p.type}
              value={String(params[p.key] ?? "")}
              onChange={(e) => setParams({ ...params, [p.key]: p.type === "number" ? Number(e.target.value) : e.target.value })}
              className="w-32 rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="glass p-4">
        {query.isLoading ? (
          <div className="grid h-[400px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : query.isError || data?.error ? (
          <div className="grid h-[400px] place-items-center text-center text-sm text-muted-foreground">
            <div>
              <Radar className="mx-auto h-8 w-8 text-neon-amber" />
              <p className="mt-2">Data source unavailable: {(query.error as Error)?.message ?? data?.error}</p>
              <button onClick={() => query.refetch()} className="mt-3 rounded bg-secondary px-3 py-1 text-xs">Retry</button>
            </div>
          </div>
        ) : (data?.series ?? []).length === 0 ? (
          <div className="grid h-[400px] place-items-center text-sm text-muted-foreground">No data in the selected window.</div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{data?.source}</span>
              <span>{data?.series.length} points · unit: {data?.unit ?? ""}</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              {isBar ? (
                <BarChart data={data?.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="t" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "rgba(11,18,36,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8 }} />
                  <Bar dataKey="v" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data?.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="t" stroke="#94a3b8" tick={{ fontSize: 11 }} minTickGap={40} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "rgba(11,18,36,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="v" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
