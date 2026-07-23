import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import RGL, {
  WidthProvider,
  type Layout,
  type LayoutItem,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGrid = WidthProvider(RGL);

export function LayoutGrid({
  items,
  onLayoutChange,
  children,
}: {
  items: LayoutItem[];
  onLayoutChange: (next: LayoutItem[]) => void;
  children: ReactNode;
}) {
  return (
    <ClientOnly fallback={<div className="min-h-[400px]" />}>
      <ClientGrid items={items} onLayoutChange={onLayoutChange}>
        {children}
      </ClientGrid>
    </ClientOnly>
  );
}

function ClientGrid({
  items,
  onLayoutChange,
  children,
}: {
  items: LayoutItem[];
  onLayoutChange: (next: LayoutItem[]) => void;
  children: ReactNode;
}) {
  const [pending, setPending] = useState<Layout | null>(null);
  const [resizing, setResizing] = useState(false);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
  const lastSaved = useRef("");
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      const signature = JSON.stringify(pending.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
      if (signature !== lastSaved.current) {
        lastSaved.current = signature;
        onLayoutChange(pending as unknown as LayoutItem[]);
      }
      setPending(null);
    }, 700);
    return () => clearTimeout(t);
  }, [pending, onLayoutChange]);

  return (
    <div className="relative">
    {resizeSize && <div className="resize-readout" role="status">{resizeSize.w} × {resizeSize.h}</div>}
    <ResponsiveGrid
      className={resizing ? "layout is-resizing" : "layout"}
      layout={items}
      cols={12}
      rowHeight={60}
      margin={[16, 16]}
      draggableHandle=".widget-handle"
      onLayoutChange={(next: Layout) => setPending(next)}
      compactType="vertical"
      isResizable
      resizeHandles={["se", "sw", "e", "w", "s"]}
      onResizeStart={() => setResizing(true)}
      onResize={(_layout, _old, item) => setResizeSize({ w: item.w, h: item.h })}
      onResizeStop={() => { setResizing(false); setResizeSize(null); }}
    >
      {children}
    </ResponsiveGrid>
    </div>
  );
}
