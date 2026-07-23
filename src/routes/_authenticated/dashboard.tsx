import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  addWidget,
  deleteWidget,
  listWidgets,
  saveLayout,
} from "@/lib/widgets.functions";
import { WidgetPicker, WIDGET_CATALOG } from "@/components/omni/WidgetPicker";
import { WidgetShell } from "@/components/omni/WidgetShell";
import { LiveWidget } from "@/components/omni/LiveWidget";
import { LayoutGrid } from "@/components/omni/LayoutGrid";
import { DEFAULT_WIDGET_SETTINGS } from "@/lib/widget-data.types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — OMNISPHERE" },
      { name: "description", content: "Your personal real-time command center." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const list = useServerFn(listWidgets);
  const add = useServerFn(addWidget);
  const del = useServerFn(deleteWidget);
  const save = useServerFn(saveLayout);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["widgets"],
    queryFn: () => list(),
  });

  const addMut = useMutation({
    mutationFn: (type: string) =>
      add({ data: {
        widget_type: type,
        x: 0,
        y: widgets.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0),
        w: 4,
        h: 4,
        settings: DEFAULT_WIDGET_SETTINGS[type] ?? {},
      } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["widgets"] });
      toast.success("Widget added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widgets"] }),
  });

  const layoutMut = useMutation({
    mutationFn: (items: Array<{ id: string; x: number; y: number; w: number; h: number }>) =>
      save({ data: { items } }),
    onError: (e: Error) => toast.error(`Layout not saved: ${e.message}`),
  });

  const layoutItems = useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 3,
        minH: 3,
      })),
    [widgets],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Drag, resize, arrange. Your layout is saved automatically.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Add widget
        </button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : widgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass grid place-items-center p-16 text-center"
        >
          <p className="text-lg font-semibold">Your cockpit is empty</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Add a live widget to start monitoring weather, Earth, space, finance,
            and global signals.
          </p>
          <button
            onClick={() => setPickerOpen(true)}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add your first widget
          </button>
        </motion.div>
      ) : (
        <LayoutGrid
          items={layoutItems}
          onLayoutChange={(next) => {
            layoutMut.mutate(next.map((n) => ({ id: n.i, x: n.x, y: n.y, w: n.w, h: n.h })));
          }}
        >
          <AnimatePresence>
            {widgets.map((w) => {
              const meta = WIDGET_CATALOG.find((c) => c.type === w.widget_type);
              return (
                <div key={w.id} data-grid={{ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }}>
                  <WidgetShell
                    title={meta?.label ?? w.widget_type}
                    onRemove={() => delMut.mutate(w.id)}
                    removeIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    <LiveWidget id={w.id} type={w.widget_type} settings={w.settings} />
                  </WidgetShell>
                </div>
              );
            })}
          </AnimatePresence>
        </LayoutGrid>
      )}

      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(type) => { addMut.mutate(type); setPickerOpen(false); }}
      />
    </div>
  );
}
