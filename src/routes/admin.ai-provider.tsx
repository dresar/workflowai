import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Settings, Pencil, Activity, Server, Trash2, Loader2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/ai-provider")({
  component: AIProviderPage,
});

interface Provider {
  id: string;
  name: string;
  displayName: string;
  defaultModel: string;
  priority: number;
  isActive: boolean;
  timeoutMs: number;
  maxRetries: number;
}

function AIProviderPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formDefaultModel, setFormDefaultModel] = useState("");
  const [formPriority, setFormPriority] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [formTimeoutMs, setFormTimeoutMs] = useState(60000);
  const [formMaxRetries, setFormMaxRetries] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    try {
      const res = await api.admin.providers.list();
      setProviders(res || []);
    } catch {
      toast.error("Gagal memuat data provider");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingProvider(null);
    setFormName("");
    setFormDisplayName("");
    setFormDefaultModel("");
    setFormPriority(providers.length + 1);
    setFormActive(true);
    setFormTimeoutMs(60000);
    setFormMaxRetries(3);
    setDialogOpen(true);
  }

  function handleOpenEdit(p: Provider) {
    setEditingProvider(p);
    setFormName(p.name);
    setFormDisplayName(p.displayName);
    setFormDefaultModel(p.defaultModel);
    setFormPriority(p.priority);
    setFormActive(p.isActive);
    setFormTimeoutMs(p.timeoutMs);
    setFormMaxRetries(p.maxRetries);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formDisplayName.trim()) {
      toast.error("Nama provider wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formName,
        displayName: formDisplayName,
        defaultModel: formDefaultModel,
        priority: Number(formPriority),
        isActive: formActive,
        timeoutMs: Number(formTimeoutMs),
        maxRetries: Number(formMaxRetries),
      };

      if (editingProvider) {
        await api.admin.providers.update(editingProvider.id, payload);
        toast.success("Provider berhasil diperbarui");
      } else {
        await api.admin.providers.create(payload);
        toast.success("Provider berhasil ditambahkan");
      }
      setDialogOpen(false);
      loadProviders();
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus provider ini?")) return;
    try {
      await api.admin.providers.delete(id);
      toast.success("Provider berhasil dihapus");
      loadProviders();
    } catch {
      toast.error("Gagal menghapus provider");
    }
  }

  return (
    <AdminPage
      title="AI Provider"
      subtitle="Kelola provider AI yang digunakan sistem"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Provider
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div key={p.id} className="card-premium p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                      <Server size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{p.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.defaultModel}</div>
                    </div>
                  </div>
                  <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <Info label="Prioritas" value={`#${p.priority}`} />
                  <Info label="Timeout" value={`${p.timeoutMs / 1000}s`} />
                  <Info label="Max Retries" value={`${p.maxRetries}x`} />
                  <Info label="Identifier" value={p.name} />
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEdit(p)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="px-3" onClick={() => handleDelete(p.id)}>
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
              <DialogTitle>{editingProvider ? "Edit AI Provider" : "Tambah AI Provider"}</DialogTitle>
              <DialogDescription>Masukkan detail AI Provider</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Identifier (Sistem)</Label>
                  <Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: gemini, groq" disabled={!!editingProvider} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Nama Tampilan</Label>
                  <Input id="displayName" value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="Contoh: Google Gemini" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultModel">Default Model</Label>
                <Input id="defaultModel" value={formDefaultModel} onChange={e => setFormDefaultModel(e.target.value)} placeholder="Contoh: gemini-2.0-flash" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Prioritas</Label>
                  <Input id="priority" type="number" value={formPriority} onChange={e => setFormPriority(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeoutMs">Timeout (ms)</Label>
                  <Input id="timeoutMs" type="number" value={formTimeoutMs} onChange={e => setFormTimeoutMs(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxRetries">Retries</Label>
                  <Input id="maxRetries" type="number" value={formMaxRetries} onChange={e => setFormMaxRetries(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="active" className="cursor-pointer">Aktifkan provider</Label>
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

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
