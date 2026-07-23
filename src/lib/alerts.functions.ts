import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paramValue = z.union([z.string().max(120), z.number().finite(), z.boolean(), z.null()]);
const paramsSchema = z.record(z.string().max(60), paramValue);

const KINDS = ["crypto", "weather", "aqi", "earthquake", "fx"] as const;

const NewAlert = z.object({
  label: z.string().min(1).max(80),
  kind: z.enum(KINDS),
  comparator: z.enum(["gt", "lt"]),
  threshold: z.number().finite(),
  params: paramsSchema.default({}),
  enabled: z.boolean().default(true),
});

export const listAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewAlert.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("alerts")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    enabled: z.boolean().optional(),
    threshold: z.number().finite().optional(),
    comparator: z.enum(["gt", "lt"]).optional(),
    label: z.string().min(1).max(80).optional(),
    params: paramsSchema.optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("alerts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alerts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const evaluateAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { evaluateAllAlerts } = await import("./alerts.server");
    const { data: rows, error } = await context.supabase
      .from("alerts")
      .select("*")
      .eq("enabled", true);
    if (error) throw error;

    const evaluations = await evaluateAllAlerts(rows ?? []);
    const nowIso = new Date().toISOString();

    for (const ev of evaluations) {
      const patch: Record<string, unknown> = {
        last_checked_at: nowIso,
        last_value: ev.value ?? null,
      };
      if (ev.triggered) patch.last_triggered_at = nowIso;
      await context.supabase.from("alerts").update(patch).eq("id", ev.id);
    }

    return { evaluations };
  });
