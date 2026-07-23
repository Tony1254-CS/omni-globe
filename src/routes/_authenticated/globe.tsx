import { createFileRoute } from "@tanstack/react-router";
import GlobeInner from "@/components/omni/GlobeInner";

export const Route = createFileRoute("/_authenticated/globe")({
  head: () => ({
    meta: [
      { title: "Globe — OMNISPHERE" },
      { name: "description", content: "Live 3D globe with ISS tracking, earthquake pulses, and your favourite locations." },
      { property: "og:title", content: "OMNISPHERE Globe — the planet, live" },
      { property: "og:description", content: "Watch the ISS orbit, earthquakes pulse, and your saved locations on an interactive 3D globe." },
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

function GlobePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Globe</h1>
        <p className="text-sm text-muted-foreground">
          Live view of the planet. Toggle layers on the left, click a point for details.
        </p>
      </div>
      <GlobeInner />
    </div>
  );
}
