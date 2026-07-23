import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { deleteBriefing, generateBriefing, listBriefings } from "@/lib/briefing.functions";

export const Route = createFileRoute("/_authenticated/briefing")({
  head: () => ({
    meta: [
      { title: "Briefing — OMNISPHERE" },
      { name: "description", content: "AI-generated executive briefing summarizing weather risks, markets, space, and world events for your watched locations." },
      { property: "og:title", content: "OMNISPHERE Briefing — the planet, summarized" },
      { property: "og:description", content: "Get a two-page AI executive briefing over your live global data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BriefingPage,
  errorComponent: ({ error }) => (
    <div className="glass p-8 text-center text-sm text-muted-foreground">Briefing failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

function BriefingPage() {
  const qc = useQueryClient();
  const list = useServerFn(listBriefings);
  const gen = useServerFn(generateBriefing);
  const del = useServerFn(deleteBriefing);

  const briefings = useQuery({ queryKey: ["briefings"], queryFn: () => list() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const genMut = useMutation({
    mutationFn: () => gen(),
    onSuccess: (b: any) => {
      qc.invalidateQueries({ queryKey: ["briefings"] });
      setSelectedId(b.id);
      toast.success("Briefing ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: del,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["briefings"] }),
  });

  const items = briefings.data ?? [];
  const current = items.find((b: any) => b.id === selectedId) ?? items[0];

  function copy() {
    if (!current) return;
    navigator.clipboard.writeText(current.content);
    toast.success("Copied to clipboard");
  }
  function download() {
    if (!current) return;
    const blob = new Blob([current.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnisphere-briefing-${new Date(current.created_at).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Briefing</h1>
          <p className="text-sm text-muted-foreground">AI executive summary over your live data.</p>
        </div>
        <button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60"
        >
          {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {genMut.isPending ? "Generating…" : "Generate briefing"}
        </button>
        <div className="glass p-2">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Recent</p>
          {items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No briefings yet.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((b: any) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelectedId(b.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${
                      (current?.id === b.id) ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                    }`}
                  >
                    <span>{new Date(b.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <Trash2
                      onClick={(e) => { e.stopPropagation(); delMut.mutate({ data: { id: b.id } }); if (selectedId === b.id) setSelectedId(null); }}
                      className="h-3 w-3 text-muted-foreground hover:text-red-400"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass min-h-[60vh] p-6">
        {!current ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2">Click <b>Generate briefing</b> to produce your first AI world summary.</p>
              <p className="mt-1 text-xs">Uses your favourite locations, dashboard widgets, and current headlines.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between border-b border-glass-border pb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Generated</p>
                <p className="text-sm">{new Date(current.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copy} className="flex items-center gap-1 rounded border border-glass-border px-3 py-1.5 text-xs hover:bg-secondary"><Copy className="h-3 w-3" /> Copy</button>
                <button onClick={download} className="flex items-center gap-1 rounded border border-glass-border px-3 py-1.5 text-xs hover:bg-secondary"><Download className="h-3 w-3" /> Download</button>
              </div>
            </div>
            <article className="prose prose-invert prose-sm max-w-none prose-headings:text-primary prose-a:text-primary">
              <ReactMarkdown>{current.content}</ReactMarkdown>
            </article>
          </>
        )}
      </div>
    </div>
  );
}
