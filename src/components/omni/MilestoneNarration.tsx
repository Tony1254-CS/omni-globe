import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { narrateMilestoneFn } from "@/lib/timemachine.functions";
import { toast } from "sonner";

type Milestone = { id: string; label: string; occurred_at: string; kind: string };

export function MilestoneNarration({
  milestones,
  onJumpTo,
}: {
  milestones: Milestone[];
  onJumpTo: (date: string) => void;
}) {
  const narrateFn = useServerFn(narrateMilestoneFn);
  const narrate = useMutation({
    mutationFn: (m: Milestone) => narrateFn({ data: { label: m.label, date: m.occurred_at } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-neon-purple" />
        <h3 className="text-sm font-semibold">Your milestones</h3>
      </div>

      {milestones.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add milestones (birthday, graduation, etc.) in Settings → Personal Milestones. Then click one here to fly the globe to that date and get an AI narration of what the world was doing.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="rounded border border-glass-border p-2 bg-black/20">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{m.occurred_at}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => onJumpTo(m.occurred_at)}>
                    Jump
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { onJumpTo(m.occurred_at); narrate.mutate(m); }}
                    disabled={narrate.isPending && narrate.variables?.id === m.id}
                  >
                    {narrate.isPending && narrate.variables?.id === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Narrate"}
                  </Button>
                </div>
              </div>
              {narrate.data && narrate.variables?.id === m.id && (
                <p className="mt-2 text-xs leading-relaxed text-foreground/90 border-t border-glass-border pt-2">
                  {narrate.data.narration}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
