import { useEffect, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import GridLayout, { type Layout, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGrid = WidthProvider(GridLayout);

export function LayoutGrid({
  items,
  onLayoutChange,
  children,
}: {
  items: Layout[];
  onLayoutChange: (next: Layout[]) => void;
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
  items: Layout[];
  onLayoutChange: (next: Layout[]) => void;
  children: ReactNode;
}) {
  // Debounce persistence so a drag doesn't hammer the DB.
  const [pending, setPending] = useState<Layout[] | null>(null);
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
      onLayoutChange={(next) => setPending(next)}
      compactType="vertical"
    >
      {children}
    </ResponsiveGrid>
  );
}
