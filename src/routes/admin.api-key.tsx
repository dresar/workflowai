import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power, Wifi, Loader2 } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/api-key")({
  component: APIKeyPage,
});

interface ApiKey {
  id: string;
  providerId: string;
  label: string;
  keyPreview: string;
  isActive: boolean;
  priority: number;
  totalRequests: number;
  failedRequests: number;
  quotaLimit: number | null;
  quotaUsed: number;
}

interface Provider {
  id: string;
  name: string;
  displayName: string;
}

function APIKeyPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  const [formProviderId, setFormProviderId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formPriority, setFormPriority] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [keysRes, providersRes] = await Promise.all([
        api.admin.apiKeys.list(),
        api.admin.providers.list(),
      ]);
      setKeys(keysRes || []);
      setProviders(providersRes || []);
    } catch {
      toast.error("Gagal memuat data API Key");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingKey(null);
    setFormProviderId(providers[0]?.id || "");
    setFormLabel("");
    setFormApiKey("");
    setFormPriority(keys.length + 1);
    setFormActive(true);
    setDialogOpen(true);
  }

  function handleOpenEdit(k: ApiKey) {
    setEditingKey(k);
    setFormProviderId(k.providerId);
    setFormLabel(k.label);
    setFormApiKey("");
    setFormPriority(k.priority);
    setFormActive(k.isActive);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formLabel.trim()) {
      toast.error("Label wajib diisi");
      return;
    }
    if (!editingKey && !formApiKey.trim()) {
      toast.error("API Key wajib diisi untuk key baru");
      return;
    }

    setSubmitting(true);
    try {
      if (editingKey) {
        await api.admin.apiKeys.update(editingKey.id, {
          label: formLabel,
          priority: Number(formPriority),
          isActive: formActive,
        });
        toast.success("API Key berhasil diperbarui");
      } else {
        await api.admin.apiKeys.create({
          providerId: formProviderId,
          label: formLabel,
          apiKey: formApiKey,
          priority: Number(formPriority),
        });
        toast.success("API Key berhasil ditambahkan");
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus API Key ini?")) return;
    try {
      await api.admin.apiKeys.delete(id);
      toast.success("API Key berhasil dihapus");
      loadData();
    } catch {
      toast.error("Gagal menghapus API Key");
    }
  }

  async function handleToggleActive(k: ApiKey) {
    try {
      const nextActive = !k.isActive;
      await api.admin.apiKeys.update(k.id, { isActive: nextActive });
      setKeys(prev => prev.map(item => item.id === k.id ? { ...item, isActive: nextActive } : item));
      toast.success(`API Key ${nextActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  async function handleResetQuota(id: string) {
    try {
      await api.admin.apiKeys.resetQuota(id);
      toast.success("Quota berhasil di-reset");
      loadData();
    } catch {
      toast.error("Gagal me-reset quota");
    }
  }

  function getProviderName(providerId: string) {
    const found = providers.find(p => p.id === providerId);
    return found ? found.displayName : "Unknown";
  }

  return (
    <AdminPage
      title="API Key"
      subtitle="Kelola seluruh API Key untuk provider AI"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah API Key
        </Button>
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
                  <TableHead>Provider</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>API Key Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prio</TableHead>
                  <TableHead>Usage (Requests)</TableHead>
                  <TableHead>Quota Used</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-white">{getProviderName(k.providerId)}</TableCell>
                    <TableCell className="text-white">{k.label}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">{k.keyPreview}</TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(k)} className="cursor-pointer">
                        <Badge variant={k.isActive ? "default" : "secondary"} className="text-[10px]">
                          {k.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-white">#{k.priority}</TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      Total: {k.totalRequests} | Gagal: {k.failedRequests}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">{k.quotaUsed}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Reset Quota" onClick={() => handleResetQuota(k.id)}><Wifi size={14} /></Button>
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => handleOpenEdit(k)}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" title="Hapus" className="hover:text-destructive" onClick={() => handleDelete(k.id)}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingKey ? "Edit API Key" : "Tambah API Key Baru"}</DialogTitle>
              <DialogDescription>Masukkan konfigurasi kredensial API Key</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingKey && (
                <div className="space-y-1.5">
                  <Label htmlFor="provider">AI Provider</Label>
                  <select
                    id="provider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formProviderId}
                    onChange={e => setFormProviderId(e.target.value)}
                  >
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="label">Label</Label>
                <Input id="label" value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Contoh: Primary Key, Fallback 1" />
              </div>
              {!editingKey && (
                <div className="space-y-1.5">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input id="apiKey" type="password" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} placeholder="Masukkan API Key asli" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Prioritas (Priority)</Label>
                  <Input id="priority" type="number" value={formPriority} onChange={e => setFormPriority(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="active" className="cursor-pointer">Aktifkan API Key</Label>
                </div>
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
