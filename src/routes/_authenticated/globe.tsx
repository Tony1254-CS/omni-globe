import { createFileRoute } from "@tanstack/react-router";
import { Globe2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/globe")({
  head: () => ({
    meta: [
      { title: "Globe — OMNISPHERE" },
      { name: "description", content: "Full-screen live 3D globe view." },
    ],
  }),
  component: () => (
    <div className="glass grid min-h-[60vh] place-items-center p-12 text-center">
      <div>
        <Globe2 className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">Globe coming in Phase 4</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The interactive 3D globe with ISS tracking, earthquake pulses and
          weather overlays comes online after the data pipeline (Phase 2) and
          the initial widgets (Phase 3).
        </p>
      </div>
    </div>
  ),
});
