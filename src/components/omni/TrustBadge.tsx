import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

export type TrustLevel = "verified" | "cached" | "unknown";

type Props = {
  source: string;
  updatedAt?: string | number | Date | null;
  level?: TrustLevel;
  className?: string;
};

function ago(ts: string | number | Date): string {
  const d = new Date(ts).getTime();
  if (!Number.isFinite(d)) return "";
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function TrustBadge({ source, updatedAt, level = "verified", className }: Props) {
  const Icon = level === "verified" ? ShieldCheck : level === "cached" ? ShieldAlert : ShieldQuestion;
  const tone =
    level === "verified" ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
    : level === "cached" ? "text-amber-400 border-amber-500/25 bg-amber-500/10"
    : "text-muted-foreground border-glass-border bg-secondary/40";
  const freshness = updatedAt ? ago(updatedAt) : "live";
  return (
    <span
      title={`Source: ${source} · Updated ${freshness}`}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${tone} ${className ?? ""}`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="max-w-[90px] truncate">{source}</span>
      <span className="opacity-60">· {freshness}</span>
    </span>
  );
}
