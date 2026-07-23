import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Sparkles, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { deletePulse, generatePulse, listPulses } from "@/lib/pulse.functions";
import { TrustBadge } from "@/components/omni/TrustBadge";
import type { Pulse } from "@/lib/pulse.server";

export const Route = createFileRoute("/_authenticated/pulse")({
  head: () => ({
    meta: [
      { title: "Pulse — Your world in 10 seconds · OMNISPHERE" },
      { name: "description", content: "A cinematic daily read on your world: weather, markets, space, and one thing that matters — synthesized by AI, grounded in live data." },
      { property: "og:title", content: "OMNISPHERE Pulse — the daily read on your world" },
      { property: "og:description", content: "One card. Your city, your markets, your world — every day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PulsePage,
  errorComponent: ({ error }) => <div className="glass p-8 text-center text-sm text-muted-foreground">Pulse failed: {error.message}</div>,
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

const GRADIENTS: Record<string, string> = {
  dawn: "from-orange-500/25 via-fuchsia-500/15 to-indigo-600/25",
  morning: "from-sky-400/25 via-cyan-400/15 to-indigo-600/25",
  afternoon: "from-amber-400/20 via-sky-500/15 to-blue-700/25",
  evening: "from-rose-500/25 via-purple-500/15 to-indigo-800/25",
  night: "from-indigo-800/30 via-slate-900/20 to-black/40",
};

function PulsePage() {
  const qc = useQueryClient();
  const list = useServerFn(listPulses);
  const gen = useServerFn(generatePulse);
  const del = useServerFn(deletePulse);
  const cardRef = useRef<HTMLDivElement>(null);

  const pulses = useQuery({ queryKey: ["pulses"], queryFn: () => list() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const genMut = useMutation({
    mutationFn: () => gen(),
    onSuccess: (p: any) => { qc.invalidateQueries({ queryKey: ["pulses"] }); setSelectedId(p.id); toast.success("Pulse ready"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: del, onSuccess: () => qc.invalidateQueries({ queryKey: ["pulses"] }) });

  const items = pulses.data ?? [];
  const current = items.find((x: any) => x.id === selectedId) ?? items[0];
  const pulse: Pulse | null = current?.pulse ?? null;
  const snapshot = current?.snapshot ?? null;
  const tod = snapshot?.timeOfDay ?? "morning";
  const gradient = GRADIENTS[tod] ?? GRADIENTS.morning;

  useEffect(() => {
    if (!items.length && !genMut.isPending && !pulses.isLoading) genMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, pulses.isLoading]);

  async function share() {
    if (!pulse) return;
    const text = `${pulse.headline}\n\n${pulse.subhead}\n\n— OMNISPHERE Pulse`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "OMNISPHERE Pulse", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Pulse copied to clipboard");
      }
    } catch { /* dismissed */ }
  }

  function downloadJson() {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-${new Date(current.created_at).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pulse</h1>
          <p className="text-sm text-muted-foreground">Your world in 10 seconds.</p>
        </div>
        <button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60"
        >
          {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {genMut.isPending ? "Composing…" : "Generate today's Pulse"}
        </button>
        <div className="glass p-2">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Recent</p>
          {items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No pulses yet.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((b: any) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelectedId(b.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${current?.id === b.id ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}
                  >
                    <span className="truncate">{new Date(b.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <Trash2 onClick={(e) => { e.stopPropagation(); delMut.mutate({ data: { id: b.id } }); if (selectedId === b.id) setSelectedId(null); }} className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section>
        {!pulse ? (
          <div className="glass grid min-h-[60vh] place-items-center p-10 text-center text-sm text-muted-foreground">
            {genMut.isPending || pulses.isLoading ? (
              <div className="flex flex-col items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p>Reading the planet…</p></div>
            ) : (
              <div><Sparkles className="mx-auto h-8 w-8 text-primary" /><p className="mt-2">Click <b>Generate today's Pulse</b>.</p></div>
            )}
          </div>
        ) : (
          <PulseHero
            innerRef={cardRef}
            pulse={pulse}
            gradient={gradient}
            createdAt={current.created_at}
            onShare={share}
            onDownload={downloadJson}
          />
        )}
      </section>
    </div>
  );
}

function PulseHero({ pulse, gradient, createdAt, onShare, onDownload, innerRef }: {
  pulse: Pulse; gradient: string; createdAt: string;
  onShare: () => void; onDownload: () => void;
  innerRef: React.RefObject<HTMLDivElement>;
}) {
  const toneClass = (t: string) => t === "alert" ? "text-rose-300" : t === "warm" ? "text-amber-300" : "text-emerald-300";
  const nowStr = useMemo(() => new Date(createdAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }), [createdAt]);

  return (
    <div ref={innerRef} className={`liquid-glass relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 md:p-10`}>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your Pulse · {nowStr}</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{pulse.headline}</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{pulse.subhead}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={onShare} className="liquid-control inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"><Share2 className="h-3.5 w-3.5" /> Share</button>
          <button onClick={onDownload} className="liquid-control inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"><Download className="h-3.5 w-3.5" /> JSON</button>
        </div>
      </header>

      {pulse.attention && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="h-2 w-2 shrink-0 translate-y-1.5 rounded-full bg-rose-400 animate-pulse" />
          <p><span className="font-semibold uppercase tracking-wide text-[10px] mr-2 text-rose-300">Attention</span>{pulse.attention}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {pulse.metrics?.map((m, i) => (
          <div key={i} className="liquid-glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${toneClass(m.tone)}`}>{m.value}</p>
            {m.delta && <p className="mt-0.5 text-xs text-muted-foreground">{m.delta}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <article className="liquid-glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">The moment</p>
          <h3 className="mt-2 text-lg font-semibold">{pulse.moment?.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pulse.moment?.body}</p>
          {pulse.moment?.source && <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">Source · {pulse.moment.source}</p>}
        </article>
        <aside className="liquid-glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Why it matters</p>
          <p className="mt-2 text-sm leading-relaxed">{pulse.insight}</p>
        </aside>
      </div>

      {pulse.sources?.length ? (
        <footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-glass-border pt-4">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Grounded in</span>
          {pulse.sources.map((s, i) => (
            <TrustBadge key={i} source={s.source} updatedAt={createdAt} level="verified" />
          ))}
        </footer>
      ) : null}
    </div>
  );
}
