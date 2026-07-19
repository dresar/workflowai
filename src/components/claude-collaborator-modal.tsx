import { useState } from "react";
import { Copy, ExternalLink, Loader2, Check, HelpCircle } from "lucide-react";
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
}

export function ClaudeCollaboratorModal({
  projectId,
  documentType,
  onSaveSuccess,
  triggerButton,
}: ClaudeCollaboratorModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualContent, setManualContent] = useState("");

  const docNames = {
    prd: "Product Requirement Document (PRD)",
    tasks: "AI Vibe Coding Tasks",
    prompt: "Super Prompt untuk AI Coding",
  };

  async function handleCopyPrompt() {
    setLoading(true);
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

      // Normalisasi format canvasFeatures agar kompatibel dengan data array maupun object blueprint
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
          docs[d.type] = d.content;
        });
      }

      // Find active database template
      let templateInstructions = "";
      if (Array.isArray(templates) && templates.length > 0) {
        const activeTemplate = templates.find((t: any) => t.isPublished) || templates[0];
        if (activeTemplate) {
          templateInstructions = `\n--- TEMPLATE RULES & SYSTEM PROMPT ---\nSystem Instruction: ${activeTemplate.systemPrompt || ""}\n${activeTemplate.developerPrompt ? `Developer Guidelines: ${activeTemplate.developerPrompt}` : ""}\n`;
        }
      }

      // Build context and instruction
      let promptText = `You are a Senior AI Developer and Technical Collaborator.
We need to generate a ${documentType.toUpperCase()} document for our project.

PROJECT DETAILS:
- Name: ${project.name}
- Idea: ${project.idea}
- Language: ${project.language === "id" ? "Indonesian" : "English"}
${project.description ? `- Description: ${project.description}` : ""}

TECHNOLOGY STACK:
${techs.map((t: any) => `- ${t.category}: ${t.technologyName}`).join("\n")}

INTERVIEW ANSWERS:
${answers.map((a: any) => `Q: ${a.question ?? a.questionId}\nA: ${JSON.stringify(a.answer)}`).join("\n\n")}

FEATURE CANVAS / SPECIFICATIONS:
${canvasFeaturesFormatted}

EXISTING DOCUMENTS:
${Object.entries(docs)
  .map(([key, content]) => `--- EXISTING ${key.toUpperCase()} ---\n${String(content)}`)
  .join("\n\n")}
${templateInstructions}
`;

      if (documentType === "prd") {
        promptText += `
=== INSTRUKSI GENERATE PRODUCT REQUIREMENT DOCUMENT (PRD) ===
Peran Anda: Lead Product Manager dan Principal Architect.
Tugas Anda adalah menulis dokumen Product Requirement Document (PRD) yang sangat detail, profesional, dan komprehensif untuk proyek "${project.name}" (Ide: "${project.idea}").

STACK TEKNOLOGI YANG DIGUNAKAN:
${techs.map((t: any) => `- ${t.category}: ${t.technologyName}`).join("\n")}

INFORMASI CANVAS FITUR DAN SPESIFIKASI:
${canvasFeaturesFormatted}

ATURAN DAN ATURAN TEKNIS DOKUMEN:
1. BAHASA: Tulis seluruh dokumen dalam ${project.language === "id" ? "Bahasa Indonesia yang baik, formal, dan profesional" : "English"}.
2. FORMAT OUTPUT: Gunakan format Markdown standar.
   - Gunakan heading H1 (#) hanya untuk judul utama.
   - Gunakan heading H2 (##) untuk bab utama, dan H3 (###) untuk sub-bab.
   - Untuk bullet point, gunakan karakter minus "- " (minus + spasi). JANGAN pernah menggunakan asterisk "*" sebagai bullet marker.
   - Untuk teks tebal, gunakan "**teks**".
   - JANGAN menulis tanda kurung atau simbol aneh yang merusak rendering markdown.
3. KEDALAMAN KONTEN (PENTING! JANGAN ADA PLACEHOLDER):
   - Dokumen ini harus sangat panjang (minimal 3500 - 5000 kata) dan mencakup seluruh aspek secara lengkap.
   - Tulis secara eksplisit setiap kode SQL DDL, daftar file, struktur endpoint, dan komponen UI. Jangan tulis comment "// implementasi lainnya di sini...". AI pembuat code harus bisa membuat aplikasi ini langsung dari dokumen Anda tanpa bertanya lagi.

STRUKTUR WAJIB DOKUMEN PRD:
# Product Requirement Document (PRD) - ${project.name}

## 1. Ringkasan Eksekutif (Executive Summary)
- Latar belakang proyek, visi, tujuan bisnis, dan solusi yang ditawarkan.

## 2. Deskripsi Masalah & Solusi (Problem Statement & Solution)
- Detail masalah pengguna, target audiens, dan bagaimana sistem menyelesaikan masalah tersebut.

## 3. Goals & Metrics (KPI Keberhasilan)
- Indikator kesuksesan teknis dan bisnis secara kuantitatif.

## 4. Analisis User Personas & User Journey
- Profil user (contoh: Admin, Pengguna Biasa, Penjual) dan peta perjalanan pengguna (User Journey Map) dari awal registrasi hingga menggunakan fitur utama.

## 5. Spesifikasi Fitur Detail (Functional Requirements)
Untuk SETIAP fitur yang ada di Canvas Fitur/Spesifikasi di atas, buat sub-bagian detail seperti ini:
### 5.x [Nama Fitur]
- **Deskripsi:** Detail fungsionalitas fitur.
- **User Stories:** Format "Sebagai [A], saya ingin [B] sehingga [C]".
- **Acceptance Criteria:** Kriteria penerimaan teknis (minimal 4 poin detail).
- **Alur Data & Logika:** Penjelasan langkah demi langkah bagaimana data diproses.
- **Prioritas:** High/Medium/Low.

## 6. Arsitektur Teknis & Struktur Database (Data Model)
- **Desain Database:** Tulis kode SQL DDL lengkap menggunakan PostgreSQL untuk seluruh modul aplikasi. Gunakan tipe data UUID untuk primary key, foreign key dengan relasi ON DELETE CASCADE, tipe data TIMESTAMPTZ untuk tanggal, dan sertakan indeks (CREATE INDEX) untuk optimasi query.
- **Struktur Folder Aplikasi:** Gambarkan tree struktur folder proyek (frontend dan backend).

## 7. Desain API (API Specifications)
- Tulis daftar lengkap endpoint API (Method, Path, Request Body JSON schema, Response JSON schema untuk sukses dan error, serta middleware auth yang dibutuhkan).

## 8. Persyaratan Non-Fungsional (Non-Functional Requirements)
- Keamanan (keamanan JWT token, password hashing, SQL injection prevention), Performansi (kecepatan respon < 200ms, caching), Skalabilitas, dan Ketersediaan.

## 9. Aturan Bisnis & Batasan Sistem (Business Rules & Constraints)
- Batasan input, aturan validasi form, hak akses (RBAC - Role-Based Access Control) detail untuk masing-masing user persona.

## 10. Open Questions (Pertanyaan Terbuka)
- Hal-hal yang memerlukan keputusan bisnis lebih lanjut.

Output hanya dokumen PRD dalam format Markdown lengkap tanpa pembuka/penutup seperti "Ini dokumen PRD Anda:". Tulis langsung mulai dari judul "# Product Requirement Document (PRD)".`;
      } else if (documentType === "tasks") {
        promptText += `
=== INSTRUKSI GENERATE VIBE CODING TASKS ===
Peran Anda: Lead Engineering Manager.
Tugas Anda adalah memecah rancangan proyek "${project.name}" (Ide: "${project.idea}") menjadi daftar Checklist Task yang sangat terstruktur, berurutan secara kronologis, dan siap dieksekusi oleh AI Coding Agent (seperti Antigravity, Cursor, Trae, atau Windsurf).

STACK TEKNOLOGI YANG DIGUNAKAN:
${techs.map((t: any) => `- ${t.category}: ${t.technologyName}`).join("\n")}

INFORMASI CANVAS FITUR DAN SPESIFIKASI:
${canvasFeaturesFormatted}

ATURAN BREAKDOWN TASK (PENTING):
1. JANGAN PERNAH menyertakan estimasi waktu (seperti jam, hari, story points, atau sprint). AI coding agent tidak butuh estimasi waktu!
2. Urutan harus logis secara kronologis: Setup & Init -> Skema Database & Migrasi -> Backend API & Middleware -> UI Components -> Frontend Pages -> Integrasi API & State Management -> Testing & DevOps.
3. Tulis setidaknya 30 - 45 task spesifik dan mendalam. Setiap task harus berupa instruksi mandiri yang jelas file apa yang dibuat/diedit, apa logika kodenya, dan bagaimana memverifikasinya.
4. BAHASA: Tulis dalam ${project.language === "id" ? "Bahasa Indonesia yang jelas dan instruktif" : "English"}.

FORMAT OUTPUT (PILIH SALAH SATU FORMAT BERIKUT):
Format 1: JSON Array (Sangat Direkomendasikan)
Tulis HANYA sebuah valid JSON array of objects tanpa pembungkus markdown (tanpa \`\`\`json). Contoh format:
[
  {
    "title": "Setup database table users dengan UUID primary key",
    "category": "database",
    "priority": "high",
    "description": "Buat file src/db/schema/users.ts dengan kolom id UUID defaultRandom, email varchar, password text, role enum, createdAt timestamptz.",
    "isAiGenerated": true
  },
  ...
]

Format 2: Markdown List (Alternatif)
Jika Anda menulis dalam Markdown, gunakan format list bernomor dengan label kategori di awal judul task. Contoh format:
1. [database] Setup database table users dengan UUID primary key - Buat file src/db/schema/users.ts dengan kolom id UUID, email, password, role, createdAt.
2. [backend] Implementasi endpoint POST /api/v1/auth/register - Buat controller register di src/controllers/auth.controller.ts dan validasi input menggunakan Zod.
3. [frontend] Buat reusable component Button dengan variant primary, secondary, dan size - Buat file src/components/ui/button.tsx.

Kategori yang valid: "setup", "database", "backend", "frontend", "infra", "testing".

Output hanya list task dalam format JSON array (atau Markdown list) tanpa ada teks pembuka atau penutup lainnya.`;
      } else if (documentType === "prompt") {
        promptText += `
=== INSTRUKSI GENERATE 10 MODUL AI CODING PROMPTS ===
Peran Anda: Principal Prompt Engineer dan Tech Lead.
Tugas Anda adalah menghasilkan payload JSON lengkap berisi 10 prompt terstruktur dan modular untuk membangun aplikasi "${project.name}" (Ide: "${project.idea}").

STACK TEKNOLOGI YANG DIGUNAKAN:
${techs.map((t: any) => `- ${t.category}: ${t.technologyName}`).join("\n")}

INFORMASI CANVAS FITUR:
${canvasFeaturesFormatted}

ATURAN OUTPUT JSON (WAJIB DIPATUHI):
1. Anda HARUS mengembalikan HANYA sebuah valid JSON object dengan kunci (keys) persis seperti di bawah ini. JANGAN menulis teks percakapan apa pun di luar JSON!
2. Setiap nilai (value) di dalam JSON harus berupa prompt markdown lengkap, detail, instruktif, dan siap disalin per modul ke AI coding agent.
3. Pastikan semua tanda kutip ganda di dalam teks di-escape dengan benar (\\") dan baris baru ditulis sebagai \\n agar JSON valid dan bisa di-parse oleh JSON.parse().

JSON SCHEMA YANG WAJIB DIGUNAKAN:
{
  "setup": "Markdown prompt untuk modul 01_Project_Setup.md. Instruksikan pembuatan folder tree, package.json, tsconfig, dan instalasi dependencies.",
  "database": "Markdown prompt untuk modul 02_Database_Migration.md. Berikan instruksi skema tabel PostgreSQL detail dengan kolom, indeks, dan SQL script.",
  "auth": "Markdown prompt untuk modul 03_Auth_System.md. Instruksikan pembuatan register, login, jwt verify middleware, dan secure password hashing.",
  "api": "Markdown prompt untuk modul 04_API_Endpoints.md. Instruksikan pembuatan route API lengkap untuk CRUD fitur utama.",
  "landing": "Markdown prompt untuk modul 05_Landing_Page.md. Instruksikan pembuatan halaman depan/marketing lengkap dengan styles.",
  "dashboard": "Markdown prompt untuk modul 06_Dashboard.md. Instruksikan pembuatan halaman dashboard admin/user dengan metrics grid.",
  "crud": "Markdown prompt untuk modul 07_CRUD_Modules.md. Instruksikan pembuatan halaman list, edit form, dan modal hapus data.",
  "components": "Markdown prompt untuk modul 08_UI_Components.md. Instruksikan pembuatan reusable UI elements (inputs, select, tables, modals).",
  "testing": "Markdown prompt untuk modul 09_Testing_QA.md. Instruksikan pembuatan unit test dan E2E test scripts.",
  "deployment": "Markdown prompt untuk modul 10_Deployment.md. Instruksikan pembuatan Dockerfile, docker-compose, dan GitHub Actions CI/CD."
}

Setiap modul prompt di dalam JSON harus berisi setidaknya 1000 - 2000 kata instruksi teknis yang sangat spesifik, menyertakan contoh struktur file, kode boilerplate, dan perintah terminal yang harus dijalankan. Jangan gunakan placeholder!

Tulis HANYA valid JSON object tanpa pembungkus markdown (tanpa \`\`\`json).`;
      }

      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast.success("Prompt berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyusun prompt konteks.");
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

    if (documentType === "prompt") {
      // Robust JSON extraction (removes ```json ... ``` wrapper if present)
      const cleaned = contentToSave.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        
        // Ensure all required fields exist
        const requiredKeys = ["frontend", "backend", "database", "tasks"];
        const missing = requiredKeys.filter(k => !parsed[k]);
        
        if (missing.length === 0) {
          // Save validated clean JSON
          contentToSave = JSON.stringify(parsed, null, 2);
        }
      } catch (err) {
        // Paste content is raw markdown, which is totally fine as frontend parser has a fallback regex parser for it.
        console.log("Pasted content is raw Markdown, saving directly.");
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
      <DialogContent className="max-w-xl text-foreground max-h-[85vh] overflow-y-auto flex flex-col gap-4 p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>Claude.ai / ChatGPT Collaborator</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Jika Anda menemui batas limit API AI pada akun gratis, gunakan website Claude.ai secara gratis untuk menghasilkan dokumen lalu tempelkan kembali ke sini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Side-by-side Grid for Steps 1 & 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">1. Salin Konteks Proyek</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Merangkum seluruh ide, stack teknologi, canvas fitur, dan jawaban wawancara untuk prompt Claude.
                </p>
              </div>
              <Button
                onClick={handleCopyPrompt}
                disabled={loading}
                className="w-full gap-2 text-primary-foreground text-xs mt-3 h-8.5"
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
      </DialogContent>
    </Dialog>
  );
}
