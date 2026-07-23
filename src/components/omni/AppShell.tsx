import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2, LayoutDashboard, Settings, Radar, LogOut, Bell } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/globe", label: "Globe", icon: Globe2 },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/history", label: "History", icon: Radar },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-glass-border bg-glass/40 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="grid h-9 w-9 place-items-center rounded-lg neon-border">
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-wider">OMNISPHERE</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
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
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-glass-border bg-glass/40 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Globe2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-wider">OMNISPHERE</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Command Center
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {new Date().toUTCString().slice(17, 25)} UTC
            </span>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-glass-border bg-glass/80 py-2 backdrop-blur-xl md:hidden">
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
