import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
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

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formPassword, setFormPassword] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.admin.users.list();
      setUsers(res || []);
    } catch {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("user");
    setFormPassword("");
    setFormActive(true);
    setDialogOpen(true);
  }

  function handleOpenEdit(u: User) {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormPassword("");
    setFormActive(u.isActive);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Nama dan email wajib diisi");
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      toast.error("Password wajib diisi untuk pengguna baru");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName,
        email: formEmail,
        role: formRole,
        password: formPassword.trim() || undefined,
        isActive: formActive,
      };

      if (editingUser) {
        await api.admin.users.update(editingUser.id, payload);
        toast.success("Pengguna berhasil diperbarui");
      } else {
        await api.admin.users.create(payload);
        toast.success("Pengguna berhasil ditambahkan");
      }
      setDialogOpen(false);
      loadUsers();
    } catch {
      toast.error("Gagal menyimpan data pengguna");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;
    try {
      await api.admin.users.delete(id);
      toast.success("Pengguna berhasil dihapus");
      loadUsers();
    } catch {
      toast.error("Gagal menghapus pengguna");
    }
  }

  async function handleToggleActive(u: User) {
    try {
      const nextActive = !u.isActive;
      await api.admin.users.update(u.id, { isActive: nextActive });
      setUsers(prev => prev.map(item => item.id === u.id ? { ...item, isActive: nextActive } : item));
      toast.success(`Pengguna ${nextActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  return (
    <AdminPage
      title="Kelola User"
      subtitle="Manajemen akun pengguna dan peran (role) sistem"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah User
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat Pada</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-white">{u.name}</TableCell>
                    <TableCell className="text-white">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(u)} className="cursor-pointer">
                        <Badge variant={u.isActive ? "default" : "outline"} className="text-[10px]">
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => handleOpenEdit(u)}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" title="Hapus" className="hover:text-destructive" onClick={() => handleDelete(u.id)}><Trash2 size={14} /></Button>
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
              <DialogTitle>{editingUser ? "Edit Akun Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
              <DialogDescription>Masukkan detail identitas dan hak akses pengguna</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Rafi Pratama" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Alamat Email</Label>
                <Input id="email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Contoh: rafi@app.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role / Peran</Label>
                  <select
                    id="role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as "admin" | "user")}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{editingUser ? "Password Baru (Opsional)" : "Password"}</Label>
                  <Input id="password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Masukkan password"} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="active" className="cursor-pointer">Aktifkan akun pengguna</Label>
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
