import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Menu, AlertTriangle, Phone, Coins, Sparkles } from "lucide-react";
import { FloatingSupport } from "@/components/floating-support";
import { TokenAddedCelebration } from "@/components/token-added-celebration";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const currentUser = getUser();
  const [userTokenCount, setUserTokenCount] = useState<number>(currentUser?.promptTokens ?? 100);
  const prevTokensRef = useRef<number | null>(null);

  // Celebration state
  const [celebration, setCelebration] = useState<{ open: boolean; added: number; newTotal: number; reason?: string }>({
    open: false,
    added: 0,
    newTotal: 0,
    reason: "",
  });

  // Poll for token changes every 3.5s
  useEffect(() => {
    async function syncProfile() {
      try {
        const me = await api.auth.me().catch(() => null);
        if (me && typeof me.promptTokens === 'number') {
          const newTokens = me.promptTokens;

          if (prevTokensRef.current !== null && newTokens !== prevTokensRef.current) {
            const added = newTokens - prevTokensRef.current;
            const reason = (me as any).lastTokenReason || (added < 0 ? "Koreksi penyesuaian sistem kuota token oleh Administrator" : "Top-up token oleh Administrator");
            setCelebration({ open: true, added, newTotal: newTokens, reason });
          }

          prevTokensRef.current = newTokens;
          setUserTokenCount(newTokens);
          localStorage.setItem("wf.auth", JSON.stringify(me));
        }
      } catch {}
    }

    syncProfile();
    const interval = setInterval(syncProfile, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleLimitExceeded = () => {
      setLimitDialogOpen(true);
    };
    window.addEventListener("wf:prompt-limit-exceeded", handleLimitExceeded);
    return () => {
      window.removeEventListener("wf:prompt-limit-exceeded", handleLimitExceeded);
    };
  }, []);

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

  function handleBuyTokens() {
    const email = currentUser?.email || "";
    const name = currentUser?.name || "";
    const text = encodeURIComponent(
      `Halo Admin,\n\nSaya ${name} (${email}), baru saja menghabiskan batas jatah prompt di WorkflowAI. Saya tertarik untuk membeli tambahan token prompt agar dapat melanjutkan perancangan.`
    );
    window.open(`https://wa.me/6282392115909?text=${text}`, "_blank");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Super Cool Token Celebration / Deduction Warning Popup Modal */}
      <TokenAddedCelebration
        open={celebration.open}
        addedCount={celebration.added}
        newTotal={celebration.newTotal}
        reason={celebration.reason}
        onClose={() => setCelebration(prev => ({ ...prev, open: false }))}
      />

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

          <div className="flex items-center gap-3">
            {/* Glowing Golden Token Badge */}
            <div
              onClick={() => {
                if (userTokenCount <= 0) setLimitDialogOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-105 transition cursor-pointer"
              title="Kuota Prompt Token Anda Saat Ini"
            >
              <Coins size={15} className="text-amber-400 animate-bounce" />
              <span>{userTokenCount} Token Prompt</span>
              <Sparkles size={11} className="text-amber-400 animate-pulse" />
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-xs font-medium text-white bg-violet-600/10 border border-violet-500/20 px-2 py-0.5 rounded">Active Workspace</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
        <FloatingSupport />
      </div>

      {/* Prompt Token Limit Warning Dialog */}
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-white">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5">
              <DialogTitle className="text-xl font-bold">Token Prompt Anda Telah Habis</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Jatah token gratis Anda telah habis. Silakan hubungi admin untuk melakukan pengisian / pembelian token prompt tambahan agar dapat melanjutkan.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLimitDialogOpen(false)}
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              Nanti Saja
            </Button>
            <Button
              onClick={handleBuyTokens}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" /> Hubungi via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
