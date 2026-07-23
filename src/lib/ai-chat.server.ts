// Unified AI chat helper: supports Lovable AI Gateway (default on Lovable hosting)
// AND direct Google Gemini via GEMINI_API_KEY (for self-hosted deploys like Vercel).
//
// Every AI call site (briefing, oracle, pulse, foresight, agents, timemachine)
// goes through this helper so switching providers is a single env-var change.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatOptions = {
  /** Either provide system+user, OR provide messages directly. */
  system?: string;
  user?: string;
  messages?: ChatMessage[];
  jsonMode?: boolean;
  timeoutMs?: number;
  /** Lovable model id (e.g. "google/gemini-3.6-flash"). Mapped to Gemini native id when using direct key. */
  model?: string;
};

// Map Lovable-gateway model ids to Google's OpenAI-compat model ids.
function mapToGemini(lovableModel: string | undefined): string {
  if (!lovableModel) return "gemini-2.0-flash";
  const m = lovableModel.replace(/^google\//, "");
  // Direct Gemini API doesn't accept every gateway preview id — fall back to stable flash.
  if (/gemini-3/i.test(m)) return "gemini-2.0-flash";
  if (/pro/i.test(m)) return "gemini-2.0-pro-exp";
  return "gemini-2.0-flash";
}

export async function callChat(opts: ChatOptions): Promise<string> {
  const { system, user, jsonMode, timeoutMs = 60000, model } = opts;

  const geminiKey = process.env.GEMINI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;

  const body: Record<string, unknown> = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  let url: string;
  let auth: string;

  if (geminiKey) {
    // Direct Gemini via Google's OpenAI-compatibility endpoint.
    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    auth = `Bearer ${geminiKey}`;
    body.model = mapToGemini(model);
  } else if (lovableKey) {
    url = "https://ai.gateway.lovable.dev/v1/chat/completions";
    auth = `Bearer ${lovableKey}`;
    body.model = model ?? "google/gemini-3.6-flash";
  } else {
    throw new Error("Missing AI credentials: set GEMINI_API_KEY (self-hosted) or LOVABLE_API_KEY (Lovable hosting).");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits/billing to your provider.");
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI provider error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI provider");
  return content;
}
