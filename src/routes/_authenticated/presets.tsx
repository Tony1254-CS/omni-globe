import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRESETS } from "@/lib/presets";
import { installPreset } from "@/lib/presets.functions";

export const Route = createFileRoute("/_authenticated/presets")({
  head: () => ({
    meta: [
      { title: "Presets · OMNISPHERE" },
      { name: "description", content: "One-click dashboard packs for humanitarian, financial, travel and space workflows." },
    ],
  }),
  component: PresetsPage,
});

function PresetsPage() {
  const navigate = useNavigate();
  const installMut = useMutation({
    mutationFn: (id: string) => installPreset({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Installed ${r.count} widgets`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" /> Vertical Presets</h1>
          <p className="text-sm text-muted-foreground">Install a curated widget pack onto your dashboard.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {PRESETS.map((p) => (
            <Card key={p.id} className="glass-panel space-y-3 p-5">
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.widgets.map((w, i) => (
                  <span key={i} className="rounded bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{w.widget_type}</span>
                ))}
              </div>
              <Button onClick={() => installMut.mutate(p.id)} disabled={installMut.isPending}>
                {installMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Install
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
