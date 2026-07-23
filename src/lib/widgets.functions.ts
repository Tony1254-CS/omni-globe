import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("widget_configs")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

const NewWidget = z.object({
  widget_type: z.string().min(1).max(60),
  x: z.number().int().min(0).max(48).default(0),
  y: z.number().int().min(0).max(200).default(0),
  w: z.number().int().min(1).max(24).default(4),
  h: z.number().int().min(1).max(24).default(4),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export const addWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewWidget.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("widget_configs")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

const LayoutItem = z.object({
  id: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
});

export const saveLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(LayoutItem) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Update each row's x/y/w/h. RLS scopes to the caller.
    for (const item of data.items) {
      const { error } = await context.supabase
        .from("widget_configs")
        .update({ x: item.x, y: item.y, w: item.w, h: item.h })
        .eq("id", item.id);
      if (error) throw error;
    }
    return { ok: true, count: data.items.length };
  });

export const deleteWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("widget_configs")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
