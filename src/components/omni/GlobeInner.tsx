import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { getWidgetData } from "@/lib/widget-data.functions";
import { listFavourites } from "@/lib/favourites.functions";

type IssPos = { latitude: number; longitude: number; altitude: number; velocity: number };
type Quake = { id: string; mag: number; place: string; time: number; lat: number; lon: number; url: string };

export default function GlobeInner() {
  return <GlobeCanvas />;
}

function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [showIss, setShowIss] = useState(true);
  const [showQuakes, setShowQuakes] = useState(true);
  const [showFavs, setShowFavs] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  const fetchData = useServerFn(getWidgetData);
  const favsFn = useServerFn(listFavourites);

  const iss = useQuery({
    queryKey: ["globe-iss"],
    queryFn: () => fetchData({ data: { type: "iss", settings: {} } }),
    refetchInterval: 8000,
    staleTime: 5000,
  });

  const favs = useQuery({
    queryKey: ["favourites"],
    queryFn: () => favsFn(),
    staleTime: 60_000,
  });

  const issPos = useMemo<IssPos | null>(() => {
    const p = (iss.data?.data as any)?.position;
    if (!p) return null;
    return { latitude: Number(p.latitude), longitude: Number(p.longitude), altitude: Number(p.altitude ?? 400), velocity: Number(p.velocity ?? 0) };
  }, [iss.data]);




  // Because getWidgetData for earthquakes doesn't return coords, do a direct USGS fetch on the client for the globe.
  const quakesFull = useQuery({
    queryKey: ["globe-quakes-geo"],
    queryFn: async () => {
      const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
      const data = await res.json();
      return (data.features ?? []).map((f: any) => ({
        id: f.id,
        mag: Number(f.properties?.mag ?? 0),
        place: String(f.properties?.place ?? ""),
        time: Number(f.properties?.time ?? 0),
        lat: Number(f.geometry?.coordinates?.[1] ?? 0),
        lon: Number(f.geometry?.coordinates?.[0] ?? 0),
        url: String(f.properties?.url ?? ""),
      })) as Quake[];
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const mod = await import("globe.gl");
      if (cancelled || !containerRef.current) return;
      const g = (mod.default as any)(containerRef.current)
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundColor("rgba(0,0,0,0)")
        .atmosphereColor("#38bdf8")
        .atmosphereAltitude(0.22)
        .showGraticules(false)
        .pointOfView({ lat: 20, lng: 0, altitude: 2.4 });
      globeRef.current = g;
      const controls = g.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      setReady(true);

      ro = new ResizeObserver(() => {
        if (!containerRef.current) return;
        g.width(containerRef.current.clientWidth);
        g.height(containerRef.current.clientHeight);
      });
      ro.observe(containerRef.current);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      const el = containerRef.current;
      if (el) el.innerHTML = "";
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    globeRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate, ready]);

  // Points layer: quakes + ISS + favourites
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const g = globeRef.current;
    const points: Array<{ lat: number; lng: number; size: number; color: string; label: string; kind: string; url?: string }> = [];

    if (showQuakes) {
      for (const q of quakesFull.data ?? []) {
        points.push({
          lat: q.lat,
          lng: q.lon,
          size: 0.15 + Math.max(0, q.mag) * 0.08,
          color: q.mag >= 5 ? "#ef4444" : q.mag >= 3.5 ? "#f59e0b" : "#38bdf8",
          label: `M${q.mag.toFixed(1)} · ${q.place}`,
          kind: "quake",
          url: q.url,
        });
      }
    }
    if (showIss && issPos) {
      points.push({
        lat: issPos.latitude,
        lng: issPos.longitude,
        size: 0.6,
        color: "#a78bfa",
        label: `ISS · ${issPos.altitude.toFixed(0)} km · ${issPos.velocity.toFixed(0)} km/h`,
        kind: "iss",
      });
    }
    if (showFavs) {
      for (const f of favs.data ?? []) {
        points.push({
          lat: Number(f.lat),
          lng: Number(f.lon),
          size: 0.5,
          color: "#22d3ee",
          label: `★ ${f.label}`,
          kind: "fav",
        });
      }
    }

    g.pointsData(points)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude((d: any) => (d.kind === "iss" ? 0.25 : 0.02))
      .pointRadius("size")
      .pointColor("color")
      .pointLabel((d: any) => `
        <div style="background:rgba(11,18,36,0.9);border:1px solid rgba(148,163,184,0.3);padding:6px 10px;border-radius:8px;font-size:12px;color:#e2e8f0">${d.label}</div>
      `)
      .onPointClick((d: any) => {
        if (d?.url) window.open(d.url, "_blank", "noopener");
      });
  }, [ready, showIss, showQuakes, showFavs, issPos, quakesFull.data, favs.data]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[70vh] w-full overflow-hidden rounded-2xl border border-glass-border bg-black"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="glass absolute left-3 top-3 flex flex-col gap-1 p-3 text-xs">
        <Toggle checked={showIss} onChange={setShowIss} label="ISS" color="#a78bfa" />
        <Toggle checked={showQuakes} onChange={setShowQuakes} label={`Quakes (24h)`} color="#f59e0b" />
        <Toggle checked={showFavs} onChange={setShowFavs} label="Favourites" color="#22d3ee" />
        <div className="mt-1 border-t border-glass-border pt-2">
          <Toggle checked={autoRotate} onChange={setAutoRotate} label="Auto-rotate" color="#94a3b8" />
        </div>
      </div>

      <div className="glass absolute bottom-3 right-3 max-w-[240px] p-3 text-[11px] text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">Legend</div>
        <div>Purple · ISS · updates every 8s</div>
        <div>Amber/red · earthquakes M2.5+ · 24h</div>
        <div>Cyan · your favourite locations</div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, color }: { checked: boolean; onChange: (v: boolean) => void; label: string; color: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span>{label}</span>
    </label>
  );
}
