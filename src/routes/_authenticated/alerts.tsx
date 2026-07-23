import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — OMNISPHERE" },
      { name: "description", content: "Threshold-based alerts for weather, quakes, crypto and more." },
    ],
  }),
  component: () => (
    <div className="glass grid min-h-[50vh] place-items-center p-12 text-center">
      <div>
        <Bell className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">Alerts coming in Phase 7</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Set thresholds like “BTC below 40k” or “earthquake above M6” and get
          notified in-app and by email.
        </p>
      </div>
    </div>
  ),
});
