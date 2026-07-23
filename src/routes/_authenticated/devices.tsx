import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Loader2, Trash2, Zap } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { AppShell } from "@/components/omni/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDevice, deleteDevice, listDevices, listReadings, pushSimulatedReading } from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({
    meta: [
      { title: "Devices · OMNISPHERE" },
      { name: "description", content: "IoT devices with HMAC-signed ingest and a live simulator." },
    ],
  }),
  component: DevicesPage,
});

function DevicesPage() {
  const qc = useQueryClient();
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: () => listDevices() });
  const [selected, setSelected] = useState<string | null>(null);
  const active = devices?.find((d) => d.id === selected) ?? devices?.[0];

  const [name, setName] = useState("Living Room Sensor");
  const [metric, setMetric] = useState("temperature");
  const [unit, setUnit] = useState("°C");

  const createMut = useMutation({
    mutationFn: () => createDevice({ data: { name, metric, unit } }),
    onSuccess: (d) => { toast.success("Device created"); setSelected(d.id); qc.invalidateQueries({ queryKey: ["devices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteDevice({ data: { id } }),
    onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["devices"] }); },
  });
  const pushMut = useMutation({
    mutationFn: (v: { device_id: string; value: number }) => pushSimulatedReading({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["readings", active?.id] }),
  });

  const { data: readings } = useQuery({
    queryKey: ["readings", active?.id],
    queryFn: () => listReadings({ data: { device_id: active!.id, limit: 60 } }),
    enabled: !!active,
    refetchInterval: 5_000,
  });

  const chartData = (readings ?? []).map((r) => ({ t: new Date(r.recorded_at).toLocaleTimeString(), v: r.value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Cpu className="h-6 w-6 text-primary" /> IoT Devices</h1>
          <p className="text-sm text-muted-foreground">
            Register a device, then post readings via <code>POST /api/public/hooks/device-ingest</code> with an HMAC-SHA256 signature, or use the simulator below.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[300px,1fr]">
          <Card className="glass-panel space-y-3 p-3">
            <div className="space-y-1">
              {(devices ?? []).map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${active?.id === d.id ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}>
                  <span className="truncate">{d.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); delMut.mutate(d.id); }}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                </button>
              ))}
              {(devices ?? []).length === 0 && <p className="text-xs text-muted-foreground">No devices yet.</p>}
            </div>
            <div className="border-t border-glass-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">New device</p>
              <Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mb-2" />
              <Label className="text-xs">Metric</Label><Input value={metric} onChange={(e) => setMetric(e.target.value)} className="mb-2" />
              <Label className="text-xs">Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mb-2" />
              <Button size="sm" className="w-full" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create
              </Button>
            </div>
          </Card>

          {active ? (
            <div className="space-y-4">
              <Card className="glass-panel p-4">
                <h3 className="font-semibold">{active.name}</h3>
                <p className="text-xs text-muted-foreground">metric: {active.metric} {active.unit ? `(${active.unit})` : ""}</p>
                <div className="mt-3 space-y-1 rounded bg-black/40 p-3 font-mono text-xs">
                  <div><span className="text-muted-foreground">device_key:</span> {active.device_key}</div>
                  <div><span className="text-muted-foreground">hmac_secret:</span> {active.hmac_secret}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => pushMut.mutate({ device_id: active.id, value: 15 + Math.random() * 15 })}>
                    <Zap className="mr-2 h-4 w-4" /> Push random reading
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    let i = 0;
                    const iv = setInterval(() => {
                      pushMut.mutate({ device_id: active.id, value: 20 + 5 * Math.sin(i / 3) + Math.random() });
                      if (++i > 20) clearInterval(iv);
                    }, 500);
                  }}>Simulate 20 readings</Button>
                </div>
              </Card>

              <Card className="glass-panel p-4">
                <h4 className="mb-2 text-sm font-semibold">Live readings</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="t" hide />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="glass-panel p-8 text-center text-sm text-muted-foreground">Create a device to get started.</Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
