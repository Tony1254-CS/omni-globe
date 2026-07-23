import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPulses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pulses")
      .select("id, pulse, snapshot, created_at")
      .order("created_at", { ascending: false })
      .limit(14);
    if (error) throw error;
    return data;
  });

export const generatePulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildPulseSnapshot, synthesizePulse } = await import("./pulse.server");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("home_label, home_lat, home_lon")
      .eq("id", userId)
      .maybeSingle();

    const home = profile?.home_lat != null && profile?.home_lon != null
      ? { label: profile.home_label ?? "Home", lat: Number(profile.home_lat), lon: Number(profile.home_lon) }
      : null;

    const snapshot = await buildPulseSnapshot(home);
    const pulse = await synthesizePulse(snapshot);

    const { data, error } = await supabase
      .from("pulses")
      .insert({ user_id: userId, snapshot: snapshot as any, pulse: pulse as any })
      .select("id, pulse, snapshot, created_at")
      .single();
    if (error) throw error;
    return data;
  });

export const deletePulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pulses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
