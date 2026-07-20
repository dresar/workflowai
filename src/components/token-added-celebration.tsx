import { useEffect, useState } from "react";
import { Coins, Sparkles, PartyPopper, Zap, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TokenCelebrationProps {
  open: boolean;
  addedCount: number;
  newTotal: number;
  onClose: () => void;
}

export function TokenAddedCelebration({ open, addedCount, newTotal, onClose }: TokenCelebrationProps) {
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (open) {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Particle Sparkles */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 2 + Math.random() * 3;
            const size = 12 + Math.random() * 20;

            return (
              <div
                key={i}
                className="absolute text-amber-400 animate-bounce"
                style={{
                  left: `${left}%`,
                  top: `${Math.random() * 80}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  opacity: 0.8,
                }}
              >
                <Sparkles size={size} className="animate-spin text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              </div>
            );
          })}
        </div>
      )}

      {/* Main Celebration Card */}
      <div className="relative w-full max-w-md mx-4 p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-[#0c1017] to-amber-950/40 border-2 border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center space-y-6 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X size={16} />
        </button>

        {/* 3D Gold Token Icon with Bounce & Ring */}
        <div className="relative mx-auto flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 border-2 border-amber-400/40 animate-ping" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 border-2 border-amber-200 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-bounce">
            <Coins size={42} className="drop-shadow-md text-amber-950" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white border-2 border-slate-900 shadow-md">
            <PartyPopper size={16} />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2 relative z-10">
          <Badge className="bg-amber-500/20 border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-widest px-3 py-1 uppercase rounded-full inline-flex items-center gap-1.5">
            <Sparkles size={12} className="animate-spin" /> Notifikasi Token Baru
          </Badge>
          <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
            🎉 Hore! Kuota Token Berhasil Ditambahkan!
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed pt-1">
            Admin telah memberikan tambahan token prompt ke akun Anda. Sekarang Anda dapat melanjutkan menyusun Canvas, PRD, Tasks, & Prompts!
          </p>
        </div>

        {/* Stats Pill */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-3 divide-x divide-slate-800 text-center relative z-10 shadow-inner">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Token Ditambahkan</span>
            <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              <Zap size={16} className="text-amber-400" /> +{addedCount} Token
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Kuota Token</span>
            <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Coins size={16} className="text-emerald-400" /> {newTotal} Token
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 relative z-10">
          <Button
            onClick={onClose}
            className="w-full h-11 text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] rounded-xl gap-2"
          >
            Lanjutkan Perancangan <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
