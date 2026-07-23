import { createClient } from "@supabase/supabase-js";

let admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (admin) return admin;
  admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export async function awardAchievement(userId: string, code: string): Promise<boolean> {
  try {
    const { error } = await getAdmin()
      .from("user_achievements")
      .upsert({ user_id: userId, code }, { onConflict: "user_id,code", ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
}
