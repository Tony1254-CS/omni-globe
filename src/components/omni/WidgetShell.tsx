import { GripVertical, X } from "lucide-react";
import type { ReactNode } from "react";

export function WidgetShell({
  title,
  type,
  onRemove,
  removeIcon,
  children,
}: {
  title: string;
  type: string;
  onRemove?: () => void;
  removeIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="liquid-glass widget-surface relative flex h-full flex-col overflow-hidden [content-visibility:auto] [contain-intrinsic-size:280px]" data-widget={type}>
      <div className="glass-specular" aria-hidden="true" />
      <div className="widget-handle flex cursor-grab items-center justify-between border-b border-glass-border px-3 py-2 active:cursor-grabbing">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="liquid-control grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
            aria-label="Remove widget"
          >
            {removeIcon ?? <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className="relative z-[1] min-h-0 flex-1 overflow-hidden p-4">{children}</div>
    </div>
  );
}
