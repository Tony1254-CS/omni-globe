import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    type: z.enum(["weather", "aqi", "earthquakes", "crypto"]),
    params: z.record(z.string().max(60), z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()])).default({}),
  }).parse(input))
  .handler(async ({ data }) => {
    const { forecastWeather, forecastAqi, forecastAftershocks, forecastCrypto } = await import("./forecast.server");
    try {
      switch (data.type) {
        case "weather":  return await forecastWeather(Number(data.params.lat ?? 51.5072), Number(data.params.lon ?? -0.1276));
        case "aqi":      return await forecastAqi(Number(data.params.lat ?? 51.5072), Number(data.params.lon ?? -0.1276));
        case "earthquakes": return await forecastAftershocks();
        case "crypto":   return await forecastCrypto(String(data.params.coin ?? "bitcoin"));
      }
    } catch (err) {
      return { headline: "Forecast unavailable", detail: err instanceof Error ? err.message : "Provider error", confidence: 0, method: "-", source: "-" };
    }
  });
