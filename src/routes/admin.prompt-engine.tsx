

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, RefreshCw, HelpCircle, Wand2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/prompt-engine")({
  component: PromptEnginePage,
});

const GENERATE_TYPES = [
  { 
    key: "canvas", 
    label: "Lean Canvas",
    description: "Menganalisis ide produk secara terstruktur berdasarkan Customer Segments, Value Propositions, Revenue Streams, dll."
  },
  { 
    key: "prd", 
    label: "Dokumen PRD",
    description: "Product Requirement Document (PRD) mendikte fitur aplikasi, alur kerja user, dan kriteria sukses produk."
  },
  { 
    key: "architecture", 
    label: "Arsitektur Sistem",
    description: "Mengatur bagaimana AI merancang arsitektur sistem, pembagian modul, deployment hosting, caching, dan integrasi."
  },
  { 
    key: "database", 
    label: "Skema Database",
    description: "Memandu AI untuk mendesain relasi tabel database, tipe kolom, dan pembuatan query DDL SQL."
  },
  { 
    key: "api", 
    label: "Spesifikasi API",
    description: "Mengatur perancangan detail endpoint RESTful API, request/response schema, dan status code."
  },
  { 
    key: "tasks", 
    label: "Daftar Tugas (Tasks)",
    description: "Menjabarkan alur kerja project menjadi task breakdown teknis yang siap dijalankan oleh AI coding agent."
  },
  { 
    key: "prompt", 
    label: "AI Developer Prompt",
    description: "Memadukan seluruh rancangan project menjadi satu modular prompt system untuk menginisialisasi workspace developer."
  },
];

interface PromptTemplate {
  id: string;
  generateType: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number | null;
  maxTokens: number | null;
  topP: number | null;
  model: string | null;
  isActive: boolean;
  version: number;
}

function PromptEnginePage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("canvas");

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await api.admin.promptTemplates.list();
      setTemplates(res || []);
    } catch {
      toast.error("Gagal memuat data prompt template");
    } finally {
      setLoading(false);
    }
  }

  const [optimizingId, setOptimizingId] = useState<string | null>(null);

  async function handleOptimize(id: string, promptText: string, generateType: string, role: "system" | "user") {
    const instructions = window.prompt(
      "Instruksi tambahan untuk AI (opsional) - contoh: 'buat instruksi detail dengan standar penulisan yang modular':"
    );
    if (instructions === null) return; // cancelled

    setOptimizingId(id);
    const toastId = toast.loading("AI sedang menulis ulang dan mengoptimalkan prompt Anda...");
    try {
      const res = await api.admin.promptTemplates.optimize({
        promptText,
        instructions,
        generateType,
        role,
      });

      if (res && res.optimizedText) {
        handleFieldChange(id, role === "system" ? "systemPrompt" : "userPrompt", res.optimizedText);
        toast.success("Prompt berhasil dioptimalkan! Klik 'Simpan Prompt' untuk memperbarui database.", { id: toastId });
      } else {
        toast.error("Gagal mendapatkan prompt yang dioptimalkan", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengoptimalkan prompt dengan AI", { id: toastId });
    } finally {
      setOptimizingId(null);
    }
  }

  function handleFieldChange(id: string, field: keyof PromptTemplate, value: any) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  async function handleSave(t: PromptTemplate) {
    setSaving(true);
    try {
      const payload = {
        name: t.name,
        systemPrompt: t.systemPrompt,
        userPrompt: t.userPrompt,
        temperature: t.temperature ? Number(t.temperature) : null,
        maxTokens: t.maxTokens ? Number(t.maxTokens) : null,
        topP: t.topP ? Number(t.topP) : null,
        model: t.model || null,
        isActive: t.isActive,
      };

      await api.admin.promptTemplates.update(t.id, payload);
      toast.success(`Template ${t.name} berhasil disimpan`);
      loadTemplates();
    } catch {
      toast.error("Gagal menyimpan prompt template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage
      title="Prompt Engine"
      subtitle="Kelola template prompt untuk setiap tahap generasi"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap gap-1 bg-transparent p-0">
            {GENERATE_TYPES.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GENERATE_TYPES.map((t) => {
            const temp = templates.find((item) => item.generateType === t.key);
            if (!temp) return null;

            return (
              <TabsContent key={t.key} value={t.key}>
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-4">
                    <div className="card-premium p-4 bg-primary/5 border border-primary/20 flex gap-3 items-start">
                      <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <span className="font-semibold text-white block mb-0.5">Fungsi Prompting {t.label}</span>
                        <span className="text-zinc-300 text-xs leading-relaxed">{t.description}</span>
                      </div>
                    </div>

                    <div className="card-premium overflow-hidden">
                      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
                        <span>System Prompt ({t.key}.system)</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1"
                            onClick={() => handleOptimize(temp.id, temp.systemPrompt, t.key, "system")}
                            disabled={optimizingId === temp.id}
                          >
                            <Wand2 size={10} className={optimizingId === temp.id ? "animate-spin" : ""} />
                            {optimizingId === temp.id ? "Mengoptimalkan..." : "Optimalkan AI"}
                          </Button>
                          <Badge variant="outline" className="text-[10px]">v{temp.version}</Badge>
                        </div>
                      </div>
                      <Textarea
                        value={temp.systemPrompt}
                        onChange={(e) => handleFieldChange(temp.id, "systemPrompt", e.target.value)}
                        className="min-h-[220px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                      />
                    </div>

                    <div className="card-premium overflow-hidden">
                      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
                        <span>User Prompt ({t.key}.user)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1"
                          onClick={() => handleOptimize(temp.id, temp.userPrompt, t.key, "user")}
                          disabled={optimizingId === temp.id}
                        >
                          <Wand2 size={10} className={optimizingId === temp.id ? "animate-spin" : ""} />
                          {optimizingId === temp.id ? "Mengoptimalkan..." : "Optimalkan AI"}
                        </Button>
                      </div>
                      <Textarea
                        value={temp.userPrompt}
                        onChange={(e) => handleFieldChange(temp.id, "userPrompt", e.target.value)}
                        className="min-h-[220px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={() => handleSave(temp)}
                      disabled={saving}
                      className="w-full"
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Simpan Prompt
                        </>
                      )}
                    </Button>

                    <div className="card-premium p-4 text-xs text-muted-foreground space-y-1 bg-muted/10">
                      <div className="font-semibold text-foreground/80 mb-1">Panduan Variabel:</div>
                      <div>• <code>{"{{context}}"}</code>: Konteks komprehensif project.</div>
                      <div>• <code>{"{{language}}"}</code>: Target output bahasa (ID/EN).</div>
                      <div>• <code>{"{{ai_target}}"}</code>: Editor IDE AI Target.</div>
                      <div>• <code>{"{{existing_prd}}"}</code>: Isi PRD jika ada.</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
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
