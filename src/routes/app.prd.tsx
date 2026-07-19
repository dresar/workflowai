import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Copy, Download, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [done, setDone] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setDone(true);
      return;
    }

    async function loadOrGeneratePRD() {
      try {
        const existing = await api.projects.getDocumentByType(projectId, "prd");
        if (existing && existing.content) {
          setContent(getDisplayContent(existing.content));
          setDone(true);
          setLoading(false);
        } else {
          generateNewPRD();
        }
      } catch {
        generateNewPRD();
      }
    }

    async function generateNewPRD() {
      setDone(false);
      setStep(0);
      setLoading(true);

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
          setContent(getDisplayContent(result.content));
        }
      } catch (err) {
        console.error(err);
      } finally {
        clearInterval(interval);
        setStep(STEPS.length - 1);
        setTimeout(() => {
          setDone(true);
          setLoading(false);
        }, 500);
      }
    }

    loadOrGeneratePRD();
  }, [projectId]);

  async function handleRegenerate() {
    if (!projectId) return;

    setDone(false);
    setStep(0);
    setLoading(true);

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
        setContent(getDisplayContent(result.content));
      }
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setStep(STEPS.length - 1);
      setTimeout(() => {
        setDone(true);
        setLoading(false);
      }, 500);
    }
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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Product Requirement Document</h1>
            <p className="text-xs text-muted-foreground">Generated by AI · Draft v1</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(content); toast.success("Disalin"); }}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const blob = new Blob([content], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "PRD.md";
            a.click();
          }}><Download className="mr-2 h-4 w-4" /> Markdown</Button>
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Generate Ulang
          </Button>
          <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prd" onSaveSuccess={(newContent) => setContent(newContent)} />
          <Button size="sm" onClick={() => navigate({ to: "/app/tasks" })}>
            Lanjut ke Task <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="card-premium p-8">
        {content ? (
          <MarkdownRenderer content={content} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">Gagal menghasilkan PRD secara otomatis karena batas limit AI.</p>
            <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prd" onSaveSuccess={(newContent) => setContent(newContent)} triggerButton={
              <Button className="text-primary-foreground">Gunakan Bantuan Claude.ai</Button>
            } />
          </div>
        )}
      </div>
    </div>
  );
}
