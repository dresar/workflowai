import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ClaudeCollaboratorModal } from "@/components/claude-collaborator-modal";
import JSZip from "jszip";

function getDisplayContent(val: string): string {
  try {
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === "object" && parsed.content) {
      return parsed.content;
    }
  } catch {}
  return val;
}

export const Route = createFileRoute("/app/prompt")({
  component: PromptPage,
});

interface PromptTab {
  id: string;
  label: string;
  content: string;
  icon: Lucide.LucideIcon;
}

function PromptPage() {
  const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
  const [content, setContent] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [techList, setTechList] = useState<string[]>(["React", "TypeScript", "Tailwind CSS", "Drizzle ORM"]);
  const [targetAi, setTargetAi] = useState("Cursor / Claude Code");
  const [activeTab, setActiveTab] = useState("frontend");

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      const allTabs = getPromptTabs(content);

      allTabs.forEach((tab) => {
        if (tab.id === "full") {
          zip.file("README_FULL_PROMPT.md", tab.content);
        } else if (tab.id === "frontend") {
          zip.file("README_FRONTEND.md", tab.content);
        } else if (tab.id === "backend") {
          zip.file("README_BACKEND.md", tab.content);
        } else if (tab.id === "database") {
          zip.file("SCHEMA_DATABASE.sql", tab.content);
        } else if (tab.id === "tasks") {
          zip.file("README_TASKS.md", tab.content);
        }
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (projectName || "Project").toLowerCase().replace(/\s+/g, "_");
      a.download = `VibeCoding_Workspace_${safeName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Workspace ZIP berhasil diunduh!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file ZIP.");
    }
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    async function loadOrGeneratePrompt() {
      try {
        const proj = await api.projects.get(projectId);
        if (proj) {
          setProjectName(proj.name);
          if (proj.preferredAiTarget) {
            setTargetAi(proj.preferredAiTarget);
          }
        }

        const techs = await api.projects.getTechnologies(projectId);
        if (techs && techs.length > 0) {
          setTechList(techs.map((t: any) => t.technologyName));
        }

        const existing = await api.projects.getDocumentByType(projectId, "prompt");
        if (existing && existing.content) {
          setContent(getDisplayContent(existing.content));
        }
      } catch (err) {
        console.warn("Failed to load prompt document", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrGeneratePrompt();
  }, [projectId]);

  // Parse prompt to get separate tabs and clean triple asterisks
  const cleanPromptContent = (raw: string) => {
    return raw
      .replace(/\*\*\*\*/g, "**")
      .replace(/\*\*\*/g, "**")
      .trim();
  };

  const getPromptTabs = (fullContent: string): PromptTab[] => {
    const cleaned = cleanPromptContent(fullContent);

    // Try parsing as structured JSON first (mainly for Claude manual collaborator)
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && (parsed.frontend || parsed.backend || parsed.database || parsed.tasks)) {
        return [
          { id: "frontend", label: "UI/UX & Frontend", content: parsed.frontend || "", icon: Lucide.LayoutDashboard },
          { id: "backend", label: "Backend & System Flow", content: parsed.backend || "", icon: Lucide.Cpu },
          { id: "database", label: "Database SQL Schema", content: parsed.database || "", icon: Lucide.Database },
          { id: "tasks", label: "AI Agent Tasks", content: parsed.tasks || "", icon: Lucide.CheckSquare },
          { id: "full", label: "Prompt Lengkap", content: parsed.full || `=== UI/UX AND FRONTEND SPECIFICATIONS ===\n${parsed.frontend}\n\n=== BACKEND SYSTEM FLOW AND API ARCHITECTURE ===\n${parsed.backend}\n\n=== DATABASE SQL COMPLETE SCHEMAS ===\n${parsed.database}\n\n=== AI AGENT STEP BY STEP DEVELOPMENT TASKS ===\n${parsed.tasks}`, icon: Lucide.Code2 },
        ];
      }
    } catch {}

    const lines = cleaned.split("\n");
    
    const frontendLines: string[] = [];
    const backendLines: string[] = [];
    const databaseLines: string[] = [];
    const tasksLines: string[] = [];

    let currentSection: "frontend" | "backend" | "database" | "tasks" = "frontend";

    for (const line of lines) {
      const cleanLine = line.trim();
      const lower = cleanLine.toLowerCase();
      
      // Determine section change based on headings, bold text, or specific prefixes
      const isHeader = 
        cleanLine.startsWith("#") || 
        (cleanLine.startsWith("**") && cleanLine.endsWith("**")) ||
        /^\d+\.\s+\*\*/.test(cleanLine) ||
        /^(backend|frontend|database|sql|tasks|agent|antigravity):/i.test(cleanLine);

      if (isHeader) {
        if (
          lower.includes("database") || 
          lower.includes("sql") || 
          lower.includes("schema") ||
          lower.includes("skema database")
        ) {
          currentSection = "database";
        } else if (
          lower.includes("backend") || 
          lower.includes("system flow") || 
          lower.includes("api") || 
          lower.includes("endpoints")
        ) {
          currentSection = "backend";
        } else if (
          lower.includes("agent") || 
          lower.includes("task") || 
          lower.includes("tugas") || 
          lower.includes("antigravity") ||
          lower.includes("cursor") ||
          lower.includes("trae")
        ) {
          currentSection = "tasks";
        } else if (
          lower.includes("frontend") || 
          lower.includes("ui/ux") || 
          lower.includes("ui-ux") || 
          lower.includes("tampilan") || 
          lower.includes("component") || 
          lower.includes("page") || 
          lower.includes("client")
        ) {
          currentSection = "frontend";
        }
      }

      if (currentSection === "backend") {
        backendLines.push(line);
      } else if (currentSection === "database") {
        databaseLines.push(line);
      } else if (currentSection === "tasks") {
        tasksLines.push(line);
      } else {
        frontendLines.push(line);
      }
    }

    const frontendText = frontendLines.join("\n").trim();
    const backendText = backendLines.join("\n").trim();
    const databaseText = databaseLines.join("\n").trim();
    const tasksText = tasksLines.join("\n").trim();

    return [
      { id: "frontend", label: "UI/UX & Frontend", content: frontendText, icon: Lucide.LayoutDashboard },
      { id: "backend", label: "Backend & System Flow", content: backendText, icon: Lucide.Cpu },
      { id: "database", label: "Database SQL Schema", content: databaseText, icon: Lucide.Database },
      { id: "tasks", label: "AI Agent Tasks", content: tasksText, icon: Lucide.CheckSquare },
      { id: "full", label: "Prompt Lengkap", content: cleaned, icon: Lucide.Code2 },
    ];
  };

  const tabs = getPromptTabs(content);
  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
  const renderedLines = activeTabObj.content.split("\n");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header section */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lucide.Cpu size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">AI Agent Prompting Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salin modul prompt terpisah langsung ke AI Coding Agent pilihan Anda
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(activeTabObj.content);
              toast.success(`${activeTabObj.label} berhasil disalin ke clipboard!`);
            }}
            disabled={loading || !content}
            className="border-border/80 text-xs bg-slate-900"
          >
            <Lucide.Copy className="mr-2 h-3.5 w-3.5" /> Salin Bagian
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const isDb = activeTabObj.id === "database";
              const filename = isDb ? "SCHEMA_DATABASE.sql" : `README_${activeTabObj.label.replace(/[\s&/]+/g, "_")}.md`;
              const mime = isDb ? "text/plain" : "text/markdown";
              const blob = new Blob([activeTabObj.content], { type: mime });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`${filename} berhasil diunduh!`);
            }}
            disabled={loading || !content}
            className="border-border/80 text-xs bg-slate-900"
          >
            <Lucide.Download className="mr-2 h-3.5 w-3.5" /> Unduh Bagian
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            disabled={loading || !content}
            className="border-border/80 text-xs bg-slate-900"
          >
            <Lucide.Archive className="mr-2 h-3.5 w-3.5" /> Unduh ZIP Workspace
          </Button>
          <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prompt" onSaveSuccess={(newContent) => setContent(newContent)} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 card-premium bg-slate-950/40">
          <Lucide.Loader2 size={36} className="animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Menyusun dan merapikan modul prompt AI Coding Agent...</p>
        </div>
      ) : !content ? (
        <div className="flex flex-col items-center justify-center py-24 card-premium bg-slate-950/40 text-center">
          <p className="text-sm text-muted-foreground mb-4">Super Prompt untuk proyek ini belum dibuat.</p>
          <ClaudeCollaboratorModal projectId={projectId || ""} documentType="prompt" onSaveSuccess={(newContent) => setContent(newContent)} triggerButton={
            <Button className="text-primary-foreground">Mulai Generate dengan Claude.ai</Button>
          } />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Content Area */}
          <div className="flex flex-col h-[620px] rounded-xl border border-border bg-slate-950/50 overflow-hidden text-foreground">
            {/* Tab Selection buttons */}
            <div className="flex border-b border-border bg-slate-900/60 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition shrink-0",
                      activeTab === t.id
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-slate-900"
                    )}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Code editor / Markdown viewer styling */}
            <div className="flex-1 overflow-hidden flex">
              {/* Line Numbers column */}
              <div className="select-none border-r border-border/80 bg-slate-950/20 px-3 py-4 text-right text-muted-foreground/40 font-mono text-xs leading-6 min-w-[45px]">
                {renderedLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Document body text */}
              <div className="flex-1 overflow-auto p-5 select-text custom-scrollbar">
                <pre className="text-slate-300 font-mono text-[12.5px] leading-6 whitespace-pre-wrap">
                  <code>{activeTabObj.content}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Right Sidebar Metadata */}
          <aside className="card-premium h-fit p-5 bg-card/40">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
              <Lucide.Info size={15} className="text-primary" />
              Informasi Prompt
            </h3>
            <div className="space-y-4 text-xs">
              <Info icon={<Lucide.Cpu size={14} className="text-indigo-400" />} label="AI Target" value={targetAi} />
              <Info icon={<Lucide.Languages size={14} className="text-indigo-400" />} label="Bahasa Prompt" value="English" />
              
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground font-semibold">
                  <Lucide.Code2 size={14} className="text-indigo-400" /> Pilihan Teknologi
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {techList.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] bg-slate-900 border-border">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <hr className="border-border/60" />

              <Info label="Jumlah Karakter Modul Ini" value={`${activeTabObj.content.length} karakter`} />
              <Info label="Status" value="Terstruktur &amp; Siap Dipakai" valueClass="text-emerald-500 font-bold" />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Info({ icon, label, value, valueClass = "" }: { icon?: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground font-semibold">
        {icon} {label}
      </div>
      <div className={cn("text-slate-300 font-medium", valueClass)}>{value}</div>
    </div>
  );
}
