import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe2, Activity, Mic, Bell, Sparkles, Radar } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OMNISPHERE — One dashboard. The entire planet." },
      {
        name: "description",
        content:
          "Real-time weather, space, finance and news widgets on a 3D globe with voice-controlled AI. Your personal awareness cockpit.",
      },
      { property: "og:title", content: "OMNISPHERE — One dashboard. The entire planet." },
      { property: "og:description", content: "Real-time weather, space, finance and news widgets on a live 3D globe. Voice-controlled." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Globe2, title: "Live 3D globe", body: "ISS, earthquakes, weather layers — click anywhere on Earth to spawn a widget." },
  { icon: Activity, title: "20+ live widgets", body: "Weather, AQI, crypto, news, space, quakes, launches, and more — all draggable." },
  { icon: Mic, title: "Voice assistant", body: "Say “Omni, show me Tokyo weather” or “what launches today?” — it just works." },
  { icon: Bell, title: "Custom alerts", body: "BTC below 40k? Quake above 6.0? Get pinged in-app and by email." },
  { icon: Radar, title: "Historical data", body: "Every fetch is stored. Rewind time to see what the world looked like last week." },
  { icon: Sparkles, title: "AI briefings", body: "A personalized daily summary at 8 AM — weather, headlines, space events." },
];

function Landing() {
  return (
    <main className="min-h-screen grid-bg">
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg neon-border">
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-wider">OMNISPHERE</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg border border-glass-border bg-glass px-4 py-2 text-sm font-medium transition hover:bg-secondary"
        >
          Sign in
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary">
            Global awareness · Command center
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight md:text-7xl">
            One dashboard.{" "}
            <span className="neon-text">The entire planet.</span>{" "}
            Your voice in control.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A real-time cockpit for weather, space, finance, news and Earth sensors,
            arranged on a stunning 3D globe. Powered by an AI that listens.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
            >
              Launch OMNISPHERE
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-glass-border bg-glass px-6 py-3 text-sm font-medium transition hover:bg-secondary"
            >
              See what it does
            </a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="glass p-6 transition hover:-translate-y-1 hover:neon-border"
            >
              <f.icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-glass-border px-6 py-8 text-center text-xs text-muted-foreground">
        Built on Lovable · Live data from NASA, USGS, OpenWeatherMap, NewsAPI, CoinGecko and more
      </footer>
    </main>
  );
}
