import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Plus, Send, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/omni/AppShell";
import { askOracle, createThread, deleteThread, listMessages, listThreads } from "@/lib/oracle.functions";

export const Route = createFileRoute("/_authenticated/oracle")({
  head: () => ({
    meta: [
      { title: "Causal Oracle — OMNISPHERE" },
      { name: "description", content: "Ask multi-step 'why' and 'what if' questions across weather, markets, space and geopolitics." },
      { property: "og:title", content: "Causal Oracle — OMNISPHERE" },
      { property: "og:description", content: "The planet's cause-and-effect brain." },
    ],
  }),
  component: OraclePage,
});

const SUGGESTIONS = [
  "Why are oil prices moving today?",
  "What if a category-5 storm hit Tokyo this week?",
  "How could tomorrow's earthquakes affect global supply chains?",
  "Explain the link between solar activity and satellite outages.",
];

function OraclePage() {
  const qc = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const createT = useServerFn(createThread);
  const deleteT = useServerFn(deleteThread);
  const fetchMsgs = useServerFn(listMessages);
  const ask = useServerFn(askOracle);

  const threads = useQuery({ queryKey: ["oracle-threads"], queryFn: () => fetchThreads() });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && threads.data?.[0]) setActiveId(threads.data[0].id);
  }, [threads.data, activeId]);

  const messages = useQuery({
    queryKey: ["oracle-msgs", activeId],
    queryFn: () => fetchMsgs({ data: { threadId: activeId! } }),
    enabled: !!activeId,
  });

  const newThread = useMutation({
    mutationFn: () => createT(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["oracle-threads"] });
      setActiveId(t.id);
    },
  });

  const removeThread = useMutation({
    mutationFn: (id: string) => deleteT({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oracle-threads"] });
      setActiveId(null);
    },
  });

  const send = useMutation({
    mutationFn: (question: string) => ask({ data: { threadId: activeId!, question } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oracle-msgs", activeId] });
      qc.invalidateQueries({ queryKey: ["oracle-threads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, send.isPending]);

  async function handleSend(text: string) {
    const q = text.trim();
    if (!q) return;
    let id = activeId;
    if (!id) {
      const t = await createT();
      qc.invalidateQueries({ queryKey: ["oracle-threads"] });
      setActiveId(t.id);
      id = t.id;
    }
    setInput("");
    send.mutate(q);
  }

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]" style={{ height: "calc(100vh - 8rem)" }}>
        {/* Thread list */}
        <aside className="glass flex min-h-0 flex-col p-3">
          <button
            onClick={() => newThread.mutate()}
            className="mb-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> New conversation
          </button>
          <div className="widget-content min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {threads.data?.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">No conversations yet.</p>
            )}
            {threads.data?.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-xs cursor-pointer ${
                  activeId === t.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-secondary/60"
                }`}
                onClick={() => setActiveId(t.id)}
              >
                <Brain className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeThread.mutate(t.id); }}
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat pane */}
        <section className="glass flex min-h-0 flex-col">
          <header className="flex items-center gap-2 border-b border-glass-border px-5 py-3">
            <div className="brand-orb grid h-9 w-9 place-items-center rounded-xl">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Causal Oracle</h1>
              <p className="text-[11px] text-muted-foreground">Cause-and-effect reasoning across the planet's live signals</p>
            </div>
          </header>

          <div ref={scrollRef} className="widget-content min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {(!messages.data || messages.data.length === 0) && !send.isPending && (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-md">
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <h2 className="mt-3 text-lg font-semibold">Ask the Oracle</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Multi-step "why" and "what if" reasoning about world events, markets, weather and space.
                  </p>
                  <div className="mt-6 grid gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="glass rounded-lg px-3 py-2 text-left text-xs hover:neon-border"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.data?.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary/20 text-foreground"
                    : "glass-strong text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_li]:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="glass-strong flex items-center gap-2 rounded-2xl px-4 py-3 text-xs text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Oracle is reasoning…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-center gap-2 border-t border-glass-border px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask why, what if, or how something is connected…"
              className="flex-1 rounded-xl border border-glass-border bg-secondary/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
              disabled={send.isPending}
            />
            <button
              type="submit"
              disabled={send.isPending || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" /> Ask
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
