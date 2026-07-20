import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, Phone, Send, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"bug" | "feature" | "whatsapp">("bug");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentUser = getUser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Konten tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    try {
      await api.feedback.create({
        type: activeTab === "bug" ? "bug" : "feature",
        content: content.trim(),
      });
      toast.success(
        activeTab === "bug" 
          ? "Laporan bug berhasil dikirim. Terima kasih!" 
          : "Usulan fitur berhasil dikirim. Terima kasih atas rekomendasinya!"
      );
      setContent("");
      setOpen(false);
    } catch (err) {
      toast.error("Gagal mengirim masukan");
    } finally {
      setSubmitting(false);
    }
  }

  function handleWhatsAppSupport() {
    const email = currentUser?.email || "";
    const name = currentUser?.name || "";
    const text = encodeURIComponent(
      `Halo Admin,\n\nSaya ${name} (${email}), ingin bertanya/meminta dukungan mengenai WorkflowAI. Mohon bantuannya.`
    );
    window.open(`https://wa.me/6282392115909?text=${text}`, "_blank");
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-110 hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group"
        aria-label="Dukungan & Umpan Balik"
      >
        <HelpCircle className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
        <span className="absolute right-16 scale-0 rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow transition-all duration-200 group-hover:scale-100 whitespace-nowrap border border-border">
          Butuh Bantuan?
        </span>
      </button>

      {/* Support Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Dukungan & Umpan Balik
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Laporkan masalah, rekomendasikan fitur, atau hubungi langsung admin.
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 my-4">
            <button
              onClick={() => {
                setActiveTab("bug");
                setContent("");
              }}
              className={`flex-1 pb-2.5 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "bug"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bug className="h-4 w-4" /> Bug
            </button>
            <button
              onClick={() => {
                setActiveTab("feature");
                setContent("");
              }}
              className={`flex-1 pb-2.5 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "feature"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Lightbulb className="h-4 w-4" /> Fitur
            </button>
            <button
              onClick={() => {
                setActiveTab("whatsapp");
                setContent("");
              }}
              className={`flex-1 pb-2.5 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "whatsapp"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Phone className="h-4 w-4" /> Hubungi
            </button>
          </div>

          {activeTab === "whatsapp" ? (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <Phone className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-white">Hubungi Admin via WhatsApp</h4>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  Butuh bantuan mendesak, pembelian token tambahan, atau konsultasi? Chat WhatsApp admin sekarang.
                </p>
              </div>
              <Button
                onClick={handleWhatsAppSupport}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Kirim Pesan WhatsApp
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="content">
                  {activeTab === "bug" ? "Deskripsi Error / Masalah" : "Rekomendasi Fitur Tambahan"}
                </Label>
                <Textarea
                  id="content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    activeTab === "bug"
                      ? "Contoh: Tombol generate API tidak merespon saat diklik, muncul error 500 di konsol browser."
                      : "Contoh: Saya merekomendasikan penambahan fitur ekspor skema database langsung ke format SQL file."
                  }
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus-visible:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="text-zinc-400 hover:text-white"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting} className="min-w-[100px]">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim
                    </>
                  ) : (
                    <>
                      Kirim <Send className="ml-2 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
