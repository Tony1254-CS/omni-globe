import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { createAlert, deleteAlert, evaluateAlerts, listAlerts, updateAlert } from "@/lib/alerts.functions";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — OMNISPHERE" },
      { name: "description", content: "Threshold-based alerts for crypto prices, weather, earthquakes, air quality and FX." },
      { property: "og:title", content: "OMNISPHERE Alerts — get pinged when the planet moves" },
      { property: "og:description", content: "Set thresholds like BTC below $40k or quakes above M6 and get notified when they trip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
  errorComponent: ({ error }) => (
    <div className="glass p-8 text-center text-sm text-muted-foreground">Alerts failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

type Kind = "crypto" | "weather" | "aqi" | "earthquake" | "fx";

const KIND_META: Record<Kind, { label: string; unit: string; params: Array<{ key: string; label: string; type: "text" | "number"; default: string | number }>; defaultThreshold: number; defaultLabel: string }> = {
  crypto: { label: "Crypto price", unit: "USD", params: [{ key: "coin", label: "Coin id (coingecko)", type: "text", default: "bitcoin" }], defaultThreshold: 40000, defaultLabel: "BTC price" },
  weather: { label: "Weather temp", unit: "°C", params: [{ key: "lat", label: "Lat", type: "number", default: 51.5072 }, { key: "lon", label: "Lon", type: "number", default: -0.1276 }], defaultThreshold: 30, defaultLabel: "London temp" },
  aqi: { label: "Air quality (US AQI)", unit: "AQI", params: [{ key: "lat", label: "Lat", type: "number", default: 51.5072 }, { key: "lon", label: "Lon", type: "number", default: -0.1276 }], defaultThreshold: 100, defaultLabel: "London AQI" },
  earthquake: { label: "Earthquake (max 24h)", unit: "M", params: [], defaultThreshold: 6, defaultLabel: "Global quake" },
  fx: { label: "FX rate", unit: "rate", params: [{ key: "base", label: "From", type: "text", default: "USD" }, { key: "quote", label: "To", type: "text", default: "EUR" }], defaultThreshold: 1, defaultLabel: "USD/EUR" },
};

function AlertsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAlerts);
  const create = useServerFn(createAlert);
  const update = useServerFn(updateAlert);
  const del = useServerFn(deleteAlert);
  const evalFn = useServerFn(evaluateAlerts);

  const alerts = useQuery({ queryKey: ["alerts"], queryFn: () => list() });

  const evalMut = useMutation({
    mutationFn: () => evalFn(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      const fired = (res.evaluations ?? []).filter((e) => e.triggered);
      for (const f of fired) toast.warning(`Alert triggered: ${f.label} (value ${f.value})`);
    },
  });

  useEffect(() => {
    if (!alerts.data?.length) return;
    evalMut.mutate();
    const id = setInterval(() => evalMut.mutate(), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.data?.length]);

  const [open, setOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); toast.success("Alert created"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const delMut = useMutation({
    mutationFn: del,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Set thresholds and OMNISPHERE will ping you when they trip. Checked every 60s while this page is open.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110">
          <Plus className="h-4 w-4" /> New alert
        </button>
      </div>

      {alerts.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (alerts.data ?? []).length === 0 ? (
        <div className="glass grid place-items-center p-16 text-center">
          <Bell className="h-10 w-10 text-primary" />
          <p className="mt-3 text-lg font-semibold">No alerts yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">Create your first alert — for example “BTC below $40k” or “global earthquake above M6”.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(alerts.data ?? []).map((a) => {
            const meta = KIND_META[a.kind as Kind];
            const triggered = a.last_triggered_at && (!a.last_checked_at || a.last_triggered_at === a.last_checked_at);
            return (
              <div key={a.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{a.label}</span>
                    {triggered ? (
                      <span className="flex items-center gap-1 rounded-full bg-neon-amber/20 px-2 py-0.5 text-[10px] text-neon-amber"><AlertTriangle className="h-3 w-3" /> Triggered</span>
                    ) : a.last_checked_at ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary"><CheckCircle2 className="h-3 w-3" /> OK</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {meta?.label ?? a.kind} · {a.comparator === "gt" ? ">" : "<"} {a.threshold} {meta?.unit}
                    {a.last_value !== null && a.last_value !== undefined && (
                      <> · latest <span className="text-foreground">{Number(a.last_value).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={a.enabled}
                      onChange={(e) => updateMut.mutate({ data: { id: a.id, enabled: e.target.checked } })}
                      className="accent-primary"
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => delMut.mutate({ data: { id: a.id } })}
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <NewAlertModal onClose={() => setOpen(false)} onCreate={(data) => createMut.mutate({ data })} pending={createMut.isPending} />}
    </div>
  );
}

function NewAlertModal({ onClose, onCreate, pending }: { onClose: () => void; onCreate: (data: any) => void; pending: boolean }) {
  const [kind, setKind] = useState<Kind>("crypto");
  const meta = KIND_META[kind];
  const [label, setLabel] = useState(meta.defaultLabel);
  const [comparator, setComparator] = useState<"gt" | "lt">("lt");
  const [threshold, setThreshold] = useState<number>(meta.defaultThreshold);
  const initialParams = useMemo(() => Object.fromEntries(meta.params.map((p) => [p.key, p.default])), [meta]);
  const [params, setParams] = useState<Record<string, string | number>>(initialParams);

  function switchKind(k: Kind) {
    const m = KIND_META[k];
    setKind(k);
    setLabel(m.defaultLabel);
    setThreshold(m.defaultThreshold);
    setParams(Object.fromEntries(m.params.map((p) => [p.key, p.default])));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">New alert</h2>
        <div className="mt-4 grid gap-3">
          <label className="block text-xs">
            <span className="mb-1 block uppercase text-muted-foreground">Type</span>
            <select value={kind} onChange={(e) => switchKind(e.target.value as Kind)} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm">
              {Object.entries(KIND_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block uppercase text-muted-foreground">Label</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="block">
              <span className="mb-1 block uppercase text-muted-foreground">When</span>
              <select value={comparator} onChange={(e) => setComparator(e.target.value as "gt" | "lt")} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm">
                <option value="gt">Above (&gt;)</option>
                <option value="lt">Below (&lt;)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block uppercase text-muted-foreground">Threshold ({meta.unit})</span>
              <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm" />
            </label>
          </div>
          {meta.params.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {meta.params.map((p) => (
                <label key={p.key} className="block">
                  <span className="mb-1 block uppercase text-muted-foreground">{p.label}</span>
                  <input
                    type={p.type}
                    value={String(params[p.key] ?? "")}
                    onChange={(e) => setParams({ ...params, [p.key]: p.type === "number" ? Number(e.target.value) : e.target.value })}
                    className="w-full rounded border border-glass-border bg-secondary/60 px-2 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-glass-border px-3 py-2 text-sm">Cancel</button>
          <button
            disabled={pending}
            onClick={() => onCreate({ label, kind, comparator, threshold, params, enabled: true })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create alert"}
          </button>
        </div>
      </div>
    </div>
  );
}
