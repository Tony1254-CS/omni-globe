import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LocationResult = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  timezone: string;
};

export const searchLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(data.query)}&count=8&language=en&format=json`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) throw new Error("Location search is temporarily unavailable");
    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    return (payload.results ?? []).map((item) => ({
      id: String(item.id ?? `${item.latitude}-${item.longitude}`),
      label: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
      lat: Number(item.latitude),
      lon: Number(item.longitude),
      timezone: String(item.timezone ?? "UTC"),
    })) satisfies LocationResult[];
  });