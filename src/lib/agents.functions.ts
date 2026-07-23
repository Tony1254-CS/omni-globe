import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const AGENT_TOOLS = [
  "getWidgetData",
  "getForecast",
  "listAlerts",
  "appendJournal",
] as const;

const NewAgent = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional().default(""),
  system_prompt: z.string().min(1).max(4000),
  tools: z.array(z.enum(AGENT_TOOLS)).default([]),
  model: z.string().max(80).default("google/gemini-3.6-flash"),
});

export const listAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NewAgent.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("agents")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    const { awardAchievement } = await import("./achievements.server");
    await awardAchievement(context.userId, "first_agent");
    return row;
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agents").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const runAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), input: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !agent) throw error ?? new Error("Agent not found");
    const { executeAgent } = await import("./agents.server");
    const result = await executeAgent(agent as never, data.input, context.userId, context.supabase as never);
    const { data: run, error: runErr } = await context.supabase
      .from("agent_runs")
      .insert({
        agent_id: agent.id,
        user_id: context.userId,
        input: data.input,
        output: result.output,
        steps: result.steps as never,
        status: result.status,
      })
      .select()
      .single();
    if (runErr) throw runErr;
    return run;
  });

export const listAgentRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agent_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("agent_runs")
      .select("*")
      .eq("agent_id", data.agent_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return rows ?? [];
  });
