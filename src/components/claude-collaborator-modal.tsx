import { useState, useEffect } from "react";
import { Copy, ExternalLink, Loader2, Check, HelpCircle, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ClaudeCollaboratorModalProps {
  projectId: string;
  documentType: "prd" | "tasks" | "prompt";
  onSaveSuccess: (content: string) => void;
  triggerButton?: React.ReactNode;
  folderName?: string;
  foldersTree?: { name: string, files: string[] }[];
  summaryFiles?: { folderName: string, content: string }[];
}

export function ClaudeCollaboratorModal({
  projectId,
  documentType,
  onSaveSuccess,
  triggerButton,
  folderName,
  foldersTree,
  summaryFiles,
}: ClaudeCollaboratorModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [showFullPreview, setShowFullPreview] = useState(false);

  const docNames = {
    prd: "Product Requirement Document (PRD)",
    tasks: "AI Vibe Coding Tasks",
    prompt: "Super Prompt untuk AI Coding",
  };

  useEffect(() => {
    if (open) {
      generatePromptPreview();
    } else {
      setPreviewPrompt("");
      setManualContent("");
      setCopied(false);
      setShowFullPreview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentType, projectId]);

  async function generatePromptPreview() {
    setLoadingPreview(true);
    try {
      // Gather all project context
      const [project, techs, answers, canvas, docsResult, templates] = await Promise.all([
        api.projects.get(projectId),
        api.projects.getTechnologies(projectId).catch(() => []),
        api.projects.getAnswers(projectId).catch(() => []),
        api.projects.getCanvas(projectId).catch(() => null),
        api.projects.getDocuments(projectId).catch(() => []),
        api.admin.promptTemplates.getByType(documentType).catch(() => []),
      ]);

      // Normalisasi format canvasFeatures
      let canvasFeaturesFormatted = "";
      if (canvas && canvas.features) {
        if (Array.isArray(canvas.features)) {
          canvasFeaturesFormatted = canvas.features.map((f: any) => `- ${f.name} [Phase: ${f.phase}]: ${f.subs?.join(", ") || ""}`).join("\n");
        } else if (typeof canvas.features === 'object') {
          const blueprint = canvas.features as any;
          if (Array.isArray(blueprint.pages)) {
            canvasFeaturesFormatted += `Frontend Pages:\n` + blueprint.pages.map((p: any) => `- ${p.name} (${p.route}) - ${p.description || ''}`).join("\n") + "\n";
          }
          if (Array.isArray(blueprint.apiEndpoints)) {
            canvasFeaturesFormatted += `Backend API Endpoints:\n` + blueprint.apiEndpoints.map((e: any) => `- ${e.method} ${e.path} - ${e.description || ''}`).join("\n") + "\n";
          }
          if (Array.isArray(blueprint.tables)) {
            canvasFeaturesFormatted += `Database Tables:\n` + blueprint.tables.map((t: any) => `- ${t.name} (${(t.columns || []).join(', ')}) - ${t.description || ''}`).join("\n") + "\n";
          }
        }
      }

      const docs: Record<string, string> = {};
      if (Array.isArray(docsResult)) {
        docsResult.forEach((d: any) => {
          // Jangan sertakan dokumen yang tipenya sama dengan yang sedang di-generate
          // untuk mencegah ukuran prompt menjadi raksasa (misal: JSON prompt lama ikut masuk)
          if (d.type !== documentType) {
            docs[d.type] = d.content;
          }
        });
      }

      // Find active database template
      let templateInstructions = "";
      if (Array.isArray(templates) && templates.length > 0) {
        const activeTemplate = templates.find((t: any) => t.isPublished) || templates[0];
        if (activeTemplate) {
          templateInstructions = `\n<template_rules>\nSystem Instruction: ${activeTemplate.systemPrompt || ""}\n${activeTemplate.developerPrompt ? `Developer Guidelines: ${activeTemplate.developerPrompt}` : ""}\n</template_rules>\n`;
        }
      }

      // Build context and instruction using professional Claude prompting structure (XML tags)
      let promptText = `Anda adalah seorang Principal Software Architect dan AI Coding Assistant tingkat lanjut.
Tugas Anda adalah menghasilkan dokumen ${documentType.toUpperCase()} yang sangat terperinci dan profesional untuk proyek perangkat lunak baru.

<project_context>
Nama Proyek: ${project.name}
Ide Utama: ${project.idea}
Bahasa Output: ${project.language === "id" ? "Bahasa Indonesia" : "English"}
${project.description ? `Deskripsi Tambahan: ${project.description}` : ""}
</project_context>

<tech_stack>
${techs.map((t: any) => `- ${t.category}: ${t.technologyName}`).join("\n")}
</tech_stack>

<interview_context>
${answers.map((a: any) => `T: ${a.question ?? a.questionId}\nJ: ${JSON.stringify(a.answer)}`).join("\n\n")}
</interview_context>

<features_and_specifications>
${canvasFeaturesFormatted}
</features_and_specifications>

${Object.keys(docs).length > 0 ? `<existing_documents>\n${Object.entries(docs).map(([key, content]) => `[Dokumen ${key.toUpperCase()}]\n${String(content)}`).join("\n\n")}\n</existing_documents>` : ""}
${templateInstructions}

<system_guidelines>
Sebagai AI Architect profesional, pastikan Anda mematuhi standar ketat berikut:
1. Berpikir Kritis & Mandiri: Selaraskan spesifikasi fitur dengan ide utama proyek. Rancang skema database, arsitektur endpoint API, dan alur interaksi frontend yang paling efisien, skalabel, dan aman.
2. Bertindak Komprehensif (No Lazy Coding): JANGAN PERNAH menggunakan placeholder (seperti "// TODO: lengkapi nanti", "// implementasi tambahan di sini..."). Tulis seluruh kerangka logika, penanganan error, dan detail implementasi secara utuh dan eksplisit.
3. Desain API & Endpoint: Setiap endpoint API harus memiliki format JSON Request Body dan Response Body (Success & Error status) yang tertulis secara literal beserta tipe datanya (string, integer, boolean, uuid). Cantumkan juga middleware yang melindungi setiap endpoint tersebut.
4. Desain Database Relasional: Gunakan skema database DDL SQL murni PostgreSQL (kecuali instruksi menyebut sebaliknya). Wajib menggunakan primary key berbasis UUID, foreign key dengan ON DELETE CASCADE / SET NULL, tipe data waktu presisi (created_at TIMESTAMPTZ DEFAULT NOW()), serta sertakan indeks (CREATE INDEX) pada kolom yang sering difilter/foreign key.
5. Persyaratan Frontend (UI/UX): Jabarkan komponen halaman secara mendetail (visual state seperti loading skeleton, form validation, state kosong) serta interaksi mikro yang meningkatkan kualitas user experience (UX).
6. Presisi Format Output: Output respons AI Anda harus persis mematuhi instruksi spesifik di dalam bagian <task_instruction> di bawah ini.
</system_guidelines>
`;

      if (documentType === "prd") {
        promptText += `
<task_instruction>
Buatlah Product Requirement Document (PRD) yang komprehensif berdasarkan <project_context> dan <features_and_specifications>.

Struktur PRD yang Diharapkan (gunakan format Markdown):
# Product Requirement Document (PRD) - ${project.name}

## 1. Executive Summary
## 2. Problem Statement & Solution
## 3. Goals & Metrics (KPI)
## 4. User Personas & User Journey
## 5. Functional Requirements
(Detailkan tiap fitur: Deskripsi, User Stories, Acceptance Criteria, Data Flow, Prioritas)
## 6. Technical Architecture & Database Data Model
(Sertakan DDL SQL PostgreSQL dengan detail relasi dan indeks sesuai panduan)
## 7. API Specifications
(Sertakan struktur method, path, request/response schema, middleware secara rinci)
## 8. Non-Functional Requirements
## 9. Business Rules & Constraints
## 10. Open Questions

Output harus langsung berupa format Markdown murni yang sangat panjang dan detail (bisa mencapai 3000-5000 kata), tanpa narasi pembuka/penutup.
</task_instruction>`;
      } else if (documentType === "tasks") {
        promptText += `
<task_instruction>
Buatlah daftar implementasi tugas (Checklist Tasks) yang berurutan secara logis kronologis untuk memandu AI Coding Agent (seperti Cursor, Windsurf, Trae, dsb).
Pecah fitur proyek ini menjadi setidaknya 30 - 45 tugas instruktif kecil yang spesifik dan mendalam agar siap dieksekusi oleh AI Agent secara mandiri.
Urutan logis yang disarankan: Setup Project -> Database Schema & Migrasi -> Backend API & Middleware -> UI Components -> Frontend Pages -> State & Integrasi API -> Testing.

PENTING: Output Anda HARUS HANYA berupa JSON array murni tanpa pembungkus blok kode Markdown (\`\`\`json).

Format JSON yang Diharapkan:
[
  {
    "title": "Nama tugas spesifik (contoh: Setup database table users dengan UUID primary key)",
    "category": "setup" | "database" | "backend" | "frontend" | "infra" | "testing",
    "priority": "high" | "medium" | "low",
    "description": "Instruksi mendalam tentang logika yang harus dibuat, nama file yang harus diedit/dibuat, penanganan error, dan cara verifikasinya.",
    "isAiGenerated": true
  }
]
</task_instruction>`;
      } else if (documentType === "prompt") {
        const summariesContext = summaryFiles?.length
          ? `\n\nRINGKASAN FOLDER LAIN:\nBerikut adalah ringkasan dari folder yang sudah dikerjakan sebelumnya:\n${summaryFiles.map(s => `[Folder: ${s.folderName}]\n${s.content}`).join("\n\n")}\n\n`
          : "";

        if (folderName) {
          const foldersContext = foldersTree?.length 
            ? `\nKonteks Workspace Saat Ini:\nBerikut adalah daftar folder dan file yang SUDAH ADA di proyek ini:\n${foldersTree.map(f => `- Folder: ${f.name}\n${f.files.length > 0 ? f.files.map(file => `  - ${file}`).join("\n") : "  (kosong)"}`).join("\n")}${summariesContext}\nKarena Anda HANYA fokus pada folder "${folderName}", JANGAN membuat ulang file atau instruksi yang sudah ada di folder lain (seperti yang terlihat pada ringkasan di atas). Hindari mencampuri ranah folder lain.`
            : "";

          promptText += `
<task_instruction>
Anda ditugaskan untuk membuat file instruksi AI (untuk agen seperti Cursor/Copilot) KHUSUS untuk folder "${folderName}".${foldersContext}

PENTING:
1. Anda BEBAS memecah instruksi menjadi beberapa file (lebih dari 1 file) di dalam folder "${folderName}" jika memang dibutuhkan agar lebih rapi dan terstruktur (misal: memisahkan instruksi routing, instruksi schema, dll).
2. FOKUS MURNI pada fungsionalitas folder "${folderName}".
3. JANGAN PERNAH membuat file bernama "README.md" (karena ini murni prompt/instruksi untuk agen AI, bukan dokumentasi GitHub).
4. Setiap nama file HARUS diawali dengan angka urutan (contoh: 01_..., 02_..., 03_...). Urutan angka ini selalu dimulai dari 01_ untuk setiap folder baru.
5. WAJIB BUAT FILE TERAKHIR: File paling akhir yang Anda hasilkan HARUS bernama "99_ringkasan.md" (atau angka terakhir urutan Anda). File ini WAJIB berisi ringkasan teknis dari seluruh perintah/prompt yang baru saja Anda buat di folder ini.
6. Output Anda HARUS HANYA berupa JSON object murni tanpa pembungkus blok kode Markdown (\`\`\`json). Key adalah path file (wajib diawali dengan "${folderName}/"), dan value adalah isi konten teks/Markdown-nya.

Format JSON yang Diharapkan:
{
  "${folderName}/01_instruksi_utama.md": "# Modul: ${folderName}\\n\\n...",
  "${folderName}/02_struktur_tambahan.md": "...",
  "${folderName}/99_ringkasan.md": "Ringkasan: Pada modul ini, saya telah menginstruksikan pembuatan..."
}

Pastikan teks di dalam JSON di-escape dengan benar (" dan \\n) agar menjadi JSON string yang valid dan dapat di-parse dengan aman.
</task_instruction>`;
        } else {
          promptText += `
<task_instruction>
Hasilkan struktur file prompt modular untuk menginisialisasi KESELURUHAN AI workspace (untuk semua folder utama) berdasarkan fitur proyek ini.

PENTING:
1. Anda BEBAS memecah instruksi menjadi beberapa file di dalam masing-masing folder agar rapi dan terstruktur.
2. JANGAN menduplikasi file umum antar folder (contoh: buat .cursorrules cukup satu kali di folder Setup saja).
3. JANGAN PERNAH membuat file bernama "README.md" (karena ini murni prompt/instruksi untuk agen AI, bukan dokumentasi GitHub).
4. Setiap nama file HARUS diawali dengan angka urutan (contoh: 01_..., 02_..., 03_...). Urutan angka ini selalu me-reset/dimulai dari 01_ untuk setiap foldernya.
5. WAJIB BUAT FILE TERAKHIR PER FOLDER: File paling akhir di setiap folder HARUS bernama "99_ringkasan.md". File ini berisi ringkasan teknis dari seluruh perintah/prompt di folder tersebut.
6. Output Anda HARUS HANYA berupa JSON object murni tanpa pembungkus blok kode Markdown (\`\`\`json). Key adalah path file lengkap dengan foldernya, dan value adalah isi konten teks/Markdown-nya.

Format JSON yang Diharapkan:
{
  "01_Project_Setup/01_setup_utama.md": "# Project Setup\\n\\nLangkah-langkah setup dengan dependensi...",
  "01_Project_Setup/99_ringkasan.md": "Ringkasan setup...",
  "02_Database_Migration/01_skema.md": "# Database Migration\\n\\nInstruksi database...",
  "02_Database_Migration/99_ringkasan.md": "Ringkasan database..."
}

Pastikan teks di dalam JSON di-escape dengan benar (" dan \\n) agar menjadi JSON string yang valid dan dapat di-parse dengan aman.
</task_instruction>`;
        }
      }

      setPreviewPrompt(promptText);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyusun prompt konteks.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCopyPrompt() {
    if (!previewPrompt) return;
    setLoading(true);
    try {
      await navigator.clipboard.writeText(previewPrompt);
      setCopied(true);
      toast.success("Prompt berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyalin prompt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveManual() {
    if (!manualContent.trim()) {
      toast.error("Silakan tempelkan konten dari Claude terlebih dahulu.");
      return;
    }

    setLoading(true);
    let contentToSave = manualContent.trim();

    if (documentType === "prompt" || documentType === "tasks") {
      // Robust JSON extraction (removes \`\`\`json ... \`\`\` wrapper if present)
      const cleaned = contentToSave.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        
        if (documentType === "prompt") {
          // Ensure all required fields exist
          const requiredKeys = ["frontend", "backend", "database", "tasks"];
          const missing = requiredKeys.filter(k => !parsed[k]);
          // This check might need to be adapted based on the new JSON structure 
          // if we moved away from those exact 4 keys. For now, keep it soft.
        }
        
        // Save validated clean JSON
        contentToSave = JSON.stringify(parsed, null, 2);
      } catch (err) {
        console.log("Pasted content is not valid JSON, saving directly as raw text/markdown.");
      }
    }

    try {
      await api.projects.saveDocumentManual(projectId, documentType, {
        content: contentToSave,
      });
      toast.success("Dokumen berhasil disimpan!");
      onSaveSuccess(contentToSave);
      setOpen(false);
      setManualContent("");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan dokumen secara manual.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10">
            <HelpCircle size={15} /> Bantuan Claude.ai
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl text-foreground max-h-[85vh] overflow-hidden flex flex-col gap-4 p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>Claude.ai / ChatGPT Collaborator</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gunakan prompt khusus ini di Claude.ai untuk menghasilkan dokumen secara profesional.
          </DialogDescription>
        </DialogHeader>

        {showFullPreview ? (
          <div className="flex flex-col flex-1 h-[65vh] space-y-3 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-foreground">Preview Prompt Lengkap</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowFullPreview(false)}>
                Kembali
              </Button>
            </div>
            <Textarea 
              readOnly 
              value={previewPrompt} 
              className="flex-1 min-h-[40vh] max-h-full overflow-y-auto text-xs font-mono bg-background/50 p-3 leading-relaxed resize-none focus-visible:ring-0"
            />
            <Button
              onClick={handleCopyPrompt}
              disabled={loading}
              className="w-full gap-2 text-primary-foreground text-xs mt-2"
              variant={copied ? "secondary" : "default"}
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : copied ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} />
              )}
              {copied ? "Prompt Tersalin!" : "Salin Prompt Claude"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Side-by-side Grid for Steps 1 & 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">1. Salin Konteks Proyek</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal mb-2">
                      Merangkum seluruh ide, stack teknologi, canvas fitur, dan jawaban wawancara untuk prompt Claude.
                    </p>
                    
                    {/* Preview Box */}
                    {loadingPreview ? (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground my-4">
                        <Loader2 size={12} className="animate-spin" /> Menyusun prompt...
                      </div>
                    ) : previewPrompt ? (
                      <div className="mb-2 relative">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Preview Prompt:</label>
                          <button 
                            onClick={() => setShowFullPreview(true)}
                            className="text-[10px] flex items-center gap-1 text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            <Expand size={10} /> Perbesar
                          </button>
                        </div>
                        <Textarea 
                          readOnly 
                          value={previewPrompt} 
                          className="h-28 text-[10px] font-mono bg-background/50 resize-none p-2 leading-relaxed"
                        />
                      </div>
                    ) : null}
                  </div>
                  
                  <Button
                    onClick={handleCopyPrompt}
                    disabled={loading || !previewPrompt}
                    className="w-full gap-2 text-primary-foreground text-xs mt-auto h-8.5"
                    variant={copied ? "secondary" : "default"}
                  >
                    {loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : copied ? (
                      <Check size={13} className="text-emerald-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copied ? "Prompt Tersalin!" : "Salin Prompt Claude"}
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">2. Jalankan di Claude.ai</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Buka website Claude.ai, tempel prompt yang baru disalin, lalu tunggu AI menuliskan dokumen.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-foreground text-xs mt-3 h-8.5"
                    onClick={() => window.open("https://claude.ai", "_blank")}
                  >
                    <ExternalLink size={13} /> Buka Claude.ai
                  </Button>
                </div>
              </div>

              {/* Textarea for Step 3 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">3. Tempel Hasil ke Sini</label>
                <Textarea
                  placeholder={`Tempelkan hasil markdown/JSON yang digenerate oleh Claude ke sini...`}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="h-28 font-sans text-xs leading-relaxed text-foreground bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading} className="text-muted-foreground hover:text-foreground text-xs">
                Batal
              </Button>
              <Button size="sm" onClick={handleSaveManual} disabled={loading || !manualContent.trim()} className="text-primary-foreground text-xs">
                {loading && <Loader2 size={13} className="animate-spin mr-1" />}
                Simpan Dokumen & Lanjutkan
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
