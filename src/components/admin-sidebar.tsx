import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Server,
  Key,
  Repeat,
  Layers,
  MessageCircleQuestion,
  LayoutTemplate,
  Wand2,
  Activity,
  ScrollText,
  Settings,
  UserCog,
  LogOut,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { signOut, getUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/ai-provider", label: "AI Provider", icon: Server },
  { to: "/admin/api-key", label: "API Key", icon: Key },
  { to: "/admin/rotation", label: "Rotasi AI", icon: Repeat },
  { to: "/admin/technology", label: "Teknologi", icon: Layers },
  { to: "/admin/templates", label: "Template Project", icon: LayoutTemplate },
  { to: "/admin/prompt-engine", label: "Prompt Engine", icon: Wand2 },
  { to: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { to: "/admin/logs", label: "Log Aktivitas", icon: ScrollText },
  { to: "/admin/users", label: "Kelola User", icon: Users },
  { to: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string; role: any } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");

  useEffect(() => {
    const u = getUser();
    if (u) {
      setUser(u);
      setFormName(u.name);
      setFormEmail(u.email);
    }
  }, []);

  function handleOpenProfile() {
    if (user) {
      setFormName(user.name);
      setFormEmail(user.email);
      setProfileOpen(true);
    }
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Nama dan email tidak boleh kosong");
      return;
    }
    const updated = { ...user, name: formName, email: formEmail, role: user?.role || "admin" };
    localStorage.setItem("wf.auth", JSON.stringify(updated));
    setUser(updated);
    setProfileOpen(false);
    toast.success("Profil berhasil diperbarui");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="p-4">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => {
          const active = pathname === n.to || (n.to !== "/admin" && pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <n.icon size={16} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <button
            onClick={handleOpenProfile}
            className="flex flex-1 items-center gap-3 text-left focus:outline-none cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <UserCog size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.name ?? "Admin"}</div>
              <div className="truncate text-xs text-muted-foreground">Administrator</div>
            </div>
          </button>
          <button
            aria-label="Keluar"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => {
              signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle>Pengaturan Profil</DialogTitle>
              <DialogDescription>Perbarui informasi akun administrator Anda</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nama Lengkap</Label>
                <Input
                  id="profile-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Alamat Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setProfileOpen(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
