import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Render markdown as beautiful styled JSX
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
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

    if (trimmed === "") {
      elements.push(<div key={key++} className="h-3" />);
      i++;
      continue;
    }

    if (/^#\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h1 key={key++} className="mt-6 mb-3 text-2xl font-bold text-foreground border-b border-border pb-2">
          {renderInline(text)}
        </h1>
      );
      i++; continue;
    }

    if (/^##\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h2 key={key++} className="mt-6 mb-2 text-xl font-bold text-foreground">
          {renderInline(text)}
        </h2>
      );
      i++; continue;
    }

    if (/^###\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h3 key={key++} className="mt-4 mb-1.5 text-base font-semibold text-foreground/90">
          {renderInline(text)}
        </h3>
      );
      i++; continue;
    }

    if (/^#{4,}\s/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h4 key={key++} className="mt-3 mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {renderInline(text)}
        </h4>
      );
      i++; continue;
    }

    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={key++} className="my-4 border-border" />);
      i++; continue;
    }

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

    elements.push(
      <p key={key++} className="text-sm text-foreground/85 leading-relaxed mb-1.5">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="markdown-body">{elements}</div>;
}

export const Route = createFileRoute("/app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    async function loadOrGenerateTasks() {
      try {
        const existing = await api.projects.getDocumentByType(projectId, "tasks");
        if (existing && existing.content) {
          const clean = getDisplayContent(existing.content);
          setContent(clean);
          setLoading(false);
        } else {
          generateNewTasks();
        }
      } catch {
        generateNewTasks();
      }
    }

    async function generateNewTasks() {
      setLoading(true);
      try {
        const provider = typeof window !== "undefined" ? localStorage.getItem("active_provider") : undefined;
        const result = await api.generate.tasks(projectId, { provider });
        if (result && result.content) {
          const clean = getDisplayContent(result.content);
          setContent(clean);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadOrGenerateTasks();
  }, [projectId]);

  async function handleRegenerate() {
    if (!projectId) return;

    setLoading(true);
    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("active_provider") : undefined;
      const result = await api.generate.tasks(projectId, { provider });
      if (result && result.content) {
        const clean = getDisplayContent(result.content);
        setContent(clean);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card/40 px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">AI Vibe Coding Tasks</h1>
          <p className="text-xs text-muted-foreground">Instruksi langkah demi langkah untuk agen AI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Generate Ulang
          </Button>
          <ClaudeCollaboratorModal projectId={projectId || ""} documentType="tasks" onSaveSuccess={(newContent) => setContent(newContent)} />
          <Button onClick={() => navigate({ to: "/app/prompt" })} disabled={loading}>
            Lanjut ke AI Prompt <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Menyusun instruksi vibe coding untuk AI agent...</p>
        </div>
      ) : (
        <div className="flex-1 p-6">
          <div className="card-premium p-8 max-w-4xl mx-auto shadow-sm border border-border/50">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">Gagal menghasilkan tasks secara otomatis karena batas limit AI.</p>
                <ClaudeCollaboratorModal projectId={projectId || ""} documentType="tasks" onSaveSuccess={(newContent) => setContent(newContent)} triggerButton={
                  <Button className="text-primary-foreground">Gunakan Bantuan Claude.ai</Button>
                } />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

