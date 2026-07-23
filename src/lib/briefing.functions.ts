import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBriefings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("briefings")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  });

export const generateBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildSnapshot, generateBriefingMarkdown } = await import("./briefing.server");
    const { supabase, userId } = context;

    const [favResp, widgetResp] = await Promise.all([
      supabase.from("favourite_locations").select("label, lat, lon").order("sort_order").limit(10),
      supabase.from("widget_configs").select("widget_type, settings").limit(30),
    ]);
    if (favResp.error) throw favResp.error;
    if (widgetResp.error) throw widgetResp.error;

    const snapshot = await buildSnapshot({
      favourites: (favResp.data ?? []).map((f) => ({ label: f.label, lat: Number(f.lat), lon: Number(f.lon) })),
      widgets: (widgetResp.data ?? []).map((w) => ({ type: w.widget_type, settings: (w.settings as any) ?? {} })),
    });

    const content = await generateBriefingMarkdown(snapshot);

    const { data, error } = await supabase
      .from("briefings")
      .insert({ user_id: userId, content, snapshot: snapshot as any })
      .select("id, content, created_at")
      .single();
    if (error) throw error;
    return data;
  });

export const deleteBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("briefings").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
