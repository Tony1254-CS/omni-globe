import { Children, useEffect, useRef, useState, type ReactNode } from "react";
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
  const lastSaved = useRef("");
  const renderedChildren = Children.toArray(children);
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
    <ResponsiveGrid
      className="layout"
      layout={items}
      cols={12}
      rowHeight={60}
      margin={[16, 16]}
      draggableHandle=".widget-handle"
      onLayoutChange={(next: Layout) => setPending(next)}
      compactType="vertical"
    >
      {items.map((item, index) => (
        <div key={item.i} data-grid={item}>
          {renderedChildren[index]}
        </div>
      ))}
    </ResponsiveGrid>
  );
}
