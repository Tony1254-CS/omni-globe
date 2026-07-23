import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const getDaySnapshotFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ date: DateStr }).parse(input))
  .handler(async ({ data }) => {
    const { getDaySnapshot } = await import("./timemachine.server");
    try {
      return await getDaySnapshot(data.date);
    } catch (err) {
      return {
        date: data.date,
        quakes: [],
        headlines: [],
        gibs: { available: false, layer: "", templateUrl: null, note: "Snapshot unavailable" },
        iss: { available: true },
        error: err instanceof Error ? err.message : "Unavailable",
      } as any;
    }
  });

export const listMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("personal_milestones")
      .select("*")
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const NewMilestone = z.object({
  label: z.string().min(1).max(120),
  occurred_at: DateStr,
  kind: z.string().min(1).max(40).default("other"),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
});

export const addMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewMilestone.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("personal_milestones")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("personal_milestones")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const narrateMilestoneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    label: z.string().min(1).max(200),
    date: DateStr,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { getDaySnapshot, narrateDay } = await import("./timemachine.server");
    const snapshot = await getDaySnapshot(data.date);
    // Grab the user's home label for a nicer narration.
    let homeLabel: string | null = null;
    try {
      const { data: p } = await context.supabase.from("profiles").select("home_label").eq("id", context.userId).maybeSingle();
      homeLabel = (p?.home_label as string) ?? null;
    } catch { /* ignore */ }
    const narration = await narrateDay({ label: data.label, date: data.date, homeLabel, snapshot });
    return { narration, snapshot };
  });
