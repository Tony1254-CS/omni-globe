import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slug() {
  return Math.random().toString(36).slice(2, 10);
}

export const listShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shared_dashboards")
      .select("id, slug, title, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ title: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: widgets, error: werr } = await context.supabase
      .from("widget_configs")
      .select("widget_type, x, y, w, h, settings");
    if (werr) throw werr;
    const snapshot = { widgets: widgets ?? [] };
    const { data: row, error } = await context.supabase
      .from("shared_dashboards")
      .insert({ user_id: context.userId, title: data.title, slug: slug(), snapshot })
      .select()
      .single();
    if (error) throw error;
    const { awardAchievement } = await import("./achievements.server");
    await awardAchievement(context.userId, "first_share");
    return row;
  });

export const deleteShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shared_dashboards").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getShareBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(32) }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row, error } = await supa
      .from("shared_dashboards")
      .select("title, snapshot, created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    return row;
  });
