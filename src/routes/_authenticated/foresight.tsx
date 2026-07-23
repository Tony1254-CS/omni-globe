import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ThumbsDown, ThumbsUp, TrendingUp, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { generatePredictions, listPredictions, resolvePrediction } from "@/lib/foresight.functions";
import { TrustBadge } from "@/components/omni/TrustBadge";

export const Route = createFileRoute("/_authenticated/foresight")({
  head: () => ({
    meta: [
      { title: "Foresight — Calibrated predictions · OMNISPHERE" },
      { name: "description", content: "Probabilistic, cited, auditable predictions about your world — grounded in live data, with a hit-rate you can measure." },
      { property: "og:title", content: "OMNISPHERE Foresight — see what's likely next" },
      { property: "og:description", content: "Calibrated predictions with sources, reasoning, and a public hit-rate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForesightPage,
  errorComponent: ({ error }) => <div className="glass p-8 text-center text-sm text-muted-foreground">Foresight failed: {error.message}</div>,
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

const CATEGORY_COLORS: Record<string, string> = {
  weather: "text-sky-300 border-sky-500/25 bg-sky-500/10",
  market: "text-amber-300 border-amber-500/25 bg-amber-500/10",
  seismic: "text-rose-300 border-rose-500/25 bg-rose-500/10",
  space: "text-fuchsia-300 border-fuchsia-500/25 bg-fuchsia-500/10",
  world: "text-emerald-300 border-emerald-500/25 bg-emerald-500/10",
  personal: "text-primary border-primary/25 bg-primary/10",
};

function ForesightPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPredictions);
  const gen = useServerFn(generatePredictions);
  const resolve = useServerFn(resolvePrediction);

  const preds = useQuery({ queryKey: ["predictions"], queryFn: () => list() });
  const [filter, setFilter] = useState<string>("all");

  const genMut = useMutation({
    mutationFn: () => gen(),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ["predictions"] }); toast.success(`${r.inserted} predictions generated`); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolveMut = useMutation({
    mutationFn: (v: { id: string; outcome: boolean }) => resolve({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });

  const items = preds.data ?? [];
  const visible = filter === "all" ? items : items.filter((p: any) => p.category === filter);
  const stats = useMemo(() => {
    const resolved = items.filter((p: any) => p.resolved);
    const hits = resolved.filter((p: any) => p.outcome).length;
    const brier = resolved.length
      ? resolved.reduce((acc: number, p: any) => acc + Math.pow(Number(p.probability) - (p.outcome ? 1 : 0), 2), 0) / resolved.length
      : null;
    return { total: items.length, resolved: resolved.length, hits, accuracy: resolved.length ? hits / resolved.length : null, brier };
  }, [items]);

  const categories = ["all", "weather", "market", "seismic", "space", "world", "personal"];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TrendingUp className="h-6 w-6 text-primary" /> Foresight</h1>
          <p className="text-sm text-muted-foreground">Calibrated predictions grounded in your live data. Every claim is cited and auditable.</p>
        </div>
        <button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-60"
        >
          {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          {genMut.isPending ? "Forecasting…" : "Generate new predictions"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Resolved" value={String(stats.resolved)} />
        <Stat label="Accuracy" value={stats.accuracy == null ? "—" : `${Math.round(stats.accuracy * 100)}%`} />
        <Stat label="Brier score" value={stats.brier == null ? "—" : stats.brier.toFixed(2)} hint="lower is better · <0.25 well-calibrated" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition ${filter === c ? "border-primary bg-primary/15 text-primary" : "border-glass-border text-muted-foreground hover:text-foreground"}`}
          >{c}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-muted-foreground">
          {preds.isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : "No predictions yet. Generate your first batch above."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((p: any) => (
            <PredictionCard key={p.id} p={p} onResolve={(outcome) => resolveMut.mutate({ id: p.id, outcome })} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PredictionCard({ p, onResolve }: { p: any; onResolve: (outcome: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(Number(p.probability) * 100);
  const tone = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.world;
  const bar = pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : pct >= 25 ? "bg-orange-400" : "bg-rose-400";

  return (
    <article className={`liquid-glass rounded-2xl p-5 ${p.resolved ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>{p.category}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.horizon}</span>
            {p.resolved && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.outcome ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                {p.outcome ? <><CheckCircle2 className="h-3 w-3" /> Hit</> : <><XCircle className="h-3 w-3" /> Miss</>}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">{p.claim}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold tabular-nums">{pct}%</p>
          <p className="text-[10px] uppercase text-muted-foreground">confidence</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>

      <button onClick={() => setExpanded((v) => !v)} className="mt-3 text-[11px] font-medium text-primary hover:underline">
        {expanded ? "Hide audit trail" : "Audit trail"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-glass-border pt-3">
          {p.reasoning && <div><p className="text-[10px] uppercase text-muted-foreground">Reasoning</p><p className="mt-1 text-xs leading-relaxed">{p.reasoning}</p></div>}
          {Array.isArray(p.evidence) && p.evidence.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Evidence</p>
              <ul className="mt-1 space-y-1">
                {p.evidence.map((e: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {e}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(p.sources) && p.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.sources.map((s: any, i: number) => <TrustBadge key={i} source={s.source ?? s.label ?? "source"} updatedAt={p.created_at} level="verified" />)}
            </div>
          )}
        </div>
      )}

      {!p.resolved && (
        <div className="mt-3 flex items-center gap-2 border-t border-glass-border pt-3">
          <span className="text-[10px] uppercase text-muted-foreground">Did this happen?</span>
          <button onClick={() => onResolve(true)} className="liquid-control inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"><ThumbsUp className="h-3 w-3" /> Hit</button>
          <button onClick={() => onResolve(false)} className="liquid-control inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"><ThumbsDown className="h-3 w-3" /> Miss</button>
        </div>
      )}
    </article>
  );
}
