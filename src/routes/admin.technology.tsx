

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Boxes, Trash2, Loader2, Check } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/technology")({
  component: TechnologyPage,
});

const CATEGORIES = [
  "Semua",
  "Frontend",
  "Backend",
  "Database",
  "Deployment",
  "Authentication",
  "Styling",
  "State Management",
  "Mobile",
  "Desktop",
  "Cloud",
  "DevOps",
  "Testing",
  "AI Framework",
];

interface Technology {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string | null;
  isActive: boolean;
}

function TechnologyPage() {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("Semua");
  const [q, setQ] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Frontend");
  const [formVersion, setFormVersion] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTechs();
  }, []);

  async function loadTechs() {
    setLoading(true);
    try {
      const res = await api.admin.technologies.list();
      setTechs(res || []);
    } catch (err) {
      toast.error("Gagal memuat data teknologi");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingTech(null);
    setFormName("");
    setFormCategory("Frontend");
    setFormVersion("");
    setFormDesc("");
    setFormActive(true);
    setDialogOpen(true);
  }

  function handleOpenEdit(t: Technology) {
    setEditingTech(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormVersion(t.version || "");
    setFormDesc(t.description || "");
    setFormActive(t.isActive);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nama teknologi wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formName,
        category: formCategory,
        version: formVersion,
        description: formDesc,
        isActive: formActive,
      };

      if (editingTech) {
        await api.admin.technologies.update(editingTech.id, payload);
        toast.success("Teknologi berhasil diperbarui");
      } else {
        await api.admin.technologies.create(payload);
        toast.success("Teknologi berhasil ditambahkan");
      }
      setDialogOpen(false);
      loadTechs();
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus teknologi ini?")) return;
    try {
      await api.admin.technologies.delete(id);
      toast.success("Teknologi berhasil dihapus");
      loadTechs();
    } catch {
      toast.error("Gagal menghapus teknologi");
    }
  }

  async function handleToggleActive(t: Technology) {
    try {
      const nextActive = !t.isActive;
      await api.admin.technologies.toggle(t.id, { isActive: nextActive });
      setTechs(prev => prev.map(item => item.id === t.id ? { ...item, isActive: nextActive } : item));
      toast.success(`Teknologi ${nextActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  const filtered = techs.filter(
    (t) =>
      (cat === "Semua" || t.category.toLowerCase() === cat.toLowerCase()) &&
      t.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AdminPage
      title="Teknologi"
      subtitle="Kelola daftar teknologi yang muncul di wizard pengguna"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Teknologi
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cari teknologi..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              cat.toLowerCase() === c.toLowerCase()
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <div key={t.id} className="card-premium p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Boxes size={18} />
                  </div>
                  <button onClick={() => handleToggleActive(t)} className="cursor-pointer">
                    <Badge variant={t.isActive ? "default" : "secondary"} className="text-[10px]">
                      {t.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </button>
                </div>
                <div className="mt-4 font-semibold text-white">{t.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                  {t.version && <span>v{t.version}</span>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-3">{t.description || "-"}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleOpenEdit(t)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="px-3" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTech ? "Edit Teknologi" : "Tambah Teknologi Baru"}</DialogTitle>
              <DialogDescription>Masukkan detail data teknologi</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama</Label>
                <Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: React, NestJS" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                  >
                    {CATEGORIES.filter(c => c !== "Semua").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="version">Versi</Label>
                  <Input id="version" value={formVersion} onChange={e => setFormVersion(e.target.value)} placeholder="Contoh: 19.0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Deskripsi</Label>
                <Textarea id="desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Tulis deskripsi singkat..." rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="active" className="cursor-pointer">Aktifkan teknologi</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
