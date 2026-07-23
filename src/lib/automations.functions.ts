import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paramValue = z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()]);
const params = z.record(z.string().max(60), paramValue);

export const TRIGGER_KINDS = ["crypto", "weather", "aqi", "earthquake", "fx", "schedule"] as const;
export const ACTION_KINDS = ["notify", "journal", "briefing"] as const;

const NewAutomation = z.object({
  name: z.string().min(1).max(80),
  trigger_kind: z.enum(TRIGGER_KINDS),
  trigger_params: params.default({}),
  action_kind: z.enum(ACTION_KINDS),
  action_params: params.default({}),
  enabled: z.boolean().default(true),
});

export const listAutomations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewAutomation.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("automations")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    const { awardAchievement } = await import("./achievements.server");
    await awardAchievement(context.userId, "first_automation");
    return row;
  });

export const toggleAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("automations")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("automations").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listAutomationRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("automation_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });
