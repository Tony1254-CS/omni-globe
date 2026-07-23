import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("oracle_threads")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("oracle_threads")
      .insert({ user_id: context.userId, title: "New conversation" })
      .select("id, title, updated_at")
      .single();
    if (error) throw error;
    return data;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("oracle_threads").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("oracle_messages")
      .select("id, role, content, graph, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const askOracle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    threadId: z.string().uuid(),
    question: z.string().min(1).max(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { callChat } = await import("./ai-chat.server");

    // Save user message
    await context.supabase.from("oracle_messages").insert({
      thread_id: data.threadId, user_id: context.userId, role: "user", content: data.question,
    });

    // Load recent history
    const { data: history } = await context.supabase
      .from("oracle_messages")
      .select("role, content")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true })
      .limit(20);

    const system = `You are the OMNISPHERE Causal Oracle — a global-intelligence analyst that reasons about cause and effect across weather, geopolitics, markets, space, and science. Answer clearly with a short direct answer, then a "Because" section using bullet chains ("A → B → C"). Cite mechanisms, not sources. When useful, end with a "What if" alternative scenario. Keep replies under 350 words. Use Markdown.`;

    const messages = [
      { role: "system" as const, content: system },
      ...(history ?? []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user") as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    const content = await callChat({ messages, model: "google/gemini-3.6-flash" });

    const { data: saved, error } = await context.supabase.from("oracle_messages").insert({
      thread_id: data.threadId, user_id: context.userId, role: "assistant", content,
    }).select("id, role, content, created_at").single();
    if (error) throw error;

    // Title thread from first question
    if ((history ?? []).length <= 1) {
      const title = data.question.slice(0, 60);
      await context.supabase.from("oracle_threads").update({ title }).eq("id", data.threadId);
    }

    return saved;
  });
