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

      const canvasFeatures = canvas?.features || [];
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

FEATURE CANVAS:
${canvasFeatures.map((f: any) => `- ${f.name} [Phase: ${f.phase}]: ${f.subs?.join(", ") || ""}`).join("\n")}

EXISTING DOCUMENTS:
${Object.entries(docs)
  .map(([key, content]) => `--- EXISTING ${key.toUpperCase()} ---\n${String(content)}`)
  .join("\n\n")}
${templateInstructions}
`;

      if (documentType === "prd") {
        promptText += `
YOUR TASK:
Write a FINAL, COMPLETE, PROFESSIONAL Product Requirement Document (PRD) in ${project.language === "id" ? "Indonesian" : "English"}.
The document must cover all features listed in the Feature Canvas in extreme detail.
It MUST include:
1. Executive Summary
2. User Personas & Flows
3. Complete Feature Specifications (Functional Requirements)
4. Non-Functional Requirements
5. Security & Privacy
6. Future Scope
7. Technical Stack Integration Details

CRITICAL RULES:
- Output ONLY the Markdown content. Do not include any chat prefix/suffix (like "Here is your PRD...").
- NEVER use raw Markdown bold symbols like '***' or raw asterisks lists if they break styling.
- Use only standard headers (#, ##, ###) and clean lists (- or numbered).
- Be extremely verbose and detailed. Aim for at least 2500 words.`;
      } else if (documentType === "tasks") {
        promptText += `
YOUR TASK:
Write a step-by-step Vibe Coding Task Breakdown list in ${project.language === "id" ? "Indonesian" : "English"} tailored SPECIFICALLY for AI coding agents (like Cursor, Trae, Windsurf, or Antigravity).
The task breakdown should guide the AI to implement the project incrementally.

CRITICAL RULES:
- NEVER include time estimates, hours, story points, or sprints. This is for AI agents, not humans!
- Output ONLY the Markdown content. Do not include introductory text.
- Focus on coding: Setup, Database schema, API endpoints, Components, Integration.
- Structure it cleanly.`;
      } else if (documentType === "prompt") {
        promptText += `
YOUR TASK:
Generate an extremely comprehensive, exhaustive, and verbose "Vibe Coding Super Prompt" (modeled after prompt structures used in high-end generation engines) to build this application from scratch.

CRITICAL FOCUS (DO NOT SKIP ANY PAGES OR ENDPOINTS):
- Coding platforms often skip pages or components if they are not explicitly detailed. To prevent this, you MUST list and describe EVERY SINGLE page, modal, form, layout, and component from the project requirements in extreme detail.
- You must prioritize the **UI/UX & Frontend** and **Backend & System Flow** sections. Provide full code blocks, exact Tailwind classes, folder structures, complete API route handlers, and middleware definitions rather than summaries or placeholders.

CRITICAL JSON SPECIFICATIONS - YOU MUST COMPLY:
To allow the application to easily parse and display each module, you MUST output ONLY a valid JSON object. Do not write any conversational markdown or explanation outside the JSON. The JSON structure MUST follow this exact schema:
{
  "frontend": "Detailed UI/UX & Frontend specifications. For each page in the inventory, detail its purpose, layout, components, Tailwind styling classes, animations, micro-interactions, responsive behavior, and alt text validations. Provide complete page blueprints so AI coding platforms will build all of them without skipping anything.",
  "backend": "Detailed Backend System Flow & API Architecture specifications. Detail the complete directory tree structure, absolute file paths, every single API route endpoint (method, request, response schemas, and logic), authentication RBAC middleware flows, and service integrations.",
  "database": "Pure PostgreSQL SQL Database schemas. Include complete CREATE TABLE DDLs (using UUIDs, proper foreign keys with ON DELETE CASCADE, TIMESTAMPTZ timestamps, CREATE INDEX statements), and robust INSERT statements for initial seeding.",
  "tasks": "At least 30-45 numbered AI Vibe Coding tasks in exact chronological order for coding agents (Setup -> Database -> Backend -> Frontend -> Integration). List exactly which files to create, what code to write, and what commands to run."
}

CLAUDE ARTIFACTS / CANVAS & TRUNCATION INSTRUCTIONS:
- Since you are generating this via the Claude.ai Web Interface, PLEASE GENERATE THIS JSON IN A CLAUDE ARTIFACT (CLAUDE CANVAS) box so it is rendered fully and can be copied easily.
- If you are about to reach your output token limit, DO NOT truncate the JSON in the middle of a string (which breaks JSON parsing). Instead, pause before the database or tasks key, output valid JSON up to that point, and instruct the user to type "continue" to get the rest of the JSON. Alternatively, write extremely concise but complete code blocks so it fits within one long response window.

VIBE CODING FOCUS INSTRUCTIONS:
- Think and expand the scope: Propose and integrate advanced modern features (e.g. Analytics dashboards, Role-Based Access Control, Logging & Auditing, Email notifications, Supabase Storage, Export to CSV/PDF, Real-time status updates) to make this application feel complete and premium.
- Frontend: Detail the exact Tailwind classes, interactive states, animations, loading skeletons, responsive layouts (375px mobile, 768px tablet, 1024px+ desktop), and components.
- Backend & DB: Write complete SQL DDL commands (including UUIDs, ON DELETE CASCADE, TIMESTAMPTZ timestamps, indexes, seed data), absolute folder structures, precise API endpoints, and middleware.
- Tasks: Structure them as direct commands for AI agents like Antigravity, Cursor, or Trae (e.g. 'Build file X with this exact logic...', 'Run command Y...').

CRITICAL RULES:
- You must output ONLY a valid parseable JSON. Do not wrap it in conversational introductory or concluding remarks.
- Ensure all double-quotes inside string values are properly escaped (\\") and newlines are represented as \\n.
- The total size of strings across all keys MUST exceed 100,000 characters combined. Write complete, exhaustive code templates, SQL schemas, and component layouts. Be as descriptive, detailed, and complete as humanly possible.`;
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
      <DialogContent className="max-w-2xl text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Bantuan Claude.ai / ChatGPT Collaborator</span>
          </DialogTitle>
          <DialogDescription>
            Jika Anda menemui batas limit API AI pada akun gratis, Anda bisa menghasilkan dokumen ini menggunakan web Claude.ai secara gratis dan menempelkannya kembali ke sini.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2 text-foreground">Langkah 1: Salin Konteks Proyek</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Kami akan merangkum seluruh ide, stack teknologi, canvas fitur, dan jawaban wawancara Anda ke dalam sebuah prompt super khusus untuk Claude.
            </p>
            <Button
              onClick={handleCopyPrompt}
              disabled={loading}
              className="w-full gap-2 text-primary-foreground"
              variant={copied ? "secondary" : "default"}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : copied ? (
                <Check size={15} className="text-emerald-500" />
              ) : (
                <Copy size={15} />
              )}
              {copied ? "Prompt Tersalin!" : "Salin Prompt Spesifik untuk Claude"}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2 text-foreground">Langkah 2: Generate di Claude.ai</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Buka website Claude.ai (atau ChatGPT), paste prompt yang baru Anda salin, lalu tunggu AI menuliskan dokumen {docNames[documentType]} untuk Anda.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-foreground"
              onClick={() => window.open("https://claude.ai", "_blank")}
            >
              <ExternalLink size={15} /> Buka Claude.ai (Tab Baru)
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Langkah 3: Tempel Hasil ke Sini</label>
            <Textarea
              placeholder="Tempelkan hasil markdown yang digenerate oleh Claude ke sini..."
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              className="h-44 font-sans text-xs leading-relaxed text-foreground bg-background"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="text-muted-foreground hover:text-foreground">
            Batal
          </Button>
          <Button onClick={handleSaveManual} disabled={loading || !manualContent.trim()} className="text-primary-foreground">
            {loading && <Loader2 size={15} className="animate-spin mr-1" />}
            Simpan Dokumen & Lanjutkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
