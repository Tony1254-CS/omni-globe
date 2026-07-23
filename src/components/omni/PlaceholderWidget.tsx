import { Sparkles } from "lucide-react";
import { WIDGET_CATALOG } from "./WidgetPicker";

export function PlaceholderWidget({ type }: { type: string }) {
  const meta = WIDGET_CATALOG.find((w) => w.type === type);
  const Icon = meta?.icon ?? Sparkles;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary neon-border">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{meta?.label ?? type}</div>
        <div className="mt-1 max-w-[220px] text-[11px] text-muted-foreground">
          Coming online — this widget wires up to live data in the next build phase.
        </div>
      </div>
    </div>
  );
}
