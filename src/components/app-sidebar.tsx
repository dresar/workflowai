import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Plus, Search, MessageSquare, LogOut, User, X, Clock, RefreshCw, FileText, Layers, Database, Code2, ListChecks, Wand2, LayoutTemplate } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUser, signOut } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// Status => step route mapping
const STATUS_ROUTE: Record<string, string> = {
  draft: "/app/tech-preferences",
  interview: "/app/questions",
  canvas: "/app/canvas",
  prd: "/app/prd",
  architecture: "/app/canvas",
  database: "/app/sql",
  api: "/app/canvas",
  tasks: "/app/tasks",
  prompt: "/app/prompt",
  complete: "/app/canvas",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-500/20 text-zinc-400" },
  interview: { label: "Interview", color: "bg-blue-500/20 text-blue-400" },
  canvas: { label: "Canvas", color: "bg-violet-500/20 text-violet-400" },
  prd: { label: "PRD", color: "bg-indigo-500/20 text-indigo-400" },
  architecture: { label: "Arsitektur", color: "bg-cyan-500/20 text-cyan-400" },
  database: { label: "Database", color: "bg-teal-500/20 text-teal-400" },
  api: { label: "API", color: "bg-green-500/20 text-green-400" },
  tasks: { label: "Tasks", color: "bg-orange-500/20 text-orange-400" },
  prompt: { label: "Prompt", color: "bg-pink-500/20 text-pink-400" },
  complete: { label: "Selesai", color: "bg-emerald-500/20 text-emerald-400" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <LayoutTemplate size={13} />,
  interview: <MessageSquare size={13} />,
  canvas: <Layers size={13} />,
  prd: <FileText size={13} />,
  architecture: <Code2 size={13} />,
  database: <Database size={13} />,
  api: <Code2 size={13} />,
  tasks: <ListChecks size={13} />,
  prompt: <Wand2 size={13} />,
  complete: <ListChecks size={13} />,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProjectId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null
  );

  useEffect(() => {
    setUser(getUser());
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.projects.list({ limit: 50 });
      // result might be { items, total } or an array
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      setProjects(items);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when sidebar opens
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open, fetchProjects]);

  // Also fetch on mount so data is ready
  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(q.toLowerCase()) ||
    p.idea?.toLowerCase().includes(q.toLowerCase())
  );

  function openProject(project: any) {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_project_id", project.id);
    }
    const route = STATUS_ROUTE[project.status] ?? "/app/canvas";
    navigate({ to: route as any });
    onClose();
  }

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <aside className={cn(
      "flex flex-col border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0 h-screen z-50",
      open ? "w-72 border-r" : "w-0 overflow-hidden border-r-0"
    )}>
      <div className="p-4 flex items-center justify-between">
        <Link to="/app" onClick={onClose}>
          <BrandLogo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="px-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            navigate({ to: "/app" });
            onClose();
          }}
        >
          <Plus size={16} /> Project Baru
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari riwayat..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Riwayat Project
          </span>
          <button
            onClick={fetchProjects}
            className="text-muted-foreground hover:text-foreground transition"
            title="Refresh riwayat"
          >
            <RefreshCw size={11} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && projects.length === 0 && (
          <div className="space-y-1 px-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-md px-2 py-2.5 space-y-1.5 animate-pulse">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Project list */}
        {!loading || projects.length > 0 ? (
          <div className="space-y-0.5">
            {filtered.map((p) => {
              const isActive = p.id === activeProjectId;
              const statusInfo = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
              const statusIcon = STATUS_ICON[p.status] ?? <MessageSquare size={13} />;
              const slug = slugify(p.name || "project");

              return (
                <button
                  key={p.id}
                  onClick={() => openProject(p)}
                  title={`/${slug} — ${p.idea?.slice(0, 80) ?? ""}`}
                  className={cn(
                    "group flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left transition",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent border border-transparent"
                  )}
                >
                  {/* Project name + status badge */}
                  <div className="flex items-start justify-between gap-1">
                    <span className={cn(
                      "truncate text-sm font-medium leading-tight",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {p.name}
                    </span>
                    <span className={cn(
                      "shrink-0 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      statusInfo.color
                    )}>
                      {statusIcon}
                      <span className="ml-0.5">{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Slug */}
                  <span className="text-[10px] text-muted-foreground/60 font-mono truncate">
                    /{slug}
                  </span>

                  {/* Idea preview + time */}
                  <div className="flex items-end justify-between gap-1">
                    <span className="text-[11px] text-muted-foreground leading-tight line-clamp-1 flex-1">
                      {p.idea?.slice(0, 60)}{(p.idea?.length ?? 0) > 60 ? "…" : ""}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground/50">
                      <Clock size={9} />
                      {formatDate(p.updatedAt || p.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <MessageSquare size={28} className="text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {q ? "Tidak ada project yang cocok" : "Belum ada project"}
                </p>
                {!q && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 text-xs"
                    onClick={() => { navigate({ to: "/app" }); onClose(); }}
                  >
                    <Plus size={12} className="mr-1" /> Buat Project
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <User size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name ?? "Pengguna"}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email ?? "-"}</div>
          </div>
          <button
            aria-label="Keluar"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      <span className="hidden" data-path={pathname} />
    </aside>
  );
}
