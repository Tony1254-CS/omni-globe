import { fetchWidgetData } from "./widget-data.server";
import { scoreWidget } from "./anomaly";

export type BriefingSnapshot = {
  generatedAt: string;
  locations: Array<{ label: string; lat: number; lon: number }>;
  widgets: Array<{ type: string; label?: string; summary: string; anomaly?: string }>;
  headlines: string[];
};

function summarize(type: string, data: any): string {
  if (!data) return "no data";
  try {
    switch (type) {
      case "weather": return `${data.label ?? ""} ${data.current?.temperature_2m}°C, wind ${data.current?.wind_speed_10m} km/h`;
      case "aqi": return `${data.label ?? ""} AQI ${data.current?.us_aqi}, PM2.5 ${data.current?.pm2_5}`;
      case "earthquakes": {
        const evts = data.events ?? [];
        const max = evts.reduce((m: number, e: any) => Math.max(m, e.magnitude ?? 0), 0);
        return `${evts.length} events in 24h, peak M${max.toFixed(1)}`;
      }
      case "crypto": return Object.entries(data).map(([k, v]: [string, any]) => `${k} $${v.usd} (${v.usd_24h_change?.toFixed(1)}%)`).join(", ");
      case "fx": return `${data.amount} ${data.base} = ${Object.entries(data.rates ?? {}).map(([k, v]) => `${v} ${k}`).join(", ")}`;
      case "iss": return `ISS at ${data.position?.latitude?.toFixed(1)}, ${data.position?.longitude?.toFixed(1)}`;
      case "spacex": return data?.name ? `Next launch: ${data.name} on ${data.net}` : "no upcoming";
      case "news": return (data.items ?? []).slice(0, 3).map((i: any) => i.title).join(" | ");
      case "reddit": return (data.posts ?? []).slice(0, 3).map((p: any) => p.title).join(" | ");
      default: return type;
    }
  } catch { return "unavailable"; }
}

function headlines(data: any): string[] {
  const out: string[] = [];
  if (data?.items) for (const i of data.items.slice(0, 5)) out.push(i.title);
  if (data?.posts) for (const p of data.posts.slice(0, 5)) out.push(p.title);
  return out;
}

export async function buildSnapshot(input: {
  favourites: Array<{ label: string; lat: number; lon: number }>;
  widgets: Array<{ type: string; settings: Record<string, any> }>;
}): Promise<BriefingSnapshot> {
  const widgetResults = await Promise.all(input.widgets.map(async (w) => {
    try {
      const r = await fetchWidgetData(w.type, w.settings);
      const anomaly = scoreWidget(w.type, r.data);
      return {
        type: w.type,
        label: (w.settings?.label as string) || undefined,
        summary: summarize(w.type, r.data),
        anomaly: anomaly && anomaly.level !== "calm" ? `${anomaly.label} — ${anomaly.detail}` : undefined,
        raw: r.data,
      };
    } catch (err) {
      return { type: w.type, summary: "unavailable", raw: null };
    }
  }));

  const heads: string[] = [];
  for (const w of widgetResults) heads.push(...headlines(w.raw));

  return {
    generatedAt: new Date().toISOString(),
    locations: input.favourites,
    widgets: widgetResults.map(({ raw: _raw, ...rest }) => rest),
    headlines: heads.slice(0, 8),
  };
}

export async function generateBriefingMarkdown(snapshot: BriefingSnapshot): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const system = `You are the OMNISPHERE analyst. Produce a concise, two-page executive briefing in Markdown covering: (1) Weather & environmental risks for the user's watched locations, (2) Space & science milestones, (3) Financial & markets shifts, (4) Notable world events from the headlines, (5) Recommended attention items based on flagged anomalies. Use ## section headings, short paragraphs, bullet lists. Do not invent facts beyond the snapshot provided. Keep it under 700 words.`;

  const user = `Snapshot (JSON):\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\`\n\nWrite the briefing now.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
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
  return content;
}
