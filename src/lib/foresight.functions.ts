import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("predictions")
      .select("id, batch_id, claim, category, probability, horizon, reasoning, sources, evidence, resolved, outcome, resolved_at, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data;
  });

export const generatePredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildSnapshotForForesight, synthesizePredictions } = await import("./foresight.server");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("home_label, home_lat, home_lon")
      .eq("id", userId)
      .maybeSingle();

    const home = profile?.home_lat != null && profile?.home_lon != null
      ? { label: profile.home_label ?? "Home", lat: Number(profile.home_lat), lon: Number(profile.home_lon) }
      : null;

    const snapshot = await buildSnapshotForForesight(home);
    const preds = await synthesizePredictions(snapshot);

    if (preds.length === 0) return { inserted: 0, batch_id: null };

    const batchId = crypto.randomUUID();
    const rows = preds.map((p) => ({
      user_id: userId,
      batch_id: batchId,
      claim: p.claim,
      category: p.category,
      probability: Math.max(0, Math.min(1, Number(p.probability))),
      horizon: p.horizon,
      reasoning: p.reasoning ?? null,
      sources: (p.sources ?? []) as any,
      evidence: (p.evidence ?? []) as any,
    }));

    const { error } = await supabase.from("predictions").insert(rows);
    if (error) throw error;
    return { inserted: rows.length, batch_id: batchId };
  });

export const resolvePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), outcome: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("predictions")
      .update({ resolved: true, outcome: data.outcome, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
