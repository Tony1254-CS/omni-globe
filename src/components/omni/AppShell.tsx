import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2, LayoutDashboard, Settings, Radar, LogOut, Bell, Sparkles, Zap, Bot, Cpu, Trophy, Share2, Sun, Moon, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { getMyProfile } from "@/lib/profile.functions";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/globe", label: "Globe", icon: Globe2 },
  { to: "/briefing", label: "Briefing", icon: Sparkles },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/automations", label: "Automations", icon: Zap },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/devices", label: "Devices", icon: Cpu },
  { to: "/presets", label: "Presets", icon: Sparkles },
  { to: "/shares", label: "Shares", icon: Share2 },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/history", label: "History", icon: Radar },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const fetchProfile = useServerFn(getMyProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), staleTime: 5 * 60_000 });
  const [utc, setUtc] = useState("");
  useEffect(() => {
    const update = () => setUtc(new Date().toUTCString().slice(17, 25));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop collapsible sidebar (fixed, hover-expands) */}
      <aside
        className="sidebar-rail group/sidebar fixed inset-y-3 left-3 z-40 hidden w-16 shrink-0 flex-col overflow-hidden rounded-lg border border-glass-border bg-glass/70 backdrop-blur-xl transition-[width] duration-300 ease-out hover:w-60 focus-within:w-60 md:flex"
      >
        <div className="flex items-center gap-2 overflow-hidden px-3 py-6">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg neon-border">
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <span className="whitespace-nowrap text-sm font-bold tracking-wider opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            OMNISPHERE
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-hidden px-2">
          {NAV.map((item) => {
            const active =
              location.pathname === item.to ||
              location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-primary/15 text-primary neon-border"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="m-2 flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            Sign out
          </span>
        </button>
      </aside>

      <div className="min-w-0 flex-1 md:ml-20">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-glass-border bg-glass/70 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Globe2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-wider">OMNISPHERE</span>
          </div>
          <div className="hidden min-w-0 items-center gap-4 md:flex">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Command Center</span>
            <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-foreground"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{profile.data?.home_label ?? "Set global location"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-lg border border-glass-border bg-glass p-2 text-muted-foreground transition hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {utc || "--:--:--"} UTC
            </span>
          </div>
        </header>
        <main className="p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around overflow-x-auto border-t border-glass-border bg-glass/80 py-2 backdrop-blur-xl md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
