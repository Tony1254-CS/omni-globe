import { buildPulseSnapshot } from "./pulse.server";

export type Prediction = {
  claim: string;
  category: "weather" | "market" | "seismic" | "space" | "world" | "personal";
  probability: number; // 0..1
  horizon: string; // e.g. "next 24h", "48-72h", "next 7 days"
  reasoning: string;
  sources: Array<{ label: string; source: string }>;
  evidence: string[]; // 1-3 concrete data points from the snapshot
};

export async function synthesizePredictions(snapshot: any): Promise<Prediction[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const system = `You are OMNISPHERE Foresight: a calibrated probabilistic forecaster. From the snapshot JSON, output 4-6 falsifiable predictions as ONE JSON object:
{ "predictions": [ { "claim": string (≤120 chars, specific & falsifiable), "category": "weather"|"market"|"seismic"|"space"|"world"|"personal", "probability": number (0..1, well-calibrated — avoid 0.5 unless truly uncertain, avoid >0.9 unless overwhelming evidence), "horizon": string (e.g. "next 24h","48-72h","next 7 days"), "reasoning": string (≤200 chars, why this probability), "sources": [{"label": string, "source": string}], "evidence": [string, ...] (1-3 concrete facts from the snapshot) } ] }
Rules:
- Only make predictions grounded in the snapshot data. Do not invent facts.
- Each claim must be falsifiable ("BTC closes above $X by Y" not "BTC will do well").
- Calibration matters: if the data is weak, use 0.3-0.6, not 0.9.
- Avoid duplicates. Mix categories.
- Output ONLY valid JSON. No prose, no code fences.`;

  const user = JSON.stringify(snapshot);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to your Lovable workspace.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const body = await res.json() as any;
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  try {
    const parsed = JSON.parse(content);
    const preds: Prediction[] = Array.isArray(parsed?.predictions) ? parsed.predictions : [];
    return preds.filter((p) => p && typeof p.claim === "string" && typeof p.probability === "number").slice(0, 6);
  } catch {
    throw new Error("Foresight AI returned invalid JSON");
  }
}

export async function buildSnapshotForForesight(home: { label: string; lat: number; lon: number } | null) {
  return buildPulseSnapshot(home);
}
