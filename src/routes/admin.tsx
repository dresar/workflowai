import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin-sidebar";
import { getUser } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const u = getUser();
    if (!u) throw redirect({ to: "/login" });
    if (u.role !== "admin") throw redirect({ to: "/app" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    if (u.role !== "admin") {
      navigate({ to: "/app" });
    }
  }, []);

  if (typeof window !== "undefined" && (!getUser() || getUser()?.role !== "admin")) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Admin Control Center</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-muted-foreground">Management Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs text-muted-foreground font-medium">Server Connected</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
