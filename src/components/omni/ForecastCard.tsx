import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { getForecast } from "@/lib/forecast.functions";

type Props = { type: "weather" | "aqi" | "earthquakes" | "crypto"; params: Record<string, any> };

export function ForecastCard({ type, params }: Props) {
  const fn = useServerFn(getForecast);
  const q = useQuery({
    queryKey: ["forecast", type, params],
    queryFn: () => fn({ data: { type, params } }),
    staleTime: 15 * 60_000,
    retry: 0,
  });
  if (q.isLoading) return null;
  if (q.isError || !q.data) return null;
  const f = q.data;
  return (
    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px]">
      <div className="flex items-center gap-1 text-primary">
        <Sparkles className="h-3 w-3" />
        <span className="font-semibold">AI forecast · {(f.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-1 font-medium text-foreground">{f.headline}</div>
      <div className="text-muted-foreground">{f.detail}</div>
      <div className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">{f.method} · {f.source}</div>
    </div>
  );
}
