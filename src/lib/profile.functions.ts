import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

const ProfileUpdate = z.object({
  display_name: z.string().min(1).max(80).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  home_lat: z.number().min(-90).max(90).nullable().optional(),
  home_lon: z.number().min(-180).max(180).nullable().optional(),
  home_label: z.string().max(120).nullable().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdate.parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return updated;
  });
