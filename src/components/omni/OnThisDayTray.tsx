import { AlertTriangle, Newspaper, Satellite, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Snapshot = {
  date: string;
  quakes: Array<{ id: string; magnitude: number; place: string; url: string }>;
  headlines: Array<{ title: string; source: string; url: string }>;
  gibs: { available: boolean; note?: string };
  iss: { available: boolean; note?: string };
};

export function OnThisDayTray({ snapshot, loading }: { snapshot: Snapshot | null; loading: boolean }) {
  const [open, setOpen] = useState(true);
  const topQuake = snapshot?.quakes[0];

  return (
    <div className="glass p-4 space-y-3">
      <button className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setOpen((o) => !o)}>
        <span>
          On this day
          {snapshot && (
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              {new Date(`${snapshot.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card icon={<AlertTriangle className="h-4 w-4 text-neon-amber" />} title="Top earthquake">
            {loading ? <Skel /> : topQuake ? (
              <a href={topQuake.url} target="_blank" rel="noopener" className="block hover:text-primary">
                <div className="text-lg font-bold">M{topQuake.magnitude.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground truncate">{topQuake.place}</div>
              </a>
            ) : <Empty text="No M4.5+ event recorded." />}
          </Card>

          <Card icon={<Newspaper className="h-4 w-4 text-neon-cyan" />} title="Top headline">
            {loading ? <Skel /> : snapshot?.headlines[0] ? (
              <a href={snapshot.headlines[0].url} target="_blank" rel="noopener" className="block hover:text-primary">
                <div className="text-sm font-medium line-clamp-2">{snapshot.headlines[0].title}</div>
                <div className="text-xs text-muted-foreground mt-1">{snapshot.headlines[0].source}</div>
              </a>
            ) : <Empty text={snapshot?.date && snapshot.date < "2015-02-19" ? "Headlines not indexed before 2015-02-19." : "No headlines returned."} />}
          </Card>

          <Card icon={<Satellite className="h-4 w-4 text-neon-purple" />} title="Earth view">
            {loading ? <Skel /> : snapshot?.gibs.available ? (
              <div>
                <div className="text-sm font-medium">MODIS true-color</div>
                <div className="text-xs text-muted-foreground">Daily satellite basemap active.</div>
              </div>
            ) : <Empty text={snapshot?.gibs.note ?? "Satellite imagery unavailable."} />}
          </Card>
        </div>
      )}

      {open && snapshot && snapshot.headlines.length > 1 && (
        <div className="border-t border-glass-border pt-3">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">More headlines</div>
          <ul className="space-y-1">
            {snapshot.headlines.slice(1, 5).map((h) => (
              <li key={h.url} className="text-xs">
                <a href={h.url} target="_blank" rel="noopener" className="hover:text-primary line-clamp-1">
                  <span className="text-muted-foreground">{h.source}</span> — {h.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-md border border-glass-border p-3 bg-black/20")}>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">{icon} {title}</div>
      {children}
    </div>
  );
}

function Skel() { return <div className="h-8 animate-pulse rounded bg-white/5" />; }
function Empty({ text }: { text: string }) { return <div className="text-xs text-muted-foreground italic">{text}</div>; }
