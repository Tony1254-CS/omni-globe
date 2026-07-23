import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import GlobeInner from "@/components/omni/GlobeInner";
import { TimelineScrubber } from "@/components/omni/TimelineScrubber";
import { OnThisDayTray } from "@/components/omni/OnThisDayTray";
import { MilestoneNarration } from "@/components/omni/MilestoneNarration";
import { getDaySnapshotFn, listMilestones } from "@/lib/timemachine.functions";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/_authenticated/globe")({
  head: () => ({
    meta: [
      { title: "Time Machine — OMNISPHERE" },
      { name: "description", content: "Rewind the planet: scrub decades of satellite imagery, earthquakes and headlines on an interactive 3D globe." },
      { property: "og:title", content: "OMNISPHERE Time Machine — the planet, any day" },
      { property: "og:description", content: "Drag the timeline to any date and see the Earth's satellite view, earthquakes and top headlines from that moment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GlobePage,
  errorComponent: ({ error }) => (
    <div className="glass p-8 text-center text-sm text-muted-foreground">
      Globe failed to load: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="glass p-8 text-center">Not found</div>,
});

function todayISO() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function GlobePage() {
  const [timeMachineOn, setTimeMachineOn] = useState(false);
  const [date, setDate] = useState<string>(todayISO());
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; key: string } | null>(null);

  const debouncedDate = useDebounce(date, 300);

  const snapshotFn = useServerFn(getDaySnapshotFn);
  const listFn = useServerFn(listMilestones);

  const snapshot = useQuery({
    queryKey: ["timemachine", debouncedDate],
    queryFn: () => snapshotFn({ data: { date: debouncedDate } }),
    enabled: timeMachineOn,
    staleTime: 5 * 60_000,
  });

  const milestones = useQuery({
    queryKey: ["milestones"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });

  const historicalImageUrl = useMemo(
    () => (timeMachineOn && snapshot.data?.gibs?.available ? snapshot.data.gibs.templateUrl : null),
    [timeMachineOn, snapshot.data],
  );

  const jumpToMilestone = (d: string) => {
    setTimeMachineOn(true);
    setDate(d);
    // fly-to home if we have coords in the milestone (future enhancement)
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Globe {timeMachineOn && <span className="text-primary">· Time Machine</span>}</h1>
          <p className="text-sm text-muted-foreground">
            {timeMachineOn
              ? "Drag the timeline to any date. The planet, quakes and headlines rewind with you."
              : "Live view of the planet. Toggle Time Machine to rewind decades of history."}
          </p>
        </div>
        <Button
          variant={timeMachineOn ? "default" : "outline"}
          onClick={() => setTimeMachineOn((v) => !v)}
          className="gap-2"
        >
          {timeMachineOn ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {timeMachineOn ? "Exit Time Machine" : "Time Machine"}
        </Button>
      </div>

      <GlobeInner
        historicalDate={timeMachineOn ? date : null}
        historicalImageUrl={historicalImageUrl}
        historicalQuakes={timeMachineOn ? snapshot.data?.quakes ?? [] : []}
        flyTo={flyTo}
      />

      {timeMachineOn && (
        <>
          <TimelineScrubber date={date} onChange={setDate} />
          <OnThisDayTray snapshot={snapshot.data ?? null} loading={snapshot.isLoading || snapshot.isFetching} />
          <MilestoneNarration milestones={milestones.data ?? []} onJumpTo={jumpToMilestone} />
        </>
      )}
    </div>
  );
}
