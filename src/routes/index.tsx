import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe2, Activity, Mic, Bell, Sparkles, Radar, Brain, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OMNISPHERE — One dashboard. The entire planet." },
      {
        name: "description",
        content:
          "A real-time global command center. Live 3D globe, 20+ live widgets, causal AI oracle, historical time machine, and voice control.",
      },
      { property: "og:title", content: "OMNISPHERE — The Planet, In Your Palm." },
      { property: "og:description", content: "Live 3D globe, 20+ widgets, causal AI oracle. Your personal awareness cockpit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Globe2, title: "Live 3D globe", body: "ISS, earthquakes, weather layers — click anywhere to spawn a widget.", accent: "from-cyan-400/30" },
  { icon: Brain, title: "Causal Oracle AI", body: "Ask multi-step 'why' and 'what if' — reasoning across live world signals.", accent: "from-fuchsia-400/30" },
  { icon: Activity, title: "20+ live widgets", body: "Weather, AQI, crypto, news, quakes, launches — all draggable & resizable.", accent: "from-emerald-400/30" },
  { icon: Radar, title: "Time Machine", body: "Rewind decades. See satellite clouds, quakes, and headlines from any day.", accent: "from-amber-400/30" },
  { icon: Sparkles, title: "AI Briefings", body: "A personalized daily executive summary — weather, headlines, space, markets.", accent: "from-violet-400/30" },
  { icon: Bell, title: "Custom alerts", body: "BTC below 40k? Quake above 6.0? Get pinged in-app the moment it happens.", accent: "from-rose-400/30" },
  { icon: Zap, title: "Automations", body: "Rules that watch signals and fire actions when your conditions are met.", accent: "from-sky-400/30" },
  { icon: Mic, title: "Voice-first", body: "\"Omni, show me Tokyo weather.\" \"What launches today?\" It just works.", accent: "from-teal-400/30" },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="brand-orb grid h-10 w-10 place-items-center rounded-xl">
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-[0.2em]">OMNISPHERE</span>
        </div>
        <Link
          to="/auth"
          className="liquid-control inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
        >
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/60 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Global awareness · Command center
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            The entire planet,
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-primary to-fuchsia-400 bg-clip-text text-transparent">
              in one command center.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Real-time weather, space, finance, news and Earth sensors on a stunning 3D globe.
            Ask a causal AI oracle. Rewind decades. Get pinged when the world changes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="primary-glass-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Launch OMNISPHERE <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="liquid-control inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium"
            >
              See what it does
            </a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="glass group relative overflow-hidden p-6 transition hover:-translate-y-1"
            >
              <div className={`absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br ${f.accent} to-transparent opacity-60 blur-2xl transition group-hover:opacity-100`} />
              <f.icon className="relative mb-4 h-6 w-6 text-primary" />
              <h3 className="relative text-base font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-glass-border px-6 py-8 text-center text-xs text-muted-foreground">
        Live data from NASA, USGS, Open-Meteo, CoinGecko, GDELT, RocketLaunch.live, GitHub and more.
      </footer>
    </main>
  );
}
