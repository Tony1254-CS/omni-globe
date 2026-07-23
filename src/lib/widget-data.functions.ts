import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingValue = z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()]);

export const getWidgetData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    type: z.string().min(1).max(60),
    settings: z.record(z.string().max(60), settingValue),
  }).parse(input))
  .handler(async ({ data }) => {
    const { fetchWidgetData } = await import("./widget-data.server");
    try {
      return await fetchWidgetData(data.type, data.settings);
    } catch (err) {
      const retryAt = typeof err === "object" && err && "retryAt" in err ? new Date(Number((err as { retryAt: number }).retryAt)).toISOString() : undefined;
      const rateLimited = err instanceof Error && /429|cooling down/i.test(err.message);
      return {
        type: data.type,
        source: "error",
        updatedAt: new Date().toISOString(),
        data: null,
        error: err instanceof Error ? err.message : "Failed to load data",
        retryAt,
        status: rateLimited ? "rate-limited" as const : "unavailable" as const,
      };
    }
  });