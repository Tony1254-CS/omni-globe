import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Calendar as CalendarIcon, SkipBack, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Props = {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // default 1975-01-01
  maxDate?: string; // default today
};

const DAY = 86400 * 1000;
const SPEEDS = [
  { label: "1x", days: 1, ms: 800 },
  { label: "7d/s", days: 7, ms: 400 },
  { label: "30d/s", days: 30, ms: 300 },
  { label: "1y/s", days: 365, ms: 250 },
];

function toDate(s: string) { return new Date(`${s}T00:00:00Z`); }
function fromDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TimelineScrubber({ date, onChange, minDate = "1975-01-01", maxDate }: Props) {
  const max = maxDate ?? fromDate(new Date());
  const minTs = toDate(minDate).getTime();
  const maxTs = toDate(max).getTime();
  const currentTs = toDate(date).getTime();

  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    const speed = SPEEDS[speedIdx];
    intervalRef.current = setInterval(() => {
      const next = currentTs + speed.days * DAY;
      if (next >= maxTs) {
        setPlaying(false);
        onChange(max);
        return;
      }
      onChange(fromDate(new Date(next)));
    }, speed.ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speedIdx, currentTs, maxTs, max, onChange]);

  const pct = useMemo(() => {
    const range = maxTs - minTs;
    return range > 0 ? ((currentTs - minTs) / range) * 100 : 0;
  }, [currentTs, minTs, maxTs]);

  const jump = (days: number) => {
    const next = Math.min(maxTs, Math.max(minTs, currentTs + days * DAY));
    onChange(fromDate(new Date(next)));
  };

  const label = useMemo(() => {
    const d = toDate(date);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }, [date]);

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => jump(-30)} title="Back 30 days">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => setPlaying((p) => !p)}
          className={cn(playing && "bg-primary text-primary-foreground")}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => jump(30)} title="Forward 30 days">
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="flex gap-1 text-xs">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedIdx(i)}
              className={cn(
                "rounded px-2 py-1 border border-glass-border",
                i === speedIdx ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={toDate(date)}
              onSelect={(d) => d && onChange(fromDate(d))}
              disabled={(d) => d.getTime() < minTs || d.getTime() > maxTs}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => onChange(max)}
          className="text-xs text-muted-foreground hover:text-foreground border border-glass-border rounded px-2 py-1"
        >
          Now
        </button>
      </div>

      <div className="space-y-1">
        <Slider
          value={[Math.round(pct * 100)]}
          min={0}
          max={10000}
          step={1}
          onValueChange={([v]) => {
            const range = maxTs - minTs;
            const ts = minTs + (v / 10000) * range;
            onChange(fromDate(new Date(ts)));
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>{minDate.slice(0, 4)}</span>
          <span>{new Date((minTs + maxTs) / 2).getUTCFullYear()}</span>
          <span>{max.slice(0, 4)}</span>
        </div>
      </div>
    </div>
  );
}
