import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-widgets")({
  server: {
    handlers: {
      POST: async () => {
        const { warmAllProviders } = await import("@/lib/widget-data.server");
        const results = await warmAllProviders();
        return Response.json({
          ok: true,
          refreshedAt: new Date().toISOString(),
          total: results.length,
          successes: results.filter((r) => r.ok).length,
          failures: results.filter((r) => !r.ok),
        });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to trigger a global provider refresh" }),
    },
  },
});
