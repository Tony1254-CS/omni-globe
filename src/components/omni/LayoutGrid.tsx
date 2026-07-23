import { useEffect, useState, type ReactNode } from "react";
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
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      onLayoutChange(pending);
      setPending(null);
    }, 500);
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
      {children}
    </ResponsiveGrid>
  );
}
