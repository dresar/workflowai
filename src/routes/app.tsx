import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const u = getUser();
    if (!u) throw redirect({ to: "/login" });
    if (u.role === "admin") throw redirect({ to: "/admin" });
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    if (u.role === "admin") {
      navigate({ to: "/admin" });
    }
  }, []);

  if (typeof window !== "undefined" && !getUser()) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Menu size={18} />
            </Button>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">AI Software Architect</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-muted-foreground">Workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className="text-xs font-medium text-white bg-violet-600/10 border border-violet-500/20 px-2 py-0.5 rounded">Active Workspace</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
