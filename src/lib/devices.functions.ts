import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function rand(n: number) {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const NewDevice = z.object({
  name: z.string().min(1).max(80),
  metric: z.string().min(1).max(40).default("value"),
  unit: z.string().max(20).optional(),
});

export const listDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("devices").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewDevice.parse(input))
  .handler(async ({ data, context }) => {
    const device_key = `dev_${rand(10)}`;
    const hmac_secret = rand(32);
    const { data: row, error } = await context.supabase
      .from("devices")
      .insert({ ...data, device_key, hmac_secret, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    const { awardAchievement } = await import("./achievements.server");
    await awardAchievement(context.userId, "first_device");
    return row;
  });

export const deleteDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("devices").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const pushSimulatedReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ device_id: z.string().uuid(), value: z.number().finite() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("device_readings")
      .insert({ device_id: data.device_id, value: data.value, user_id: context.userId });
    if (error) throw error;
    return { ok: true };
  });

export const listReadings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ device_id: z.string().uuid(), limit: z.number().int().min(1).max(500).default(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("device_readings")
      .select("value, recorded_at")
      .eq("device_id", data.device_id)
      .order("recorded_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return (rows ?? []).reverse();
  });
