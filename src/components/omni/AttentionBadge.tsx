import type { AnomalyScore } from "@/lib/anomaly";

const STYLES = {
  calm: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  watch: "bg-neon-amber/15 text-neon-amber border-neon-amber/40",
  alert: "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse",
} as const;

export function AttentionBadge({ score }: { score: AnomalyScore | null }) {
  if (!score) return null;
  return (
    <span
      title={score.detail}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STYLES[score.level]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${score.level === "calm" ? "bg-emerald-400" : score.level === "watch" ? "bg-neon-amber" : "bg-red-400"}`} />
      {score.label}
    </span>
  );
}

export function alertRingClass(score: AnomalyScore | null | undefined) {
  if (score?.level === "alert") return "ring-2 ring-red-500/60 shadow-[0_0_24px_-4px_rgba(239,68,68,0.6)]";
  if (score?.level === "watch") return "ring-1 ring-neon-amber/40";
  return "";
}
