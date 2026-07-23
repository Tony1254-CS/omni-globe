import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: catalog }, { data: unlocked }] = await Promise.all([
      context.supabase.from("achievements").select("*"),
      context.supabase.from("user_achievements").select("code, unlocked_at").eq("user_id", context.userId),
    ]);
    const map = new Map((unlocked ?? []).map((u) => [u.code as string, u.unlocked_at as string]));
    return (catalog ?? []).map((a) => ({
      ...a,
      unlocked_at: map.get(a.code as string) ?? null,
    }));
  });
