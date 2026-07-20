import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Copy, Download, RefreshCw, FileText, ArrowRight, Cpu, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { api } from "@/lib/api";
import { ClaudeCollaboratorModal } from "@/components/claude-collaborator-modal";

function getDisplayContent(val: string): string {
  try {
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === "object" && parsed.content) {
      return parsed.content;
    }
  } catch {}
  return val;
}

// Render markdown as beautiful styled JSX — no raw symbols shown
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Helper: inline formatting (bold, inline code)
  function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    // Strip any leading * or ** bullet markers from inline text
    const cleaned = text.replace(/^\*{1,2}\s*/, "");
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(cleaned)) !== null) {
      if (m.index > last) parts.push(cleaned.slice(last, m.index));
      const token = m[0];
      if (token.startsWith("**")) {
        parts.push(<strong key={m.index} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("`")) {
        parts.push(<code key={m.index} className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-primary">{token.slice(1, -1)}</code>);
      } else {
        parts.push(<em key={m.index} className="italic">{token.slice(1, -1)}</em>);
      }
      last = m.index + token.length;
    }
    if (last < cleaned.length) parts.push(cleaned.slice(last));
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines — add spacing via margin on blocks
    if (trimmed === "") {
      elements.push(<div key={key++} className="h-3" />);
      i++;
      continue;
    }

    // H1
    if (/^#\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h1 key={key++} className="mt-6 mb-3 text-2xl font-bold text-foreground border-b border-border pb-2">
          {renderInline(text)}
        </h1>
      );
      i++; continue;
    }

    // H2
    if (/^##\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h2 key={key++} className="mt-6 mb-2 text-xl font-bold text-foreground">
          {renderInline(text)}
        </h2>
      );
      i++; continue;
    }

    // H3
    if (/^###\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h3 key={key++} className="mt-4 mb-1.5 text-base font-semibold text-foreground/90">
          {renderInline(text)}
        </h3>
      );
      i++; continue;
    }

    // H4+
    if (/^#{4,}\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h4 key={key++} className="mt-3 mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {renderInline(text)}
        </h4>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={key++} className="my-4 border-border" />);
      i++; continue;
    }

    // Bullet list items (* or -)
    if (/^[\*\-]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\*\-]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1.5 pl-4">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)\.\s+(.*)/);
        if (m) listItems.push({ num: m[1], text: m[2] });
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1.5 pl-4">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
              <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {item.num}
              </span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className={cn(
          "my-3 rounded-xl border border-border bg-muted/40 p-4 overflow-x-auto",
          "font-mono text-xs leading-relaxed text-foreground/80"
        )}>
          {lang && <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{lang}</div>}
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const text = trimmed.replace(/^>\s*/, "");
      elements.push(
        <blockquote key={key++} className="my-2 border-l-4 border-primary/40 pl-4 text-sm italic text-muted-foreground">
          {renderInline(text)}
        </blockquote>
      );
      i++; continue;
    }

    // Table (| col | col |)
    if (trimmed.startsWith("|")) {
      const tableRows: string[][] = [];
      let isHeader = true;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        if (/^\|[-\s|:]+\|$/.test(row)) { isHeader = false; i++; continue; }
        const cols = row.split("|").slice(1, -1).map(c => c.trim());
        tableRows.push(cols);
        i++;
      }
      elements.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx === 0 ? "bg-muted/50 font-semibold" : "border-t border-border hover:bg-muted/20"}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-foreground/80">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-foreground/85">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

// ============================================================
// STAGE BAR
// ============================================================
function StageBar({ active }: { active: number }) {
  const stages = ["Canvas", "Tasks", "Blueprint", "Prompting"];
  return (
    <div className="flex items-center gap-1 text-[11px]">
      {stages.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold",
            i < active ? "border-emerald-700/40 bg-emerald-950/40 text-emerald-400" :
            i === active ? "border-indigo-500/40 bg-indigo-950/40 text-indigo-400" :
            "border-slate-800 text-slate-600"
          )}>
            {i < active && <Check size={9} />}{s}
          </span>
          {i < stages.length - 1 && <span className="text-slate-700">→</span>}
        </span>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/app/prd")({
  component: PRDPage,
});

const STEPS = [
  "Menganalisis Ide",
  "Menyusun Requirement",
  "Menentukan Fitur",
  "Menyusun User Flow",
  "Membuat Business Rule",
  "Menyusun Arsitektur",
  "Menyelesaikan Dokumen PRD",
];

function PRDPage() {
  const navigate = useNavigate();
  const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(true); // Mulai dari done true agar tidak langsung loading screen
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasNoPrd, setHasNoPrd] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [showPromptChoiceModal, setShowPromptChoiceModal] = useState(false);
  const [showClaudeModal, setShowClaudeModal] = useState(false);
  const [openCollaboratorModal, setOpenCollaboratorModal] = useState(false);

  useEffect(() => {
    async function loadPRD() {
      if (!projectId) {
        setLoading(false);
        return;
      }
      
      // Auto show recommendation modal once on PRD page load
      const seen = localStorage.getItem(`seen_claude_prd_modal_${projectId}`);
      if (!seen) {
        setShowClaudeModal(true);
        localStorage.setItem(`seen_claude_prd_modal_${projectId}`, "true");
      }

      try {
        // 1. Coba load dari localStorage
        const local = localStorage.getItem(`prd_content_${projectId}`);
        if (local && local.trim().length > 10) {
          setContent(local);
          setHasNoPrd(false);
          setLoading(false);
          return;
        }

        // 2. Coba load dari DB
        const existing = await api.projects.getDocumentByType(projectId, "prd");
        if (existing && existing.content) {
          const displayContent = getDisplayContent(existing.content);
          setContent(displayContent);
          localStorage.setItem(`prd_content_${projectId}`, displayContent);
          setHasNoPrd(false);
        } else {
          setHasNoPrd(true);
        }
      } catch {
        setHasNoPrd(true);
      } finally {
        setLoading(false);
      }
    }

    loadPRD();
  }, [projectId]);

  // Auto-save ke local storage saja
  useEffect(() => {
    if (!projectId || !content) return;
    localStorage.setItem(`prd_content_${projectId}`, content);
  }, [content, projectId]);

  async function generateNewPRD() {
    if (!projectId) return;
    setDone(false);
    setStep(0);
    setGenerating(true);

    const interval = setInterval(() => {
      setStep((s) => {
        if (s < STEPS.length - 2) return s + 1;
        return s;
      });
    }, 1500);

    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("active_provider") : undefined;
      const result = await api.generate.prd(projectId, { provider });
      if (result && result.content) {
        const displayContent = getDisplayContent(result.content);
        setContent(displayContent);
        localStorage.setItem(`prd_content_${projectId}`, displayContent);
        setHasNoPrd(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal generate PRD");
    } finally {
      clearInterval(interval);
      setStep(STEPS.length - 1);
      setTimeout(() => {
        setDone(true);
        setGenerating(false);
      }, 500);
    }
  }

  async function handleProceedToPrompting() {
    if (!projectId || !content) return;
    setSavingDb(true);
    const saveToast = toast.loading("Menyimpan blueprint lengkap ke database...");
    try {
      await api.projects.saveDocumentManual(projectId, "prd", { content });
      toast.success("Blueprint berhasil disimpan ke database!", { id: saveToast });
      navigate({ to: "/app/prompt" });
    } catch {
      toast.error("Gagal menyimpan blueprint ke database", { id: saveToast });
    } finally {
      setSavingDb(false);
    }
  }

  async function handleRegenerate() {
    await generateNewPRD();
  }

  if (!done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Menghasilkan PRD...</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AI sedang menganalisis kebutuhan aplikasi Anda
            </p>
          </div>
          <div className="mb-6">
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          </div>
          <div className="card-premium p-6">
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <div
                    className={
                      i < step
                        ? "text-primary"
                        : i === step
                          ? "text-primary"
                          : "text-muted-foreground/40"
                    }
                  >
                    {i < step ? (
                      <Check size={16} />
                    ) : i === step ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-current" />
                    )}
                  </div>
                  <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#070a0f]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-5 py-2.5 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-3">
          <StageBar active={2} />
          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer" onClick={() => setShowClaudeModal(true)} title="Gunakan kolaborator Claude 3.5 / 3.7 Sonnet">
            <Sparkles size={10} className="text-amber-400" /> Rec: Claude 3.5 / 3.7 Sonnet
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate({ to: "/app/tasks" })} variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700">
            <ArrowRight size={12} className="rotate-180" /> Tasks
          </Button>
          {!hasNoPrd && (
            <>
              <Button variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700" onClick={() => { navigator.clipboard.writeText(content); toast.success("Disalin"); }}>
                <Copy size={12} /> Copy
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700" onClick={() => {
                const blob = new Blob([content], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "PRD.md";
                a.click();
              }}><Download size={12} /> Markdown</Button>
              <Button variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700" onClick={handleRegenerate}>
                <RefreshCw size={12} /> Generate Ulang
              </Button>
            </>
          )}
          <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prd" onSaveSuccess={(newContent) => { setContent(newContent); setHasNoPrd(false); }} />
          <Button onClick={async () => {
            if (projectId && content) {
              setSavingDb(true);
              await api.projects.saveDocumentManual(projectId, "prd", { content }).catch(() => {});
              setSavingDb(false);
            }
            navigate({ to: "/app/prompt" });
          }} disabled={hasNoPrd || savingDb} size="sm" className="text-[11px] h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
            {savingDb ? <Loader2 size={12} className="animate-spin" /> : null}
            Blueprint Selesai → Buat Prompts <ArrowRight size={12} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <FileText size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">Product Requirement Document (Blueprint Lengkap)</h1>
              <p className="text-xs text-slate-500">Mencakup seluruh context halaman UI, API endpoint, dan skema database</p>
            </div>
          </div>



          {hasNoPrd ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
                <FileText size={28} />
              </div>
              <h2 className="text-sm font-bold text-slate-200">Buat Blueprint Lengkap (PRD)</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Anda belum menyusun dokumen requirement lengkap untuk proyek ini. AI akan membaca blueprint Canvas dan list Tasks Anda untuk menyusunnya secara otomatis.
              </p>
              <div className="flex gap-2.5 mt-6 w-full justify-center">
                <Button onClick={generateNewPRD} disabled={generating} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Generate dengan AI
                </Button>
                <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prd" onSaveSuccess={(newContent) => { setContent(newContent); setHasNoPrd(false); }} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 shadow-xl">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-slate-400 mb-4">Gagal menghasilkan PRD secara otomatis karena batas limit AI.</p>
                  <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prd" onSaveSuccess={(newContent) => setContent(newContent)} triggerButton={
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">Gunakan Bantuan Claude.ai</Button>
                  } />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Choice Modal for Generating Prompt */}
      <Dialog open={showPromptChoiceModal} onOpenChange={setShowPromptChoiceModal}>
        <DialogContent className="max-w-md text-slate-100 bg-[#0c1017] border border-slate-800 p-5">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-indigo-400">
              <Sparkles size={16} /> Pilih Metode Generate Prompting
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Bagaimana Anda ingin menghasilkan 10 modul prompt untuk AI Coding Agent?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-3">
            {/* Option 1: AI Otomatis */}
            <button
              onClick={async () => {
                setShowPromptChoiceModal(false);
                setSavingDb(true);
                const saveToast = toast.loading("Menyimpan blueprint ke database...");
                try {
                  await api.projects.saveDocumentManual(projectId!, "prd", { content });
                  toast.success("Blueprint disimpan! Memulai generate otomatis...", { id: saveToast });
                  localStorage.setItem("auto_trigger_prompt_gen", "true");
                  navigate({ to: "/app/prompt" });
                } catch {
                  toast.error("Gagal menyimpan ke database", { id: saveToast });
                } finally {
                  setSavingDb(false);
                }
              }}
              className="text-left p-3.5 rounded-xl border border-indigo-700/20 bg-indigo-950/20 hover:bg-indigo-950/40 hover:border-indigo-600/40 transition-all flex items-start gap-3 group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white mt-0.5 group-hover:scale-105 transition-transform">
                <Cpu size={15} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-300">Generate dengan AI (Otomatis)</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Gunakan AI internal (Gemini/Groq) untuk langsung meng-generate 10 modul prompt secara berurutan.
                </p>
              </div>
            </button>

            {/* Option 2: Claude Manual */}
            <div className="relative">
              <ClaudeCollaboratorModal
                projectId={projectId || ""}
                documentType="prompt"
                onSaveSuccess={() => {
                  setShowPromptChoiceModal(false);
                  toast.success("JSON 10 prompt berhasil disimpan. Navigasi ke Prompts...");
                  navigate({ to: "/app/prompt" });
                }}
                triggerButton={
                  <button className="w-full text-left p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all flex items-start gap-3 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white mt-0.5 group-hover:scale-105 transition-transform">
                      <HelpCircle size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400">Gunakan Bantuan Claude.ai (Manual - Rekomendasi)</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        Salin konteks proyek lengkap untuk Claude.ai web, generate JSON 10 modul prompt bebas limit, lalu tempel hasilnya di sini.
                      </p>
                    </div>
                  </button>
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setShowPromptChoiceModal(false)} className="text-xs text-slate-500 hover:text-slate-300">
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claude Recommendation Dialog */}
      <Dialog open={showClaudeModal} onOpenChange={setShowClaudeModal}>
        <DialogContent className="max-w-sm border-amber-500/30 bg-slate-900 text-slate-100 shadow-2xl rounded-2xl p-5">
          <DialogHeader className="flex flex-col items-center text-center pt-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-2">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <DialogTitle className="text-sm font-bold text-amber-200">
              ⚡ Rekomendasi: Claude 3.5 / 3.7 Sonnet (2026)
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Hasil PRD & Arsitektur paling presisi jika dibuat menggunakan <strong>Claude Sonnet (Claude AI 2026)</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 pt-2">
            <ClaudeCollaboratorModal
              projectId={projectId || ""}
              documentType="prd"
              onSaveSuccess={(newContent) => {
                setContent(newContent);
                setHasNoPrd(false);
                setShowClaudeModal(false);
              }}
              triggerButton={
                <Button
                  size="sm"
                  className="w-full text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5"
                >
                  <Sparkles size={13} /> Gunakan Kolaborator Claude
                </Button>
              }
            />
            <Button variant="ghost" onClick={() => setShowClaudeModal(false)} size="sm" className="w-full text-xs text-slate-500 hover:text-slate-300">
              Lanjut dengan Model Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
