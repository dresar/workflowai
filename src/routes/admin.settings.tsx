

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, User, Coins, Sliders, Bell, Plus, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  promptTokens: number;
  isActive: boolean;
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "tokens">("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    app_name: "AI Software Architect",
    app_tagline: "AI Workflow Generator Studio",
    app_description: "Platform AI Workflow Studio untuk menyusun Canvas, PRD, Tasks & Prompt Modular 2026",
    app_version: "2.5.0",
    default_language: "id",
    footer_text: "© 2026 AI Workflow Studio. All rights reserved.",
    max_projects_per_user: "10",
    enable_registration: "true",
    default_user_tokens: "100",
    token_system_active: "true",
  });

  // Admin Profile State
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<string>("");
  const [profileName, setProfileName] = useState("System Administrator");
  const [profileEmail, setProfileEmail] = useState("admin@workflowai.studio");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileRole, setProfileRole] = useState("admin");
  const [savingProfile, setSavingProfile] = useState(false);

  // Token Top-Up State
  const [selectedUserForToken, setSelectedUserForToken] = useState<string>("");
  const [tokenAmountInput, setTokenAmountInput] = useState<number>(1);
  const [addingTokens, setAddingTokens] = useState(false);
  const [lastNotification, setLastNotification] = useState<{ name: string; added: number; newTotal: number } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        api.admin.settings.get().catch(() => null),
        api.admin.users.list().catch(() => []),
      ]);

      if (settingsRes) {
        setValues(prev => ({ ...prev, ...settingsRes }));
      }
      if (Array.isArray(usersRes) && usersRes.length > 0) {
        setUsersList(usersRes);
        setSelectedUserForProfile(usersRes[0].id);
        setSelectedUserForToken(usersRes[0].id);
        setProfileName(usersRes[0].name || "Admin User");
        setProfileEmail(usersRes[0].email || "admin@workflowai.studio");
        setProfileRole(usersRes[0].role || "admin");
      }
    } catch {
      toast.error("Gagal memuat data pengaturan");
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await api.admin.settings.update(values);
      toast.success("Pengaturan aplikasi berhasil disimpan ke database!");
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectUserProfile(userId: string) {
    setSelectedUserForProfile(userId);
    const target = usersList.find(u => u.id === userId);
    if (target) {
      setProfileName(target.name);
      setProfileEmail(target.email);
      setProfileRole(target.role);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      toast.error("Nama dan email wajib diisi");
      return;
    }
    setSavingProfile(true);
    try {
      const payload: any = {
        name: profileName,
        email: profileEmail,
        role: profileRole,
      };
      if (profilePassword.trim()) {
        payload.password = profilePassword;
      }

      if (selectedUserForProfile) {
        await api.admin.users.update(selectedUserForProfile, payload);
        toast.success(`Profil "${profileName}" berhasil diperbarui!`);
        setProfilePassword("");
        loadAllData();
      } else {
        toast.error("Pilih pengguna terlebih dahulu");
      }
    } catch {
      toast.error("Gagal memperbarui profil pengguna");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddTokens(amountToAdd: number) {
    if (!selectedUserForToken) {
      toast.error("Pilih pengguna yang akan ditambahkan token");
      return;
    }
    const targetUser = usersList.find(u => u.id === selectedUserForToken);
    if (!targetUser) return;

    setAddingTokens(true);
    try {
      const res = await api.admin.users.addTokens(selectedUserForToken, amountToAdd);
      const newTotal = res?.newTotal ?? ((targetUser.promptTokens || 0) + amountToAdd);

      // Trigger Notifikasi Realtime Toast & Banner Notifikasi
      const notifData = { name: targetUser.name, added: amountToAdd, newTotal };
      setLastNotification(notifData);

      toast.success(
        `⚡ Notifikasi Admin: Berhasil menambahkan ${amountToAdd} token ke akun ${targetUser.name}! Total Token: ${newTotal}`,
        {
          duration: 6000,
          icon: <Sparkles className="text-amber-400" />,
        }
      );

      // Update UI state
      setUsersList(prev => prev.map(u => u.id === selectedUserForToken ? { ...u, promptTokens: newTotal } : u));
    } catch {
      toast.error("Gagal menambahkan token ke akun");
    } finally {
      setAddingTokens(false);
    }
  }

  return (
    <AdminPage
      title="Pengaturan & Profil"
      subtitle="Konfigurasi umum aplikasi, edit profil admin, dan manajemen top-up token pengguna"
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveSettings} disabled={loading || saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Pengaturan
          </Button>
        </div>
      }
    >
      {/* Realtime Notification Banner (Jika Ada Penambahan Token Terbaru) */}
      {lastNotification && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-amber-950/40 border border-amber-500/30 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>⚡ NOTIFIKASI ADMIN: TOKEN DITAMBAHKAN!</span>
                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-500/10">Realtime Event</Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Admin berhasil menambahkan <strong className="text-amber-300">+{lastNotification.added} Token</strong> ke pengguna <strong>"{lastNotification.name}"</strong>. Total Token Sekarang: <strong className="text-emerald-400">{lastNotification.newTotal} Token</strong>.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLastNotification(null)} className="text-xs text-slate-400 hover:text-slate-200">
            Tutup
          </Button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "general"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          )}
        >
          <Sliders size={14} /> Identitas & System
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          )}
        >
          <User size={14} /> Edit Profil Admin
        </button>

        <button
          onClick={() => setActiveTab("tokens")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "tokens"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          )}
        >
          <Coins size={14} /> Alokasi & Top-Up Token
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: IDENTITAS & SYSTEM SETTINGS */}
          {activeTab === "general" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card-premium p-6 space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Sliders size={16} /> Identitas Aplikasi
                </h3>
                <div className="space-y-4 pt-1">
                  <Field label="Nama Aplikasi">
                    <Input value={values.app_name} onChange={e => handleFieldChange("app_name", e.target.value)} className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                  <Field label="Tagline">
                    <Input value={values.app_tagline} onChange={e => handleFieldChange("app_tagline", e.target.value)} className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                  <Field label="Deskripsi Platform">
                    <Textarea value={values.app_description} onChange={e => handleFieldChange("app_description", e.target.value)} rows={3} className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                  <Field label="Versi Aplikasi">
                    <Input value={values.app_version} onChange={e => handleFieldChange("app_version", e.target.value)} className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                </div>
              </div>

              <div className="card-premium p-6 space-y-6">
                <div>
                  <h3 className="mb-4 text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <ShieldCheck size={16} /> Preferensi & Aturan Pendaftaran
                  </h3>
                  <div className="space-y-4">
                    <Field label="Bahasa Default">
                      <select
                        className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                        value={values.default_language}
                        onChange={e => handleFieldChange("default_language", e.target.value)}
                      >
                        <option value="id">Indonesia (Bahasa Indonesia)</option>
                        <option value="en">English (Inggris)</option>
                      </select>
                    </Field>

                    <Field label="Maksimal Project per User">
                      <Input type="number" value={values.max_projects_per_user} onChange={e => handleFieldChange("max_projects_per_user", e.target.value)} className="bg-slate-900 border-slate-800 text-xs" />
                    </Field>

                    <Field label="Pendaftaran Pengguna Baru">
                      <select
                        className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                        value={values.enable_registration}
                        onChange={e => handleFieldChange("enable_registration", e.target.value)}
                      >
                        <option value="true">Diizinkan (Terbuka)</option>
                        <option value="false">Dinonaktifkan (Privat)</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold text-slate-300">Footer Website</h3>
                  <Field label="Teks Footer">
                    <Input value={values.footer_text} onChange={e => handleFieldChange("footer_text", e.target.value)} className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFIL ADMIN */}
          {activeTab === "profile" && (
            <div className="max-w-2xl mx-auto card-premium p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <User size={18} /> Edit Profil Admin / Pengguna
                </h3>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                  Database Direct Sync
                </Badge>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Field label="Pilih Akun yang Ingin Di-edit">
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                    value={selectedUserForProfile}
                    onChange={e => handleSelectUserProfile(e.target.value)}
                  >
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — Role: {u.role.toUpperCase()} — {u.promptTokens} Tokens
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nama Lengkap">
                    <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Nama Pengguna" className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>

                  <Field label="Alamat Email">
                    <Input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="admin@example.com" className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Role Akses">
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                      value={profileRole}
                      onChange={e => setProfileRole(e.target.value)}
                    >
                      <option value="admin">Administrator (Full Access)</option>
                      <option value="user">User Biasa</option>
                    </select>
                  </Field>

                  <Field label="Password Baru (Kosongkan jika tidak diubah)">
                    <Input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="••••••••" className="bg-slate-900 border-slate-800 text-xs" />
                  </Field>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 h-9">
                    {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Simpan Perubahan Profil
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ALOKASI & TOP-UP TOKEN */}
          {activeTab === "tokens" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Box 1: Quick Token Top-Up Tool */}
              <div className="lg:col-span-2 card-premium p-6 space-y-5 border-amber-500/20 bg-amber-950/10">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Coins size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-300">Tool Penambahan Token Realtime</h3>
                      <p className="text-[11px] text-slate-400">Tambahkan token ke akun admin/pengguna dengan notifikasi langsung</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] uppercase">
                    Admin Top-Up
                  </Badge>
                </div>

                <div className="space-y-4">
                  <Field label="Pilih Akun Tujuan Top-Up">
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200 font-medium"
                      value={selectedUserForToken}
                      onChange={e => setSelectedUserForToken(e.target.value)}
                    >
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          👤 {u.name} ({u.email}) — Saat ini: {u.promptTokens} Token
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div>
                    <Label className="text-xs text-slate-300 mb-2 block font-medium">Pilih Quick Nominal Token:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 5, 10, 50].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          onClick={() => handleAddTokens(amt)}
                          disabled={addingTokens}
                          className="h-10 text-xs font-bold border-amber-500/30 text-amber-300 hover:bg-amber-950/60 hover:border-amber-500/60 gap-1"
                        >
                          <Plus size={12} /> {amt} Token
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-slate-400">Atau Masukkan Nominal Kustom:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tokenAmountInput}
                        onChange={e => setTokenAmountInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-slate-900 border-slate-800 text-xs font-bold text-amber-300"
                      />
                    </div>

                    <Button
                      onClick={() => handleAddTokens(tokenAmountInput)}
                      disabled={addingTokens}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 px-5 gap-1.5"
                    >
                      {addingTokens ? <Loader2 size={13} className="animate-spin" /> : <Coins size={14} />}
                      + Tambahkan {tokenAmountInput} Token
                    </Button>
                  </div>
                </div>
              </div>

              {/* Box 2: System Default Allocation Settings */}
              <div className="card-premium p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-indigo-400" /> Konfigurasi Token System
                </h3>

                <div className="space-y-4 pt-1">
                  <Field label="Default Token Pengguna Baru">
                    <Input
                      type="number"
                      value={values.default_user_tokens || "100"}
                      onChange={e => handleFieldChange("default_user_tokens", e.target.value)}
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </Field>

                  <Field label="Status Sistem Token">
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                      value={values.token_system_active || "true"}
                      onChange={e => handleFieldChange("token_system_active", e.target.value)}
                    >
                      <option value="true">Aktif (Gunakan Kuota Token)</option>
                      <option value="false">Bebas Limit (Unlimited Token)</option>
                    </select>
                  </Field>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-slate-400 leading-relaxed mt-4">
                  💡 <strong>Info Token:</strong> Setiap kali user melakukan generate AI (Canvas, PRD, Tasks, atau Prompts), sistem akan mengurangi kuota token sebesar 1 token. Admin dapat menambah token pengguna secara realtime.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-300 font-medium">{label}</Label>
      {children}
    </div>
  );
}

