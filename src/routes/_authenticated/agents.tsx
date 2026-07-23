import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, Play, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { AppShell } from "@/components/omni/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AGENT_TOOLS, createAgent, deleteAgent, listAgentRuns, listAgents, runAgent } from "@/lib/agents.functions";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "Agents · OMNISPHERE" },
      { name: "description", content: "Build custom AI agents with your own prompts and tools." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const qc = useQueryClient();
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => listAgents() });
  const [selected, setSelected] = useState<string | null>(null);
  const activeAgent = agents?.find((a) => a.id === selected) ?? agents?.[0];

  const [name, setName] = useState("Morning analyst");
  const [prompt, setPrompt] = useState(
    "You are a concise analyst. When asked, call getWidgetData for crypto and earthquakes, summarise anything unusual in 3 bullet points.",
  );
  const [tools, setTools] = useState<string[]>(["getWidgetData", "getForecast"]);
  const [input, setInput] = useState("Give me today's briefing.");

  const createMut = useMutation({
    mutationFn: () => createAgent({ data: { name, system_prompt: prompt, tools: tools as never, description: "" } }),
    onSuccess: (a) => {
      toast.success("Agent created");
      setSelected(a.id);
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteAgent({ data: { id } }),
    onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["agents"] }); },
  });
  const runMut = useMutation({
    mutationFn: () => runAgent({ data: { id: activeAgent!.id, input } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-runs", activeAgent?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: runs } = useQuery({
    queryKey: ["agent-runs", activeAgent?.id],
    queryFn: () => listAgentRuns({ data: { agent_id: activeAgent!.id } }),
    enabled: !!activeAgent,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-primary" /> Custom Agents</h1>
          <p className="text-sm text-muted-foreground">Ship a prompt, pick tools, run on demand.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-[280px,1fr]">
          <Card className="glass-panel space-y-3 p-3">
            <div className="space-y-2">
              {(agents ?? []).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${activeAgent?.id === a.id ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}
                >
                  <span className="truncate">{a.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); delMut.mutate(a.id); }}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                </button>
              ))}
              {(agents ?? []).length === 0 && <p className="text-xs text-muted-foreground">No agents yet.</p>}
            </div>

            <div className="border-t border-glass-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">New agent</p>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mb-2" />
              <Label className="text-xs">System prompt</Label>
              <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mb-2" />
              <Label className="text-xs">Tools</Label>
              <div className="mb-2 space-y-1">
                {AGENT_TOOLS.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={tools.includes(t)} onCheckedChange={(v) => setTools(v ? [...tools, t] : tools.filter((x) => x !== t))} />
                    {t}
                  </label>
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={() => createMut.mutate()} disabled={createMut.isPending}>Create</Button>
            </div>
          </Card>

          <div className="space-y-4">
            {activeAgent ? (
              <>
                <Card className="glass-panel p-4">
                  <h3 className="font-semibold">{activeAgent.name}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{activeAgent.system_prompt}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Tools: {activeAgent.tools?.join(", ") || "none"}</p>
                  <div className="mt-3 flex gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the agent…" />
                    <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
                      {runMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Run
                    </Button>
                  </div>
                </Card>

                <div className="space-y-3">
                  {(runs ?? []).map((r) => (
                    <Card key={r.id} className="glass-panel p-3 text-sm">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>{r.status}</span>
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground">▶ {r.input}</div>
                      <div className="prose prose-sm prose-invert mt-2 max-w-none">
                        <ReactMarkdown>{r.output ?? ""}</ReactMarkdown>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card className="glass-panel p-8 text-center text-sm text-muted-foreground">Create an agent to get started.</Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
