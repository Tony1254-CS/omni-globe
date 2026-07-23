import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchHistory } from "./history-data.server";

const trendsSchema = z.object({ kind: z.enum(["weather", "crypto", "earthquakes"]), days: z.number().finite(), lat: z.number().finite(), lon: z.number().finite(), coin: z.string().max(30), magnitude: z.number().finite() });
const activitySchema = z.object({ days: z.number().int().min(1).max(365).default(90), category: z.enum(["all", "alert", "automation", "agent", "device", "journal", "milestone", "widget"]).default("all") });

export type ActivityCategory = "alert" | "automation" | "agent" | "device" | "journal" | "milestone" | "widget";
export type ActivityItem = { id: string; category: ActivityCategory; occurredAt: string; title: string; summary: string; status: string };

export const getHistoryData = createServerFn({ method: "GET" }).inputValidator((input: unknown) => trendsSchema.parse(input)).handler(async ({ data }) => fetchHistory(data));

export const getPersonalHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { supabase, userId } = context;
    const [alerts, automationRuns, agentRuns, readings, journal, milestones, widgets] = await Promise.all([
      supabase.from("alerts").select("id,label,last_triggered_at,last_checked_at,last_value,enabled").eq("user_id", userId).or(`last_triggered_at.gte.${since},last_checked_at.gte.${since}`).limit(100),
      supabase.from("automation_runs").select("id,created_at,status,detail,automation_id").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
      supabase.from("agent_runs").select("id,created_at,status,input,output,agent_id").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
      supabase.from("device_readings").select("id,recorded_at,value,device_id").eq("user_id", userId).gte("recorded_at", since).order("recorded_at", { ascending: false }).limit(100),
      supabase.from("journal").select("id,created_at,kind,title,body").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
      supabase.from("personal_milestones").select("id,occurred_at,label,kind").eq("user_id", userId).gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(100),
      supabase.from("widget_configs").select("id,widget_type,created_at,updated_at").eq("user_id", userId).or(`created_at.gte.${since},updated_at.gte.${since}`).limit(100),
    ]);
    const failed = [alerts, automationRuns, agentRuns, readings, journal, milestones, widgets].find((result) => result.error);
    if (failed?.error) throw new Error(`Could not load activity: ${failed.error.message}`);
    const items: ActivityItem[] = [];
    for (const row of alerts.data ?? []) { const occurredAt = row.last_triggered_at ?? row.last_checked_at; if (occurredAt) items.push({ id: `alert-${row.id}-${occurredAt}`, category: "alert", occurredAt, title: row.last_triggered_at ? `${row.label} triggered` : `${row.label} checked`, summary: row.last_value == null ? "Threshold evaluated" : `Recorded value ${row.last_value}`, status: row.last_triggered_at ? "triggered" : row.enabled ? "checked" : "disabled" }); }
    for (const row of automationRuns.data ?? []) items.push({ id: `automation-${row.id}`, category: "automation", occurredAt: row.created_at, title: "Automation executed", summary: row.detail ?? `Run ${row.automation_id.slice(0, 8)}`, status: row.status });
    for (const row of agentRuns.data ?? []) items.push({ id: `agent-${row.id}`, category: "agent", occurredAt: row.created_at, title: "AI agent run", summary: row.output ?? row.input, status: row.status });
    for (const row of readings.data ?? []) items.push({ id: `device-${row.id}`, category: "device", occurredAt: row.recorded_at, title: "Device reading", summary: `Value ${row.value} · device ${row.device_id.slice(0, 8)}`, status: "recorded" });
    for (const row of journal.data ?? []) items.push({ id: `journal-${row.id}`, category: "journal", occurredAt: row.created_at, title: row.title, summary: row.body ?? row.kind, status: row.kind });
    for (const row of milestones.data ?? []) items.push({ id: `milestone-${row.id}`, category: "milestone", occurredAt: row.occurred_at, title: row.label, summary: "Personal milestone", status: row.kind });
    for (const row of widgets.data ?? []) items.push({ id: `widget-${row.id}`, category: "widget", occurredAt: row.updated_at, title: `${row.widget_type} widget ${row.updated_at === row.created_at ? "added" : "updated"}`, summary: "Dashboard configuration changed", status: "configured" });
    return items.filter((item) => data.category === "all" || item.category === data.category).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 250);
  });
