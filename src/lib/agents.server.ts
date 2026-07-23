import { fetchWidgetData } from "./widget-data.server";
import { forecastCrypto, forecastWeather, forecastAqi, forecastAftershocks } from "./forecast.server";
import type { WidgetSettings } from "./widget-data.types";

type SupabaseLike = {
  from: (t: string) => {
    select: (c: string) => { eq: (col: string, v: unknown) => Promise<{ data: unknown[] | null; error: unknown }> };
    insert: (v: unknown) => Promise<{ error: unknown }>;
  };
};

type Agent = {
  id: string;
  system_prompt: string;
  tools: string[];
  model: string;
};

type Step = { role: "assistant" | "tool"; content: string; tool?: string; args?: unknown };

const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "getWidgetData",
      description: "Fetch the latest data for one of the OMNISPHERE widgets (weather, aqi, earthquakes, iss, crypto, fx, news, reddit, apod, mars, neo, spacex, quote, covid, countries, github, clocks).",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Widget type id" },
          settings: { type: "object", description: "Optional per-widget settings" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getForecast",
      description: "Compute a short-horizon forecast for a widget type using its live data.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string" },
          settings: { type: "object" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listAlerts",
      description: "List the user's configured alerts.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "appendJournal",
      description: "Append an entry to the user's journal.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
];

async function callTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseLike,
): Promise<unknown> {
  if (name === "getWidgetData") {
    return await fetchWidgetData(String(args.type), (args.settings as Record<string, unknown>) ?? {});
  }
  if (name === "getForecast") {
    const raw = await fetchWidgetData(String(args.type), (args.settings as Record<string, unknown>) ?? {});
    return buildForecast(String(args.type), raw as never);
  }
  if (name === "listAlerts") {
    const { data } = await supabase.from("alerts").select("*").eq("enabled", true);
    return data ?? [];
  }
  if (name === "appendJournal") {
    await supabase.from("journal").insert({
      user_id: userId,
      kind: "agent",
      title: String(args.title ?? "Agent entry"),
      body: String(args.body ?? ""),
    });
    return { ok: true };
  }
  return { error: `Unknown tool ${name}` };
}

export async function executeAgent(
  agent: Agent,
  userInput: string,
  userId: string,
  supabase: SupabaseLike,
): Promise<{ output: string; steps: Step[]; status: "ok" | "error" }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { output: "AI unavailable (no LOVABLE_API_KEY)", steps: [], status: "error" };

  const tools = TOOL_DEFS.filter((t) => agent.tools.includes(t.function.name));
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: agent.system_prompt },
    { role: "user", content: userInput },
  ];
  const steps: Step[] = [];

  for (let i = 0; i < 6; i++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: agent.model || "google/gemini-3.6-flash",
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { output: `AI error ${res.status}: ${text.slice(0, 200)}`, steps, status: "error" };
    }
    const body = (await res.json()) as {
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const msg = body.choices?.[0]?.message;
    if (!msg) return { output: "No response from model", steps, status: "error" };

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const out = msg.content ?? "";
      steps.push({ role: "assistant", content: out });
      return { output: out, steps, status: "ok" };
    }

    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await callTool(call.function.name, args, userId, supabase);
      steps.push({ role: "tool", tool: call.function.name, args, content: JSON.stringify(result).slice(0, 4000) });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 8000),
      });
    }
  }
  return { output: "Agent stopped after 6 steps.", steps, status: "ok" };
}
