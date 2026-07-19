

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GripVertical, Loader2, Save } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/rotation")({
  component: RotationPage,
});

const STRATEGIES = [
  { key: "round_robin", label: "Round Robin", desc: "Bergantian secara berurutan" },
  { key: "priority", label: "Priority", desc: "Pilih berdasarkan prioritas tertinggi" },
  { key: "random", label: "Random", desc: "Pilih secara acak" },
  { key: "fallback", label: "Fallback", desc: "Gunakan cadangan jika utama gagal" },
];

interface RotationConfig {
  strategy: string;
  autoRotation: boolean;
  autoRetry: boolean;
  maxRetries: number;
  timeoutSeconds: number;
  cooldownMinutes: number;
}

interface Provider {
  id: string;
  displayName: string;
  priority: number;
  isActive: boolean;
}

function RotationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [config, setConfig] = useState<RotationConfig>({
    strategy: "round_robin",
    autoRotation: true,
    autoRetry: true,
    maxRetries: 3,
    timeoutSeconds: 30,
    cooldownMinutes: 5,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [configRes, providersRes] = await Promise.all([
          api.admin.rotation.get(),
          api.admin.providers.list(),
        ]);
        if (configRes) setConfig(configRes);
        setProviders(providersRes || []);
      } catch {
        toast.error("Gagal memuat konfigurasi rotasi");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.admin.rotation.update(config);
      toast.success("Konfigurasi rotasi berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(key: keyof RotationConfig, val: any) {
    setConfig(prev => ({ ...prev, [key]: val }));
  }

  return (
    <AdminPage
      title="Rotasi AI"
      subtitle="Atur strategi pergantian API Key dan provider"
      actions={
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Simpan Konfigurasi
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
            <h3 className="mb-4 text-base font-semibold text-white">Strategi Rotasi</h3>
            <div className="space-y-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleFieldChange("strategy", s.key)}
                  className={cn(
                    "flex w-full items-start justify-between rounded-lg border p-4 text-left transition cursor-pointer",
                    config.strategy === s.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-white">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      config.strategy === s.key ? "border-primary bg-primary" : "border-border",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="card-premium p-6">
            <h3 className="mb-4 text-base font-semibold text-white">Pengaturan Lanjutan</h3>
            <div className="space-y-4">
              <Row label="Auto Rotation" desc="Ganti otomatis saat quota habis">
                <Switch
                  checked={config.autoRotation}
                  onCheckedChange={(checked) => handleFieldChange("autoRotation", checked)}
                />
              </Row>
              <Row label="Retry Otomatis" desc="Coba lagi jika request gagal">
                <Switch
                  checked={config.autoRetry}
                  onCheckedChange={(checked) => handleFieldChange("autoRetry", checked)}
                />
              </Row>
              <Row label="Timeout (detik)">
                <Input
                  type="number"
                  value={config.timeoutSeconds}
                  onChange={(e) => handleFieldChange("timeoutSeconds", Number(e.target.value))}
                  className="w-24 text-white"
                />
              </Row>
              <Row label="Cooldown (menit)">
                <Input
                  type="number"
                  value={config.cooldownMinutes}
                  onChange={(e) => handleFieldChange("cooldownMinutes", Number(e.target.value))}
                  className="w-24 text-white"
                />
              </Row>
              <Row label="Maximum Retry">
                <Input
                  type="number"
                  value={config.maxRetries}
                  onChange={(e) => handleFieldChange("maxRetries", Number(e.target.value))}
                  className="w-24 text-white"
                />
              </Row>
            </div>
          </div>

          <div className="card-premium p-6 lg:col-span-2">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Urutan Prioritas Provider</h3>
              <p className="text-xs text-muted-foreground">Diurutkan berdasarkan prioritas yang dikonfigurasikan di halaman AI Provider</p>
            </div>
            <div className="space-y-2">
              {providers.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5"
                >
                  <GripVertical size={16} className="text-muted-foreground" />
                  <span className="w-6 text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-white">{p.displayName}</span>
                  <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <div>
        <Label className="text-sm text-white">{label}</Label>
        {desc && <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>}
      </div>
      {children}
    </div>
  );
}
