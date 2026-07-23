import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LocationSearch } from "@/components/omni/LocationSearch";

import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import {
  addFavourite,
  deleteFavourite,
  listFavourites,
} from "@/lib/favourites.functions";
import { addMilestone, deleteMilestone, listMilestones } from "@/lib/timemachine.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OMNISPHERE" },
      { name: "description", content: "Profile, units and favourite locations." },
      { property: "og:title", content: "Settings — OMNISPHERE" },
      { property: "og:description", content: "Manage profile, units and global location preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const fetchFavs = useServerFn(listFavourites);
  const addFav = useServerFn(addFavourite);
  const delFav = useServerFn(deleteFavourite);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: favs = [] } = useQuery({
    queryKey: ["favourites"],
    queryFn: () => fetchFavs(),
  });

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [home, setHome] = useState<{ label: string; lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setTimezone(profile.timezone ?? "UTC");
    setUnits((profile.units as "metric" | "imperial") ?? "metric");
    if (profile.home_lat != null && profile.home_lon != null) setHome({ label: profile.home_label ?? "Home", lat: profile.home_lat, lon: profile.home_lon });
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveProfile({ data: { display_name: displayName, timezone, units, home_label: home?.label ?? null, home_lat: home?.lat ?? null, home_lon: home?.lon ?? null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addFavMut = useMutation({
    mutationFn: (fav: { label: string; lat: number; lon: number }) =>
      addFav({ data: fav }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
      toast.success("Location saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delFavMut = useMutation({
    mutationFn: (id: string) => delFav({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favourites"] }),
  });

  const [label, setLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your cockpit preferences and favourite locations.
        </p>
      </div>

      <section className="glass p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Timezone (IANA)</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/London"
              className="mt-1 w-full rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Units</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
              className="mt-1 w-full rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="metric">Metric (°C, km)</option>
              <option value="imperial">Imperial (°F, mi)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 max-w-xl">
          <label className="text-xs font-medium">Global location</label>
          <p className="mb-2 text-xs text-muted-foreground">Weather and air-quality widgets use this by default.</p>
          <LocationSearch onSelect={(location) => { setHome({ label: location.label, lat: location.lat, lon: location.lon }); setTimezone(location.timezone); }} />
          {home && <div className="mt-2 flex items-center gap-2 rounded-md bg-secondary/60 p-2 text-xs"><MapPin className="h-4 w-4 text-primary" /><span className="font-medium">{home.label}</span><span className="text-muted-foreground">{home.lat.toFixed(2)}, {home.lon.toFixed(2)}</span></div>}
        </div>
        <div className="mt-4">
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {saveMut.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>

      <section className="glass p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Favourite locations
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Used by weather, AQI and forecast widgets, and by the globe.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const la = parseFloat(lat);
            const lo = parseFloat(lon);
            if (!label || Number.isNaN(la) || Number.isNaN(lo)) {
              toast.error("Fill label, lat and lon");
              return;
            }
            addFavMut.mutate({ label, lat: la, lon: lo });
            setLabel(""); setLat(""); setLon("");
          }}
          className="mt-4 grid gap-2 md:grid-cols-[1fr_100px_100px_auto]"
        >
          <input
            placeholder="London"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Lat"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Lon"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            className="rounded-lg border border-glass-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={addFavMut.isPending}
            className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>

        <ul className="mt-4 divide-y divide-glass-border">
          {favs.length === 0 && (
            <li className="py-6 text-center text-xs text-muted-foreground">
              No favourites yet.
            </li>
          )}
          {favs.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{f.label}</span>
                <span className="text-xs text-muted-foreground">
                  {f.lat.toFixed(2)}, {f.lon.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => delFavMut.mutate(f.id)}
                className="rounded p-1 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
