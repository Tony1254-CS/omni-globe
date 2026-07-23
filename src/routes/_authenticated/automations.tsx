import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, Trash2, Zap } from "lucide-react";

import { AppShell } from "@/components/omni/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createAutomation,
  deleteAutomation,
  listAutomationRuns,
  listAutomations,
  toggleAutomation,
} from "@/lib/automations.functions";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations · OMNISPHERE" },
      { name: "description", content: "Trigger → action rules that watch your world and act on it." },
    ],
  }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const qc = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ["automations"], queryFn: () => listAutomations() });
  const { data: runs } = useQuery({ queryKey: ["automation-runs"], queryFn: () => listAutomationRuns(), refetchInterval: 15_000 });

  const [name, setName] = useState("BTC over $80k");
  const [trigger, setTrigger] = useState("crypto");
  const [triggerParams, setTriggerParams] = useState<Record<string, string>>({ coin: "bitcoin", comparator: "gt", threshold: "80000" });
  const [action, setAction] = useState("notify");
  const [actionTitle, setActionTitle] = useState("Bitcoin crossed threshold");

  const createMut = useMutation({
    mutationFn: () => createAutomation({
      data: {
        name,
        trigger_kind: trigger as never,
        trigger_params: {
          ...triggerParams,
          ...(triggerParams.threshold ? { threshold: Number(triggerParams.threshold) } : {}),
          ...(triggerParams.minMagnitude ? { minMagnitude: Number(triggerParams.minMagnitude) } : {}),
        },
        action_kind: action as never,
        action_params: { title: actionTitle },
        enabled: true,
      },
    }),
    onSuccess: () => {
      toast.success("Automation created");
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleAutomation({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteAutomation({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Zap className="h-6 w-6 text-primary" /> Automations</h1>
          <p className="text-sm text-muted-foreground">If <em>this</em> happens, do <em>that</em>. Rules run every 5 minutes.</p>
        </header>

        <Card className="glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">New rule</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={(v) => { setTrigger(v); setTriggerParams(v === "earthquake" ? { minMagnitude: "5" } : v === "schedule" ? {} : { coin: "bitcoin", comparator: "gt", threshold: "80000" }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto price</SelectItem>
                  <SelectItem value="earthquake">Earthquake magnitude</SelectItem>
                  <SelectItem value="schedule">Schedule (every run)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trigger === "crypto" && (
              <>
                <div><Label>Coin</Label><Input value={triggerParams.coin ?? ""} onChange={(e) => setTriggerParams({ ...triggerParams, coin: e.target.value })} /></div>
                <div><Label>Comparator</Label>
                  <Select value={triggerParams.comparator ?? "gt"} onValueChange={(v) => setTriggerParams({ ...triggerParams, comparator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="gt">greater than</SelectItem><SelectItem value="lt">less than</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Threshold (USD)</Label><Input type="number" value={triggerParams.threshold ?? ""} onChange={(e) => setTriggerParams({ ...triggerParams, threshold: e.target.value })} /></div>
              </>
            )}
            {trigger === "earthquake" && (
              <div><Label>Min magnitude</Label><Input type="number" step="0.1" value={triggerParams.minMagnitude ?? ""} onChange={(e) => setTriggerParams({ ...triggerParams, minMagnitude: e.target.value })} /></div>
            )}
            <div>
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">Notify me (journal)</SelectItem>
                  <SelectItem value="journal">Append to journal</SelectItem>
                  <SelectItem value="briefing">Request briefing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message title</Label>
              <Input value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create rule
          </Button>
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Your rules</h2>
          <div className="space-y-2">
            {(rules ?? []).length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
            {(rules ?? []).map((r) => (
              <Card key={r.id} className="glass-panel flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.trigger_kind} → {r.action_kind}
                    {r.last_ran_at ? ` · last ran ${new Date(r.last_ran_at).toLocaleTimeString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.enabled} onCheckedChange={(v) => toggleMut.mutate({ id: r.id, enabled: v })} />
                  <Button variant="ghost" size="icon" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Bell className="h-4 w-4" /> Recent runs</h2>
          <div className="space-y-1">
            {(runs ?? []).length === 0 && <p className="text-sm text-muted-foreground">No runs yet — cron ticks every 5 min.</p>}
            {(runs ?? []).map((run) => (
              <div key={run.id} className="glass-panel flex items-center justify-between rounded px-3 py-2 text-xs">
                <span className={run.status === "fired" ? "text-primary" : "text-muted-foreground"}>{run.status}</span>
                <span className="flex-1 truncate px-3">{run.detail ?? ""}</span>
                <span className="text-muted-foreground">{new Date(run.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
