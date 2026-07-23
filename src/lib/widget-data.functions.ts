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
    return fetchWidgetData(data.type, data.settings);
  });