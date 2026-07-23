import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/hooks/device-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: { device_key?: string; value?: number };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        const sig = request.headers.get("x-signature") ?? "";
        if (!payload.device_key || typeof payload.value !== "number") {
          return new Response("bad payload", { status: 400 });
        }

        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: device, error } = await admin
          .from("devices")
          .select("id, user_id, hmac_secret")
          .eq("device_key", payload.device_key)
          .maybeSingle();
        if (error || !device) return new Response("unknown device", { status: 404 });

        const expected = createHmac("sha256", device.hmac_secret as string).update(body).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("bad signature", { status: 401 });
        }

        const { error: insErr } = await admin.from("device_readings").insert({
          device_id: device.id,
          user_id: device.user_id,
          value: payload.value,
        });
        if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
