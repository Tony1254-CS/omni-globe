import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud, Wind, Zap, Rocket, Globe2, Newspaper, TrendingUp, Coins,
  Camera, Satellite, Clock, MessageSquare, Flame, Github, Quote, Activity, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WidgetMeta = {
  type: string;
  label: string;
  icon: LucideIcon;
  category: "Weather" | "Space" | "Finance" | "News" | "Earth" | "Culture";
  description: string;
};

export const WIDGET_CATALOG: readonly WidgetMeta[] = [
  { type: "weather",       label: "Weather",           icon: Cloud,        category: "Weather", description: "Current conditions & 5-day forecast" },
  { type: "aqi",           label: "Air Quality",       icon: Wind,         category: "Weather", description: "Pollutants + AQI colour gauge" },
  { type: "earthquakes",   label: "Earthquakes",       icon: Zap,          category: "Earth",   description: "USGS live feed with magnitude filter" },
  { type: "iss",           label: "ISS Tracker",       icon: Satellite,    category: "Space",   description: "Live position + crew & passes" },
  { type: "spacex",        label: "SpaceX",            icon: Rocket,       category: "Space",   description: "Next launch countdown & mission" },
  { type: "apod",          label: "Astronomy of Day",  icon: Camera,       category: "Space",   description: "NASA APOD image + explanation" },
  { type: "mars",          label: "Mars Rover",        icon: Camera,       category: "Space",   description: "Latest photos from Perseverance/Curiosity" },
  { type: "neo",           label: "Near-Earth Objects",icon: Activity,     category: "Space",   description: "Upcoming asteroid approaches" },
  { type: "clocks",        label: "World Clocks",      icon: Clock,        category: "Culture", description: "Multiple timezones, analogue/digital" },
  { type: "news",          label: "News",              icon: Newspaper,    category: "News",    description: "Top headlines & keyword filter" },
  { type: "reddit",        label: "Community News",    icon: MessageSquare,category: "News",    description: "Popular discussions by topic" },
  { type: "crypto",        label: "Crypto Ticker",     icon: Coins,        category: "Finance", description: "Live prices + 24h sparkline" },
  { type: "fx",            label: "Currency",          icon: TrendingUp,   category: "Finance", description: "160+ currency converter" },
  { type: "countries",     label: "Country Explorer",  icon: Globe2,       category: "Culture", description: "Random country: flag, capital, map" },
  { type: "github",        label: "GitHub Trending",   icon: Github,       category: "Culture", description: "Today's trending repositories" },
  { type: "quote",         label: "Quote of the Day",  icon: Quote,        category: "Culture", description: "Daily inspirational quote" },
  { type: "covid",         label: "COVID Stats",       icon: Flame,        category: "News",    description: "Global & per-country statistics" },
] as const;

export function WidgetPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-3xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-glass-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Add a widget</h2>
                <p className="text-xs text-muted-foreground">
                  Pick a live source and customize it after adding.
                </p>
              </div>
              <button onClick={onClose} className="rounded p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {WIDGET_CATALOG.map((w) => (
                  <button
                    key={w.type}
                    onClick={() => onPick(w.type)}
                    className="glass flex items-start gap-3 p-3 text-left transition hover:neon-border hover:-translate-y-0.5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <w.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{w.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {w.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
