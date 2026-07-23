import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

async function evaluateTrigger(trig: string, params: Record<string, unknown>): Promise<{ hit: boolean; value?: number; detail?: string }> {
  try {
    const { fetchWidgetData } = await import("@/lib/widget-data.server");
    if (trig === "crypto") {
      const coin = String(params.coin ?? "bitcoin");
      const cmp = String(params.comparator ?? "gt");
      const threshold = Number(params.threshold ?? 0);
      const raw = (await fetchWidgetData("crypto", { coins: coin })) as { data: { prices: Array<{ id: string; usd: number }> } };
      const price = raw.data.prices.find((p) => p.id === coin)?.usd;
      if (price == null) return { hit: false };
      const hit = cmp === "gt" ? price > threshold : price < threshold;
      return { hit, value: price, detail: `${coin} $${price}` };
    }
    if (trig === "earthquake") {
      const minMag = Number(params.minMagnitude ?? 5);
      const raw = (await fetchWidgetData("earthquakes", { minMagnitude: minMag })) as { data: { quakes: Array<{ mag: number; place: string }> } };
      const worst = raw.data.quakes.reduce((max, q) => (q.mag > max.mag ? q : max), raw.data.quakes[0] ?? { mag: 0, place: "" });
      if (!worst || worst.mag < minMag) return { hit: false };
      return { hit: true, value: worst.mag, detail: `M${worst.mag} ${worst.place}` };
    }
    if (trig === "schedule") {
      return { hit: true, detail: "scheduled tick" };
    }
    return { hit: false };
  } catch (e) {
    return { hit: false, detail: `trigger error: ${(e as Error).message}` };
  }
}

async function runAction(
  admin: ReturnType<typeof createClient>,
  userId: string,
  kind: string,
  params: Record<string, unknown>,
  detail: string,
) {
  if (kind === "notify" || kind === "journal") {
    await admin.from("journal").insert({
      user_id: userId,
      kind: kind === "notify" ? "notification" : "journal",
      title: String(params.title ?? "Automation fired"),
      body: `${String(params.body ?? "")}\n${detail}`.trim(),
    });
    return;
  }
  if (kind === "briefing") {
    // Insert a stub briefing entry; the user can regenerate on the briefing page.
    await admin.from("journal").insert({
      user_id: userId,
      kind: "briefing_request",
      title: "Automation requested a briefing",
      body: detail,
    });
    return;
  }
}

export const Route = createFileRoute("/api/public/hooks/run-automations")({
  server: {
    handlers: {
      POST: async () => {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return new Response("misconfigured", { status: 500 });
        }
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: rules, error } = await admin
          .from("automations")
          .select("*")
          .eq("enabled", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let fired = 0;
        for (const r of rules ?? []) {
          const result = await evaluateTrigger(r.trigger_kind as string, (r.trigger_params as Record<string, unknown>) ?? {});
          const status = result.hit ? "fired" : "skipped";
          if (result.hit) {
            await runAction(admin, r.user_id as string, r.action_kind as string, (r.action_params as Record<string, unknown>) ?? {}, result.detail ?? "");
            fired++;
          }
          await admin.from("automation_runs").insert({
            automation_id: r.id,
            user_id: r.user_id,
            status,
            detail: result.detail ?? null,
          });
          await admin.from("automations").update({ last_ran_at: new Date().toISOString() }).eq("id", r.id);
        }

        return Response.json({ ok: true, evaluated: (rules ?? []).length, fired });
      },
    },
  },
});
