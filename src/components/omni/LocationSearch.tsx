import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { searchLocations, type LocationResult } from "@/lib/location.functions";

export function LocationSearch({ onSelect, placeholder = "Search city or region" }: { onSelect: (location: LocationResult) => void; placeholder?: string }) {
  const search = useServerFn(searchLocations);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [input]);
  const results = useQuery({
    queryKey: ["location-search", query],
    queryFn: () => search({ data: { query } }),
    enabled: query.length >= 2,
    staleTime: 30 * 60_000,
  });
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-glass-border bg-input py-2 pl-9 pr-9 text-sm outline-hidden transition focus:border-primary" />
      {results.isFetching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
      {query.length >= 2 && results.data && (
        <div className="glass-strong absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-auto p-1">
          {results.data.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No matching locations</p> : results.data.map((location) => (
            <button key={location.id} type="button" onClick={() => { onSelect(location); setInput(location.label); setQuery(""); }} className="flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition hover:bg-secondary">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span><strong className="block font-medium">{location.label}</strong><span className="text-muted-foreground">{location.lat.toFixed(2)}, {location.lon.toFixed(2)} · {location.timezone}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}