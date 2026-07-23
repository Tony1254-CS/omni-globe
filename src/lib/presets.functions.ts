import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRESETS } from "./presets";

export const installPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const preset = PRESETS.find((p) => p.id === data.id);
    if (!preset) throw new Error("Unknown preset");

    // Find current max y to append below existing widgets.
    const { data: existing } = await context.supabase.from("widget_configs").select("y, h");
    const maxY = (existing ?? []).reduce((m, w) => Math.max(m, (w.y as number) + (w.h as number)), 0);

    const rows = preset.widgets.map((w) => ({
      user_id: context.userId,
      widget_type: w.widget_type,
      x: w.x,
      y: w.y + maxY,
      w: w.w,
      h: w.h,
      settings: w.settings,
    }));
    const { error } = await context.supabase.from("widget_configs").insert(rows);
    if (error) throw error;

    const { awardAchievement } = await import("./achievements.server");
    await awardAchievement(context.userId, "preset_installed");

    return { ok: true, count: rows.length };
  });
