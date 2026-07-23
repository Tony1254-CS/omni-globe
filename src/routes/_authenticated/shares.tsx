import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Share2, Trash2, Copy } from "lucide-react";

import { AppShell } from "@/components/omni/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createShare, deleteShare, listShares } from "@/lib/shares.functions";

export const Route = createFileRoute("/_authenticated/shares")({
  head: () => ({
    meta: [
      { title: "Shared Dashboards · OMNISPHERE" },
      { name: "description", content: "Publish a snapshot of your dashboard and share it with a link." },
    ],
  }),
  component: SharesPage,
});

function SharesPage() {
  const qc = useQueryClient();
  const { data: shares } = useQuery({ queryKey: ["shares"], queryFn: () => listShares() });
  const [title, setTitle] = useState("My command center");

  const createMut = useMutation({
    mutationFn: () => createShare({ data: { title } }),
    onSuccess: () => { toast.success("Share link created"); qc.invalidateQueries({ queryKey: ["shares"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteShare({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
  });

  const base = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Share2 className="h-6 w-6 text-primary" /> Shared Dashboards</h1>
          <p className="text-sm text-muted-foreground">Public read-only snapshots of your current widget layout.</p>
        </header>

        <Card className="glass-panel space-y-2 p-4">
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Share title" />
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>Create share</Button>
          </div>
        </Card>

        <div className="space-y-2">
          {(shares ?? []).map((s) => {
            const url = `${base}/s/${s.slug}`;
            return (
              <Card key={s.id} className="glass-panel flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{url}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => delMut.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
          {(shares ?? []).length === 0 && <p className="text-sm text-muted-foreground">No shares yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
