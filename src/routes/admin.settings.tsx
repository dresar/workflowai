

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    app_name: "AI Software Architect",
    app_tagline: "AI Workflow Generator",
    app_description: "",
    app_version: "1.0.0",
    default_language: "id",
    footer_text: "",
    max_projects_per_user: "10",
    enable_registration: "true",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.admin.settings.get();
        if (res) {
          setValues(prev => ({ ...prev, ...res }));
        }
      } catch {
        toast.error("Gagal memuat pengaturan");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function handleFieldChange(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.admin.settings.update(values);
      toast.success("Pengaturan berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage
      title="Pengaturan Aplikasi"
      subtitle="Konfigurasi umum aplikasi"
      actions={
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
            </>
          )}
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-premium p-6">
            <h3 className="mb-4 text-base font-semibold text-white">Identitas Aplikasi</h3>
            <div className="space-y-4">
              <Field label="Nama Aplikasi">
                <Input value={values.app_name} onChange={e => handleFieldChange("app_name", e.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input value={values.app_tagline} onChange={e => handleFieldChange("app_tagline", e.target.value)} />
              </Field>
              <Field label="Deskripsi">
                <Textarea value={values.app_description} onChange={e => handleFieldChange("app_description", e.target.value)} rows={4} />
              </Field>
              <Field label="Versi Aplikasi">
                <Input value={values.app_version} onChange={e => handleFieldChange("app_version", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="card-premium p-6 space-y-6">
            <div>
              <h3 className="mb-4 text-base font-semibold text-white">Preferensi Wizard</h3>
              <div className="space-y-4">
                <Field label="Bahasa Default">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={values.default_language}
                    onChange={e => handleFieldChange("default_language", e.target.value)}
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field label="Maksimal Project per User">
                  <Input type="number" value={values.max_projects_per_user} onChange={e => handleFieldChange("max_projects_per_user", e.target.value)} />
                </Field>
                <Field label="Pendaftaran Pengguna Baru">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={values.enable_registration}
                    onChange={e => handleFieldChange("enable_registration", e.target.value)}
                  >
                    <option value="true">Diizinkan</option>
                    <option value="false">Dinonaktifkan</option>
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-base font-semibold text-white">Footer</h3>
              <div className="space-y-4">
                <Field label="Teks Footer">
                  <Input value={values.footer_text} onChange={e => handleFieldChange("footer_text", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
