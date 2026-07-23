import { GripVertical, X } from "lucide-react";
import type { ReactNode } from "react";

export function WidgetShell({
  title,
  onRemove,
  removeIcon,
  children,
}: {
  title: string;
  onRemove?: () => void;
  removeIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="widget-handle flex cursor-grab items-center justify-between border-b border-glass-border px-3 py-2 active:cursor-grabbing">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          {title}
        </div>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="rounded p-1 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
            aria-label="Remove widget"
          >
            {removeIcon ?? <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
