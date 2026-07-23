import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  kind: z.enum(["weather", "crypto", "earthquakes"]),
  params: z.record(z.string().max(60), z.union([z.string().max(120), z.number().finite(), z.boolean(), z.null()])).default({}),
});

export const getHistoryData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { fetchHistory } = await import("./history-data.server");
    try {
      return await fetchHistory(data.kind, data.params);
    } catch (err) {
      return {
        kind: data.kind,
        source: "error",
        series: [] as Array<{ t: string; v: number }>,
        error: err instanceof Error ? err.message : "Failed to load history",
      };
    }
  });
