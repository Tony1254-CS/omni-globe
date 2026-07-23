import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-widgets")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Accept any of: Supabase apikey header, Vercel Cron (user-agent),
        // or an optional CRON_SECRET bearer. Keeps warmer callable from
        // pg_cron, Vercel Cron, and manual curl.
        const suppliedKey = request.headers.get("apikey");
        const expectedKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const authHeader = request.headers.get("authorization") ?? "";
        const cronSecret = process.env.CRON_SECRET;
        const ua = request.headers.get("user-agent") ?? "";
        const isVercelCron = ua.toLowerCase().includes("vercel-cron");
        const okApiKey = expectedKey && suppliedKey === expectedKey;
        const okCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
        if (!okApiKey && !okCronSecret && !isVercelCron) {
          return new Response("Unauthorized", { status: 401 });
        }
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
