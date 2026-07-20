

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Boxes, Trash2, Loader2, FolderPlus, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
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

const DEFAULT_CATEGORIES = [
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
  "AI Coding & Tools",
];

interface Technology {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string | null;
  iconUrl?: string | null;
  isActive: boolean;
}

function TechnologyPage() {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("Semua");
  const [q, setQ] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Dialog State: Tambah/Edit Technology
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Frontend");
  const [formVersion, setFormVersion] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIconUrl, setFormIconUrl] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog State: Tambah Category Baru
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    loadTechs();
  }, []);

  async function loadTechs() {
    setLoading(true);
    try {
      const res = await api.admin.technologies.list({ limit: 500 });
      const items: Technology[] = res || [];
      setTechs(items);

      // Kumpulkan kategori kustom yang belum ada di DEFAULT_CATEGORIES
      const fetchedCats = Array.from(new Set(items.map(t => t.category))).filter(
        c => c && !DEFAULT_CATEGORIES.includes(c)
      );
      setCustomCategories(fetchedCats);
    } catch (err) {
      toast.error("Gagal memuat data teknologi");
    } finally {
      setLoading(false);
    }
  }

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories]));

  function handleOpenCreate() {
    setEditingTech(null);
    setFormName("");
    setFormCategory("Frontend");
    setFormVersion("");
    setFormDesc("");
    setFormIconUrl("");
    setFormActive(true);
    setDialogOpen(true);
  }

  function handleOpenEdit(t: Technology) {
    setEditingTech(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormVersion(t.version || "");
    setFormDesc(t.description || "");
    setFormIconUrl(t.iconUrl || "");
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
        iconUrl: formIconUrl.trim() || null,
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

  function handleAddCustomCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Kategori ini sudah ada");
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    setFormCategory(trimmed);
    setNewCatName("");
    setCatDialogOpen(false);
    toast.success(`Kategori "${trimmed}" berhasil ditambahkan!`);
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
      title="Teknologi & Tools"
      subtitle="Kelola kategori, teknologi, dan tools pembuat website (Cursor, Trae, Hono, Django, Laravel, dll)"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" /> Tambah Kategori
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Teknologi
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cari teknologi atau tools (misal: Cursor, Hono, Django)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Categories Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {allCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              cat.toLowerCase() === c.toLowerCase()
                ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-slate-900",
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
            <div key={t.id} className="card-premium p-5 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 p-2 overflow-hidden">
                    {t.iconUrl ? (
                      <img
                        src={t.iconUrl}
                        alt={t.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          // Fallback jika image CDN bermasalah
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Boxes size={20} className="text-primary" />
                    )}
                  </div>
                  <button onClick={() => handleToggleActive(t)} className="cursor-pointer">
                    <Badge variant={t.isActive ? "default" : "secondary"} className="text-[10px]">
                      {t.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </button>
                </div>
                <div className="mt-4 font-bold text-white text-sm flex items-center gap-1.5">
                  {t.name}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">{t.category}</Badge>
                  {t.version && <span className="text-[11px]">v{t.version}</span>}
                </div>
                <p className="mt-3 text-xs text-slate-400 line-clamp-3 leading-relaxed">{t.description || "-"}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => handleOpenEdit(t)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="px-2.5 h-8" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              Tidak ada teknologi atau tool dalam kategori ini. Klik "Tambah Teknologi" di kanan atas untuk membuat baru.
            </div>
          )}
        </div>
      )}

      {/* Dialog: Tambah/Edit Technology & Tools */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#0c1017] border border-slate-800 text-slate-100">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-indigo-400">
                {editingTech ? "Edit Teknologi / Tool" : "Tambah Teknologi / Tool Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Masukkan detail nama, kategori, versi, serta logo CDN icon.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Teknologi / Tool</Label>
                <Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Cursor, Trae, Hono, Django, Laravel" className="bg-slate-900 border-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                  >
                    {allCategories.filter(c => c !== "Semua").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="version">Versi</Label>
                  <Input id="version" value={formVersion} onChange={e => setFormVersion(e.target.value)} placeholder="Contoh: 19.0, v1.0" className="bg-slate-900 border-slate-800" />
                </div>
              </div>

              {/* Logo CDN URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="iconUrl" className="flex items-center gap-1">
                    <LinkIcon size={12} className="text-indigo-400" /> Logo Icon CDN URL
                  </Label>
                  {formIconUrl && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <ImageIcon size={10} /> Preview OK
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    id="iconUrl"
                    value={formIconUrl}
                    onChange={e => setFormIconUrl(e.target.value)}
                    placeholder="https://cdn.simpleicons.org/cursor"
                    className="bg-slate-900 border-slate-800 text-xs font-mono"
                  />
                  {formIconUrl && (
                    <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 p-1">
                      <img src={formIconUrl} alt="preview" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Gunakan CDN URL (misal: SimpleIcons <code>https://cdn.simpleicons.org/hono</code>) atau URL gambar custom.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc">Deskripsi Singkat</Label>
                <Textarea id="desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Tulis deskripsi singkat teknologi/tool ini..." rows={3} className="bg-slate-900 border-slate-800 text-xs" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="active" className="cursor-pointer text-slate-300">Aktifkan teknologi ini di wizard</Label>
              </div>
            </div>
            <DialogFooter className="border-t border-slate-850 pt-3">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting} className="text-xs">Batal</Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                {submitting ? "Menyimpan..." : "Simpan Teknologi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tambah Kategori Baru */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm bg-[#0c1017] border border-slate-800 text-slate-100">
          <form onSubmit={handleAddCustomCategory}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                <FolderPlus size={15} /> Tambah Kategori Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Buat nama kategori baru untuk mengelompokkan teknologi & tools.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="catName">Nama Kategori</Label>
                <Input
                  id="catName"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Contoh: Low-Code Engine, AI Agents"
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-slate-850 pt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCatDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                Tambah Kategori
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

