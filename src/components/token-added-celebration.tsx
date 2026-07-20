import { useEffect, useState } from "react";
import { Coins, Sparkles, PartyPopper, Zap, X, ArrowRight, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TokenCelebrationProps {
  open: boolean;
  addedCount: number;
  newTotal: number;
  reason?: string;
  onClose: () => void;
}

export function TokenAddedCelebration({ open, addedCount, newTotal, reason, onClose }: TokenCelebrationProps) {
  const [showParticles, setShowParticles] = useState(false);
  const isDeduction = addedCount < 0;

  useEffect(() => {
    if (open && !isDeduction) {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open, isDeduction]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Particle Sparkles (Hanya saat penambahan token) */}
      {showParticles && !isDeduction && (
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

      {/* Main Card */}
      <div
        className={cn(
          "relative w-full max-w-md mx-4 p-7 rounded-3xl text-center space-y-5 animate-in zoom-in-95 duration-300 overflow-hidden border-2 shadow-2xl",
          isDeduction
            ? "bg-gradient-to-b from-slate-900 via-[#180d10] to-rose-950/40 border-rose-500/50 shadow-[0_0_60px_rgba(244,63,94,0.35)]"
            : "bg-gradient-to-b from-slate-900 via-[#0c1017] to-amber-950/40 border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.35)]"
        )}
      >
        {/* Glow Effects */}
        <div
          className={cn(
            "absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none animate-pulse",
            isDeduction ? "bg-rose-500/20" : "bg-amber-500/20"
          )}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X size={16} />
        </button>

        {/* Top Icon Badge */}
        <div className="relative mx-auto flex items-center justify-center w-24 h-24">
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 animate-ping",
              isDeduction ? "bg-rose-500/20 border-rose-400/40" : "bg-amber-500/20 border-amber-400/40"
            )}
          />
          <div
            className={cn(
              "relative flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-slate-950 shadow-xl animate-bounce",
              isDeduction
                ? "bg-gradient-to-br from-rose-400 via-rose-500 to-amber-600 border-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                : "bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 border-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.6)]"
            )}
          >
            {isDeduction ? (
              <ShieldAlert size={42} className="drop-shadow-md text-slate-950" />
            ) : (
              <Coins size={42} className="drop-shadow-md text-amber-950" />
            )}
          </div>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-white border-2 border-slate-900 shadow-md",
              isDeduction ? "bg-rose-600" : "bg-indigo-600"
            )}
          >
            {isDeduction ? <AlertTriangle size={15} /> : <PartyPopper size={16} />}
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2 relative z-10">
          <Badge
            className={cn(
              "text-[11px] font-bold tracking-widest px-3 py-1 uppercase rounded-full inline-flex items-center gap-1.5 border",
              isDeduction
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300"
            )}
          >
            {isDeduction ? <AlertTriangle size={12} /> : <Sparkles size={12} className="animate-spin" />}
            {isDeduction ? "Peringatan Penyesuaian Token" : "Notifikasi Token Baru"}
          </Badge>

          <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
            {isDeduction ? "⚠️ Pemberitahuan Penyesuaian Kuota Token" : "🎉 Hore! Kuota Token Berhasil Ditambahkan!"}
          </h2>

          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed pt-0.5">
            {isDeduction
              ? "Admin telah melakukan pengurangan / koreksi kuota token prompt pada akun Anda."
              : "Admin telah memberikan tambahan token prompt ke akun Anda. Sekarang Anda dapat melanjutkan menyusun proyek!"}
          </p>
        </div>

        {/* Alasan Pengurangan Box (Jika Ada Pengurangan) */}
        {isDeduction && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-left space-y-1 relative z-10 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-rose-400" /> Alasan Pengurangan:
            </div>
            <p className="text-xs font-medium text-slate-200 leading-relaxed italic">
              "{reason || 'Penyesuaian koreksi sistem kuota token oleh Administrator'}"
            </p>
          </div>
        )}

        {/* Stats Pill */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-3 divide-x divide-slate-800 text-center relative z-10 shadow-inner">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perubahan Token</span>
            <div
              className={cn(
                "text-lg font-black flex items-center justify-center gap-1 mt-0.5",
                isDeduction ? "text-rose-400" : "text-amber-400"
              )}
            >
              <Zap size={16} /> {addedCount > 0 ? `+${addedCount}` : addedCount} Token
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
        <div className="pt-1 relative z-10">
          <Button
            onClick={onClose}
            className={cn(
              "w-full h-11 text-xs font-bold text-slate-950 rounded-xl gap-2 shadow-lg",
              isDeduction
                ? "bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 hover:from-rose-400 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                : "bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            )}
          >
            {isDeduction ? "Saya Mengerti & Lanjutkan" : "Lanjutkan Perancangan"} <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}

