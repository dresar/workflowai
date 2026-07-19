

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, RefreshCw } from "lucide-react";
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
  { key: "canvas", label: "Generate Canvas" },
  { key: "prd", label: "Generate PRD" },
  { key: "tasks", label: "Generate Tasks" },
  { key: "prompt", label: "Generate AI Prompt" },
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
                    <div className="card-premium overflow-hidden">
                      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
                        <span>System Prompt ({t.key}.system)</span>
                        <Badge variant="outline" className="text-[10px]">v{temp.version}</Badge>
                      </div>
                      <Textarea
                        value={temp.systemPrompt}
                        onChange={(e) => handleFieldChange(temp.id, "systemPrompt", e.target.value)}
                        className="min-h-[220px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                      />
                    </div>

                    <div className="card-premium overflow-hidden">
                      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                        User Prompt ({t.key}.user)
                      </div>
                      <Textarea
                        value={temp.userPrompt}
                        onChange={(e) => handleFieldChange(temp.id, "userPrompt", e.target.value)}
                        className="min-h-[220px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="card-premium p-5">
                      <div className="mb-4 text-sm font-semibold text-white">Konfigurasi Model</div>
                      <div className="space-y-3 text-sm">
                        <Field label="Model">
                          <Input
                            value={temp.model || ""}
                            onChange={(e) => handleFieldChange(temp.id, "model", e.target.value)}
                            placeholder="Contoh: gemini-2.0-flash"
                          />
                        </Field>
                        <Field label="Temperature">
                          <Input
                            type="number"
                            step="0.1"
                            value={temp.temperature ?? ""}
                            onChange={(e) => handleFieldChange(temp.id, "temperature", e.target.value)}
                            placeholder="0.7"
                          />
                        </Field>
                        <Field label="Max Tokens">
                          <Input
                            type="number"
                            value={temp.maxTokens ?? ""}
                            onChange={(e) => handleFieldChange(temp.id, "maxTokens", e.target.value)}
                            placeholder="4096"
                          />
                        </Field>
                        <Field label="Top P">
                          <Input
                            type="number"
                            step="0.05"
                            value={temp.topP ?? ""}
                            onChange={(e) => handleFieldChange(temp.id, "topP", e.target.value)}
                            placeholder="0.9"
                          />
                        </Field>
                      </div>
                      <Button
                        onClick={() => handleSave(temp)}
                        disabled={saving}
                        className="mt-5 w-full"
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
                    </div>

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
