import { createFileRoute, notFound } from "@tanstack/react-router";
import { Globe2 } from "lucide-react";

import { LiveWidget } from "@/components/omni/LiveWidget";
import { Card } from "@/components/ui/card";
import { getShareBySlug } from "@/lib/shares.functions";

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const share = await getShareBySlug({ data: { slug: params.slug } });
    if (!share) throw notFound();
    return share;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Shared dashboard"} · OMNISPHERE` },
      { name: "description", content: "Public dashboard snapshot from OMNISPHERE." },
      { property: "og:title", content: loaderData?.title ?? "Shared dashboard" },
      { property: "og:description", content: "Public dashboard snapshot from OMNISPHERE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-muted-foreground">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">This share link doesn't exist.</div>,
  component: PublicShare,
});

type SnapshotWidget = { widget_type: string; x: number; y: number; w: number; h: number; settings: Record<string, string | number | boolean | null> };

function PublicShare() {
  const share = Route.useLoaderData() as { title: string; snapshot: { widgets: SnapshotWidget[] }; created_at: string };
  const widgets = share.snapshot?.widgets ?? [];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-glass-border bg-glass/40 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-wider">OMNISPHERE</span>
          <span className="ml-3 text-xs text-muted-foreground">· {share.title}</span>
        </div>
        <a href="/" className="text-xs text-primary underline">Get your own</a>
      </header>
      <main className="p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((w, i) => (
            <Card key={i} className="glass-panel min-h-[200px] p-3">
              <LiveWidget widget={{ id: `pub-${i}`, widget_type: w.widget_type, settings: w.settings }} readOnly />
            </Card>
          ))}
          {widgets.length === 0 && <p className="text-sm text-muted-foreground">Empty snapshot.</p>}
        </div>
      </main>
    </div>
  );
}
