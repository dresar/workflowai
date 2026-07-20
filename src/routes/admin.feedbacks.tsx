import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Loader2, MessageSquare, AlertCircle, Lightbulb, Eye } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/feedbacks")({
  component: FeedbacksPage,
});

interface Feedback {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  type: "bug" | "feature";
  content: string;
  createdAt: string;
}

function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bug" | "feature">("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  async function loadFeedbacks() {
    setLoading(true);
    try {
      const res = await api.admin.feedbacks.list();
      setFeedbacks(res || []);
    } catch {
      toast.error("Gagal memuat daftar feedback");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus masukan ini?")) return;
    try {
      await api.admin.feedbacks.delete(id);
      toast.success("Feedback berhasil dihapus");
      loadFeedbacks();
    } catch {
      toast.error("Gagal menghapus feedback");
    }
  }

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filter === "all") return true;
    return f.type === filter;
  });

  return (
    <AdminPage
      title="Kelola Laporan & Saran"
      subtitle="Manajemen laporan bug dan saran fitur dari pengguna sistem"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Semua
          </Button>
          <Button
            size="sm"
            variant={filter === "bug" ? "default" : "outline"}
            onClick={() => setFilter("bug")}
            className="flex items-center gap-1.5"
          >
            <AlertCircle size={14} /> Bug
          </Button>
          <Button
            size="sm"
            variant={filter === "feature" ? "default" : "outline"}
            onClick={() => setFilter("feature")}
            className="flex items-center gap-1.5"
          >
            <Lightbulb size={14} /> Fitur
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengirim</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="min-w-[300px]">Isi Laporan / Saran</TableHead>
                  <TableHead>Dibuat Pada</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Tidak ada laporan atau saran yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedbacks.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{f.userName || "Guest User"}</span>
                          <span className="text-xs text-muted-foreground">{f.userEmail || "Tanpa Email"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={f.type === "bug" ? "destructive" : "secondary"}
                          className="text-[10px] capitalize flex items-center gap-1 w-fit"
                        >
                          {f.type === "bug" ? (
                            <>
                              <AlertCircle size={10} /> Bug
                            </>
                          ) : (
                            <>
                              <Lightbulb size={10} /> Fitur
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-200 text-sm whitespace-pre-wrap">
                        {f.content}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {new Date(f.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Lihat Detail"
                            onClick={() => setSelectedFeedback(f)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Hapus / Selesai"
                            className="hover:text-destructive"
                            onClick={() => handleDelete(f.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={selectedFeedback !== null} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              Detail Masukan Pengguna
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Berikut detail laporan bug atau usulan fitur dari pengguna.
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4 py-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-500 font-medium block">Pengirim</span>
                  <span className="text-sm font-semibold text-white">{selectedFeedback.userName || "Guest User"}</span>
                  <span className="text-xs text-zinc-400 block">{selectedFeedback.userEmail || "Tanpa Email"}</span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-xs text-zinc-500 font-medium block">Tipe</span>
                  <Badge variant={selectedFeedback.type === "bug" ? "destructive" : "secondary"}>
                    {selectedFeedback.type === "bug" ? "Bug / Error" : "Usulan Fitur"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-zinc-500 font-medium">Isi Laporan / Usulan</span>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                  {selectedFeedback.content}
                </div>
              </div>

              <div className="text-xs text-zinc-500 text-right">
                Dikirim pada: {new Date(selectedFeedback.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedFeedback(null)}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              Tutup
            </Button>
            {selectedFeedback && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  handleDelete(selectedFeedback.id);
                  setSelectedFeedback(null);
                }}
                className="flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Hapus / Selesai
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
