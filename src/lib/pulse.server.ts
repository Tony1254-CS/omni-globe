import { fetchWidgetData } from "./widget-data.server";
import { scoreWidget } from "./anomaly";

export type PulseSnapshot = {
  generatedAt: string;
  timeOfDay: "dawn" | "morning" | "afternoon" | "evening" | "night";
  home: { label: string; lat: number; lon: number } | null;
  weather: any;
  aqi: any;
  quake: any;
  crypto: any;
  space: any;
  headline: string | null;
  anomalies: Array<{ type: string; label: string; detail: string }>;
};

export type Pulse = {
  headline: string; // 8-14 words, cinematic
  subhead: string; // 12-20 words, factual
  metrics: Array<{ label: string; value: string; delta?: string; tone: "calm" | "warm" | "alert" }>;
  moment: { title: string; body: string; source: string };
  insight: string; // one-sentence "why this matters to you"
  attention: string | null; // most important anomaly, or null
  sources: Array<{ label: string; source: string; freshness: string }>;
};

function timeOfDay(d = new Date()): PulseSnapshot["timeOfDay"] {
  const h = d.getHours();
  if (h < 6) return "night";
  if (h < 9) return "dawn";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}

export async function buildPulseSnapshot(home: { label: string; lat: number; lon: number } | null): Promise<PulseSnapshot> {
  const loc = home ?? { label: "London", lat: 51.5074, lon: -0.1278 };
  const [weather, aqi, quake, crypto, space, news] = await Promise.all([
    safe(fetchWidgetData("weather", { lat: loc.lat, lon: loc.lon, label: loc.label })),
    safe(fetchWidgetData("aqi", { lat: loc.lat, lon: loc.lon, label: loc.label })),
    safe(fetchWidgetData("earthquakes", { minMagnitude: 4.5 })),
    safe(fetchWidgetData("crypto", { coins: "bitcoin,ethereum" })),
    safe(fetchWidgetData("spacex", {})),
    safe(fetchWidgetData("news", { query: "world" })),
  ]);

  const anomalies: PulseSnapshot["anomalies"] = [];
  const check = (type: string, r: any) => {
    const s = scoreWidget(type, r?.data);
    if (s && s.level !== "calm") anomalies.push({ type, label: s.label, detail: s.detail });
  };
  check("weather", weather); check("aqi", aqi); check("earthquakes", quake); check("crypto", crypto);

  const headline = (news?.data as any)?.items?.[0]?.title ?? null;

  return {
    generatedAt: new Date().toISOString(),
    timeOfDay: timeOfDay(),
    home,
    weather: weather?.data ?? null,
    aqi: aqi?.data ?? null,
    quake: quake?.data ?? null,
    crypto: crypto?.data ?? null,
    space: space?.data ?? null,
    headline,
    anomalies,
  };
}

export async function synthesizePulse(snap: PulseSnapshot): Promise<Pulse> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const system = `You are OMNISPHERE Pulse: a cinematic morning briefing engine. From the JSON snapshot, output ONE compact JSON object matching this schema exactly:
{
  "headline": string (8-14 words, cinematic, present tense, no clickbait),
  "subhead": string (12-20 words, factual, grounds the headline),
  "metrics": array of 3-4 { "label": string (max 14 chars), "value": string (max 10 chars), "delta"?: string (max 10 chars), "tone": "calm"|"warm"|"alert" },
  "moment": { "title": string (max 60 chars), "body": string (max 200 chars, one specific fact from the data), "source": string (max 24 chars) },
  "insight": string (one sentence, max 140 chars, "why this matters to you"),
  "attention": string or null (most urgent anomaly in ≤80 chars, or null if all calm),
  "sources": array of { "label": string, "source": string, "freshness": string }
}
Rules:
- Never invent numbers not in the snapshot. If a field is null, omit metrics that depend on it.
- Tone "alert" only for anomalies. "warm" for notable-but-not-dangerous. "calm" default.
- Use the user's home location name in the headline when present.
- Output ONLY valid JSON. No markdown, no prose, no code fences.`;

  const user = JSON.stringify(snap);

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
    signal: AbortSignal.timeout(45000),
  });
  if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to your Lovable workspace.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const body = await res.json() as any;
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  try {
    return JSON.parse(content) as Pulse;
  } catch {
    throw new Error("Pulse AI returned invalid JSON");
  }
}
