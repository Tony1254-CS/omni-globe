import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let admin: any = null;
function getAdmin() {
  if (admin) return admin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin = createClient<any>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
