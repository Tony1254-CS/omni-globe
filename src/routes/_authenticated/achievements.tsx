import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Lock } from "lucide-react";


import { Card } from "@/components/ui/card";
import { listAchievements } from "@/lib/achievements.functions";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements · OMNISPHERE" },
      { name: "description", content: "Milestones you've unlocked while running your command center." },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { data } = useQuery({ queryKey: ["achievements"], queryFn: () => listAchievements() });
  const total = data?.length ?? 0;
  const unlocked = (data ?? []).filter((a) => a.unlocked_at).length;

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" /> Achievements</h1>
          <p className="text-sm text-muted-foreground">{unlocked} / {total} unlocked</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((a) => (
            <Card key={a.code} className={`glass-panel flex items-start gap-3 p-4 ${a.unlocked_at ? "" : "opacity-60"}`}>
              <div className={`grid h-10 w-10 place-items-center rounded-full ${a.unlocked_at ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {a.unlocked_at ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.description}</div>
                {a.unlocked_at && <div className="mt-1 text-[10px] text-primary">Unlocked {new Date(a.unlocked_at).toLocaleDateString()}</div>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
