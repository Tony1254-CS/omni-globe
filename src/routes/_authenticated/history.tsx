import { createFileRoute } from "@tanstack/react-router";
import { Radar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "History — OMNISPHERE" },
      { name: "description", content: "Historical charts and time-machine slider." },
    ],
  }),
  component: () => (
    <div className="glass grid min-h-[50vh] place-items-center p-12 text-center">
      <div>
        <Radar className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">History & time machine — Phase 8</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Once the data pipeline is running, you'll be able to rewind and see
          what the planet looked like on any past date.
        </p>
      </div>
    </div>
  ),
});
