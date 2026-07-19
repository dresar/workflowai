import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import JSZip from "jszip";

export const Route = createFileRoute("/app/canvas")({
  component: CanvasPage,
});

interface Feature {
  name: string;
  iconName?: string;
  phase: string;
  subs: string[];
  tasks?: string[];
  sqlSchema?: string[];
}

const ICON_MAP: Record<string, Lucide.LucideIcon> = {
  shield: Lucide.Shield,
  "layout-dashboard": Lucide.LayoutDashboard,
  dashboard: Lucide.LayoutDashboard,
  users: Lucide.Users,
  package: Lucide.Package,
  "bar-chart-3": Lucide.BarChart3,
  chart: Lucide.BarChart3,
  settings: Lucide.Settings,
  brain: Lucide.Brain,
  ai: Lucide.Brain,
  bell: Lucide.Bell,
  notification: Lucide.Bell,
  "credit-card": Lucide.CreditCard,
  payment: Lucide.CreditCard,
  globe: Lucide.Globe,
  search: Lucide.Search,
  message: Lucide.MessageSquare,
  mail: Lucide.Mail,
  file: Lucide.FileText,
  calendar: Lucide.Calendar,
  lock: Lucide.Lock,
  zap: Lucide.Zap,
  "git-branch": Lucide.GitBranch,
  cloud: Lucide.Cloud,
  smartphone: Lucide.Smartphone,
  "bar-chart-2": Lucide.BarChart2,
};

function getIcon(name?: string): Lucide.LucideIcon {
  if (!name) return Lucide.Box;
  const normalized = name.toLowerCase().replace("lucide-", "").replace(/_/g, "-");
  return ICON_MAP[normalized] || Lucide.Box;
}

const FALLBACK_FEATURES: Feature[] = [
  {
    name: "Authentication & Keamanan",
    iconName: "shield",
    phase: "Fase 1: Infrastruktur",
    subs: ["Login Form", "Register Form", "OAuth Google / GitHub", "Reset Password via Email", "Session JWT", "Role Guard Middleware", "Two-Factor Auth (2FA)"],
    sqlSchema: [
      "CREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email VARCHAR(255) UNIQUE NOT NULL,\n  password_hash VARCHAR(255),\n  full_name VARCHAR(255),\n  avatar_url TEXT,\n  provider VARCHAR(50) DEFAULT 'local',\n  is_verified BOOLEAN DEFAULT FALSE,\n  two_factor_secret TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);",
      "CREATE TABLE sessions (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n  token TEXT UNIQUE NOT NULL,\n  ip_address VARCHAR(45),\n  expires_at TIMESTAMPTZ NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);",
      "CREATE TABLE password_resets (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n  token VARCHAR(255) UNIQUE NOT NULL,\n  expires_at TIMESTAMPTZ NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);"
    ],
    tasks: [
      "1. Setup env: DATABASE_URL, JWT_SECRET, SMTP, OAuth credentials",
      "2. Run migration: tabel users, sessions, password_resets",
      "3. Implement bcrypt hashing dan JWT sign/verify",
      "4. Build POST /api/auth/register, /login, /logout, /refresh-token",
      "5. OAuth2 callback handler Google dan GitHub",
      "6. Buat React login/register forms + Zod validation",
    ]
  },
  {
    name: "Dashboard & Analytics",
    iconName: "layout-dashboard",
    phase: "Fase 1: Infrastruktur",
    subs: ["KPI Widgets", "Statistik Chart (Recharts)", "Activity Feed", "Quick Actions Bar", "Notifikasi Real-time", "Filter Periode"],
    sqlSchema: [
      "CREATE TABLE activity_logs (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id) ON DELETE SET NULL,\n  action VARCHAR(100) NOT NULL,\n  entity_type VARCHAR(50),\n  entity_id UUID,\n  details JSONB,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);",
      "CREATE TABLE notifications (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n  title VARCHAR(255) NOT NULL,\n  body TEXT,\n  type VARCHAR(50) DEFAULT 'info',\n  is_read BOOLEAN DEFAULT FALSE,\n  action_url TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);"
    ],
    tasks: [
      "1. GET /api/dashboard/stats endpoint aggregasi data per user",
      "2. WebSocket server untuk real-time notifikasi",
      "3. Activity logger middleware auto-log setiap request",
      "4. Dashboard layout responsive: KPI cards + charts",
      "5. Integrate Recharts LineChart dan BarChart",
    ]
  },
  {
    name: "Manajemen Pengguna",
    iconName: "users",
    phase: "Fase 2: Core Features",
    subs: ["Daftar User & Filter", "Edit Profil User", "Roles & Permissions", "Suspend / Aktivasi User", "User Activity History"],
    sqlSchema: [
      "CREATE TABLE roles (\n  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,\n  name VARCHAR(50) UNIQUE NOT NULL,\n  description TEXT\n);",
      "CREATE TABLE permissions (\n  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,\n  action VARCHAR(100) UNIQUE NOT NULL\n);",
      "CREATE TABLE role_permissions (\n  role_id INT REFERENCES roles(id) ON DELETE CASCADE,\n  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,\n  PRIMARY KEY (role_id, permission_id)\n);",
      "CREATE TABLE user_roles (\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n  role_id INT REFERENCES roles(id) ON DELETE CASCADE,\n  PRIMARY KEY (user_id, role_id)\n);"
    ],
    tasks: [
      "1. Seed roles: Admin, Manager, Member dengan permissions",
      "2. Middleware checkPermission(['manage_users'])",
      "3. GET/PUT /api/users endpoints dengan pagination",
      "4. UI: tabel user admin + profile edit modal",
      "5. Suspend / aktivasi user endpoint + audit log",
    ]
  },
];

// ---------- Revision Modal ----------
function RevisionModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean; onClose: () => void; onSubmit: (t: string) => void; loading: boolean;
}) {
  const [text, setText] = useState("");
  useEffect(() => { if (!open) setText(""); }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-indigo-500/20 bg-slate-900 shadow-2xl shadow-indigo-900/30 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Lucide.Sparkles size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Revisi Canvas dengan AI</h3>
              <p className="text-[11px] text-slate-500">Gemini + Groq akan memperbarui seluruh canvas</p>
            </div>
          </div>
          <button onClick={() => !loading && onClose()} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition">
            <Lucide.X size={16} />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contoh: Tambahkan modul chat real-time, integrasi payment Midtrans, dan laporan PDF otomatis di Fase 3..."
          disabled={loading}
          autoFocus
          rows={6}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none transition"
        />
        <div className="flex items-center gap-2 justify-end">
          <Button onClick={onClose} variant="outline" size="sm" disabled={loading} className="text-xs border-slate-700 hover:bg-slate-800">
            Batal
          </Button>
          <Button
            onClick={() => { if (text.trim()) onSubmit(text); }}
            disabled={loading || !text.trim()}
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2"
          >
            {loading
              ? <><Lucide.Loader2 size={13} className="animate-spin" /> Memproses AI...</>
              : <><Lucide.Send size={13} /> Terapkan Revisi</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Feature Detail Modal ----------
function FeatureDetailModal({ feature, onClose }: { feature: Feature | null; onClose: () => void }) {
  if (!feature) return null;
  const Icon = getIcon(feature.iconName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{feature.name}</h3>
              <Badge className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-1">{feature.phase}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition">
            <Lucide.X size={16} />
          </button>
        </div>

        {feature.subs.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
              <Lucide.Boxes size={12} className="text-slate-400" /> SEMUA SUB FITUR ({feature.subs.length})
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {feature.subs.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/50 px-2.5 py-1.5 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" /> {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {feature.sqlSchema && feature.sqlSchema.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
              <Lucide.Database size={12} className="text-emerald-400" /> SQL SCHEMAS ({feature.sqlSchema.length} tabel)
            </div>
            <div className="space-y-2">
              {feature.sqlSchema.map((sql, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">{sql}</div>
              ))}
            </div>
          </div>
        )}

        {feature.tasks && feature.tasks.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
              <Lucide.Cpu size={12} className="text-indigo-400 animate-pulse" /> AI AGENT TASKS ({feature.tasks.length})
            </div>
            <div className="space-y-2">
              {feature.tasks.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-indigo-950/40 bg-indigo-950/20 px-3 py-2 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Stage Bar ----------
function StageBar({ active }: { active: number }) {
  const stages = ["Struktur", "PRD", "Task", "Prompt"];
  return (
    <div className="flex items-center gap-2 text-xs">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1",
            i <= active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
          )}>
            {i < active && <Lucide.Check size={10} />}
            {s}
          </span>
          {i < stages.length - 1 && <Lucide.ArrowRight size={12} className="text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ---------- Main Page ----------
function CanvasPage() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Proyek Aplikasi");
  const [features, setFeatures] = useState<Feature[]>(FALLBACK_FEATURES);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<{ d: string }[]>([]);
  const [revising, setRevising] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState<string | null>(null);
  const [docHistories, setDocHistories] = useState<Record<string, any[]>>({});

  const updateLines = () => {
    const parent = document.querySelector(".canvas-viewport") as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rootRight = document.getElementById("anchor-root-right");
    if (!rootRight) return;
    const rootRightRect = rootRight.getBoundingClientRect();
    const rootX = rootRightRect.left + rootRightRect.width / 2 - parentRect.left + parent.scrollLeft;
    const rootY = rootRightRect.top + rootRightRect.height / 2 - parentRect.top + parent.scrollTop;

    const newLines: { d: string }[] = [];
    features.forEach((_, idx) => {
      const featLeft = document.getElementById(`anchor-feat-left-${idx}`);
      const featRight = document.getElementById(`anchor-feat-right-${idx}`);
      const subLeft = document.getElementById(`anchor-sub-left-${idx}`);
      const subRight = document.getElementById(`anchor-sub-right-${idx}`);
      const sqlLeft = document.getElementById(`anchor-sql-left-${idx}`);
      const sqlRight = document.getElementById(`anchor-sql-right-${idx}`);
      const taskLeft = document.getElementById(`anchor-task-left-${idx}`);

      const push = (a: Element | null, b: Element | null) => {
        if (!a || !b) return;
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const ax = ar.left + ar.width / 2 - parentRect.left + parent.scrollLeft;
        const ay = ar.top + ar.height / 2 - parentRect.top + parent.scrollTop;
        const bx = br.left + br.width / 2 - parentRect.left + parent.scrollLeft;
        const by = br.top + br.height / 2 - parentRect.top + parent.scrollTop;
        newLines.push({ d: `M ${ax} ${ay} C ${(ax + bx) / 2} ${ay}, ${(ax + bx) / 2} ${by}, ${bx} ${by}` });
      };

      if (featLeft) {
        const r = featLeft.getBoundingClientRect();
        const fx = r.left + r.width / 2 - parentRect.left + parent.scrollLeft;
        const fy = r.top + r.height / 2 - parentRect.top + parent.scrollTop;
        newLines.push({ d: `M ${rootX} ${rootY} C ${(rootX + fx) / 2} ${rootY}, ${(rootX + fx) / 2} ${fy}, ${fx} ${fy}` });
      }
      push(featRight, subLeft);
      push(subRight, sqlLeft);
      push(sqlRight, taskLeft);
    });

    setLines(newLines);
  };

  useEffect(() => {
    async function loadCanvas() {
      const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
      if (!projectId) { setLoading(false); return; }
      try {
        const proj = await api.projects.get(projectId);
        if (proj) setProjectName(proj.name);
        const canvas = await api.projects.getCanvas(projectId);
        if (canvas && canvas.features && canvas.features.length > 0) {
          setFeatures(canvas.features);
        } else {
          const provider = typeof window !== "undefined" ? localStorage.getItem("active_provider") : undefined;
          const generated = await api.generate.canvas(projectId, { provider });
          if (generated && generated.content) {
            try {
              const cleaned = generated.content.replace(/```json/g, "").replace(/```/g, "").trim();
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) {
                setFeatures(parsed);
                await api.projects.saveCanvas(projectId, { features: parsed, isAiGenerated: true });
                const updatedProj = await api.projects.get(projectId);
                if (updatedProj) setProjectName(updatedProj.name);
              }
            } catch (jsonErr) { console.error(jsonErr); }
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    loadCanvas();
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, []);

  useEffect(() => {
    if (loading) return;
    const viewport = document.querySelector(".canvas-viewport");
    if (!viewport) return;
    const observer = new ResizeObserver(() => updateLines());
    observer.observe(viewport);
    const t1 = setTimeout(updateLines, 200);
    const t2 = setTimeout(updateLines, 800);
    return () => { observer.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, [loading, features]);

  async function handleRevision(revisionText: string) {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
    if (!projectId) return;
    setRevising(true);
    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("active_provider") : undefined;
      const result = await api.generate.canvas(projectId, { provider, revision: revisionText });
      if (result && result.content) {
        try {
          const cleaned = result.content.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            setFeatures(parsed);
            await api.projects.saveCanvas(projectId, { features: parsed, isAiGenerated: true });
            const updatedProj = await api.projects.get(projectId);
            if (updatedProj) setProjectName(updatedProj.name);
            toast.success("Canvas berhasil diperbarui!");
            setShowRevisionModal(false);
            setTimeout(updateLines, 400);
          }
        } catch { toast.error("Format balasan AI tidak valid. Coba lagi."); }
      }
    } catch { toast.error("Gagal melakukan revisi."); }
    finally { setRevising(false); }
  }

  const DOC_TYPES = [
    { key: "canvas", label: "Canvas", icon: "Layers", genFn: (id: string) => api.generate.canvas(id) },
    { key: "prd", label: "PRD", icon: "FileText", genFn: (id: string) => api.generate.prd(id) },
    { key: "architecture", label: "Arsitektur", icon: "Code2", genFn: (id: string) => api.generate.architecture(id) },
    { key: "database", label: "Database", icon: "Database", genFn: (id: string) => api.generate.database(id) },
    { key: "api", label: "API Spec", icon: "Braces", genFn: (id: string) => api.generate.api(id) },
    { key: "tasks", label: "Task List", icon: "ListChecks", genFn: (id: string) => api.generate.tasks(id) },
    { key: "prompt", label: "AI Prompt", icon: "Wand2", genFn: (id: string) => api.generate.prompt(id) },
  ] as const;

  async function openHistory() {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
    if (!projectId) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const results = await Promise.allSettled(
        DOC_TYPES.map(async (d) => {
          const hist = await api.projects.getDocumentHistory(projectId, d.key).catch(() => []);
          return { key: d.key, history: Array.isArray(hist) ? hist : [] };
        })
      );
      const map: Record<string, any[]> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.key] = r.value.history;
      });
      setDocHistories(map);
    } catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  }

  async function regenerateDoc(docKey: string) {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
    if (!projectId) return;
    const docType = DOC_TYPES.find((d) => d.key === docKey);
    if (!docType) return;
    setRegenLoading(docKey);
    try {
      await docType.genFn(projectId);
      toast.success(`${docType.label} berhasil di-generate ulang!`);
      // refresh history for this doc
      const hist = await api.projects.getDocumentHistory(projectId, docKey).catch(() => []);
      setDocHistories((prev) => ({ ...prev, [docKey]: Array.isArray(hist) ? hist : [] }));
      if (docKey === "canvas") {
        const canvas = await api.projects.getCanvas(projectId);
        if (canvas?.features?.length) {
          setFeatures(canvas.features);
          setTimeout(updateLines, 400);
        }
      }
    } catch (err: any) {
      toast.error(`Gagal generate ulang ${docType.label}: ${err?.message ?? "error"}`);
    } finally {
      setRegenLoading(null);
    }
  }

  async function downloadZIP() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const [prd, arch, db, apiDoc, tasks, prompt] = await Promise.all([
        api.projects.getDocumentByType(projectId, "prd").catch(() => null),
        api.projects.getDocumentByType(projectId, "architecture").catch(() => null),
        api.projects.getDocumentByType(projectId, "database").catch(() => null),
        api.projects.getDocumentByType(projectId, "api").catch(() => null),
        api.projects.getDocumentByType(projectId, "tasks").catch(() => null),
        api.projects.getDocumentByType(projectId, "prompt").catch(() => null),
      ]);

      const clean = (val: string) => {
        try { const p = JSON.parse(val); if (p?.content) return p.content; } catch {}
        return val;
      };

      if (prd?.content) zip.file("1_PRD.md", clean(prd.content));
      if (arch?.content) zip.file("2_Architecture.md", clean(arch.content));
      if (db?.content) zip.file("3_Database_Design.md", clean(db.content));
      if (apiDoc?.content) zip.file("4_API_Specification.md", clean(apiDoc.content));
      if (tasks?.content) zip.file("5_Task_Breakdown.md", clean(tasks.content));
      if (prompt?.content) zip.file("6_AI_Agent_Prompt.txt", clean(prompt.content));

      // Full SQL from canvas
      let sqlContent = `-- ==========================================\n-- ${projectName.toUpperCase()} - COMPLETE SQL SCHEMAS\n-- Generated by AI Workflow Studio (Gemini + Groq)\n-- ==========================================\n\n`;
      features.forEach((feat) => {
        sqlContent += `-- === MODULE: ${feat.name.toUpperCase()} ===\n\n`;
        (feat.sqlSchema ?? []).forEach((sql) => { sqlContent += sql + "\n\n"; });
      });
      zip.file("7_Complete_SQL_Schemas.sql", sqlContent);

      zip.file("README.txt", `=== ${projectName.toUpperCase()} - AI WORKFLOW STUDIO ===\n\nGenerated by Gemini + Groq collaborative AI.\n\nFiles:\n1_PRD.md, 2_Architecture.md, 3_Database_Design.md, 4_API_Specification.md\n5_Task_Breakdown.md, 6_AI_Agent_Prompt.txt, 7_Complete_SQL_Schemas.sql`);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${projectName.replace(/\s+/g, "_")}_Workflow.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP berhasil diunduh!");
    } catch { toast.error("Gagal mengemas ZIP."); }
    finally { setDownloadingZip(false); }
  }

  const totalSubs = features.reduce((a, f) => a + f.subs.length, 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-3 backdrop-blur-md">
        <StageBar active={0} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {features.length} fitur · {totalSubs} sub-fitur
          </span>
          <Button
            onClick={() => navigate({ to: "/app/sql" as any })}
            variant="outline" size="sm"
            className="text-xs border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/40 gap-1.5"
          >
            <Lucide.Database size={13} /> SQL Page
          </Button>
          <Button
            onClick={() => navigate({ to: "/app/prd" })}
            disabled={loading || revising} size="sm"
            className="text-xs gap-1.5"
          >
            Lanjutkan ke PRD <Lucide.ArrowRight size={13} />
          </Button>
        </div>
      </div>

      {/* Full-Screen Canvas */}
      <div className="canvas-viewport relative flex-1 overflow-auto bg-slate-950/95 select-none">
        {/* Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

        {/* SVG Lines */}
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, minWidth: "1550px", width: "100%", height: "100%", minHeight: "100%" }}>
          {lines.map((l, i) => (
            <path key={i} d={l.d} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="4 4" />
          ))}
        </svg>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] relative z-10">
            <div className="relative">
              <Lucide.Loader2 size={36} className="animate-spin text-primary" />
              <div className="absolute -inset-4 rounded-full border border-indigo-500/20 animate-ping" />
            </div>
            <p className="mt-6 text-sm text-slate-400 font-medium">Gemini & Groq sedang menyusun Feature Canvas...</p>
            <p className="text-xs text-slate-600 mt-1">Menganalisis ide dan merancang arsitektur sistem</p>
          </div>
        ) : (
          <div className="relative z-10 flex items-start gap-x-8 min-w-[1550px] py-10 px-6">

            {/* Col 1: Root */}
            <div className="flex flex-col items-center justify-center shrink-0 w-[200px]" style={{ paddingTop: `${Math.max(0, (features.length - 1) * 34)}px` }}>
              <div id="node-root" className="relative flex flex-col items-center gap-2.5 p-5 bg-gradient-to-b from-slate-800 to-slate-900 border border-indigo-500/30 rounded-2xl text-center w-48 shadow-2xl shadow-indigo-900/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  <Lucide.FileText size={26} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Root Project</div>
                  <div className="text-sm font-bold text-slate-100 mt-1 leading-tight">{projectName}</div>
                </div>
                <div className="text-[10px] text-indigo-400 bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-500/20 font-semibold">
                  {features.length} Fitur Terencana
                </div>
                <div id="anchor-root-right" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
              </div>
            </div>

            {/* Col 2: Features */}
            <div className="flex flex-col gap-y-7 shrink-0 w-[240px]">
              {features.map((f, idx) => {
                const IconComponent = getIcon(f.iconName);
                return (
                  <div
                    key={`feat-${idx}`}
                    id={`node-feat-${idx}`}
                    onClick={() => setSelectedFeature(f)}
                    className="relative flex items-center justify-between p-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl w-60 shadow-lg hover:border-indigo-500/50 transition-all cursor-pointer group"
                  >
                    <div id={`anchor-feat-left-${idx}`} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition shrink-0">
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 leading-tight">{f.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{f.subs.length} sub-fitur</div>
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0 font-bold shrink-0">
                      {f.phase.split(":")[0].toUpperCase()}
                    </Badge>
                    <div id={`anchor-feat-right-${idx}`} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                  </div>
                );
              })}
            </div>

            {/* Col 3: Sub Features */}
            <div className="flex flex-col gap-y-7 shrink-0 w-[240px]">
              {features.map((f, idx) => (
                <div key={`sub-${idx}`} id={`node-sub-${idx}`} className="relative p-4 bg-slate-900/70 border border-slate-800/60 rounded-xl w-60">
                  <div id={`anchor-sub-left-${idx}`} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
                    <Lucide.Boxes size={12} className="text-slate-400" /> SUB FITUR
                  </div>
                  <div className="space-y-1.5">
                    {f.subs.slice(0, 4).map((s) => (
                      <div key={s} className="flex items-center gap-2 rounded-lg border border-slate-800/40 bg-slate-950/40 px-2.5 py-1 text-[11px] text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
                  {f.subs.length > 4 && (
                    <button onClick={() => setSelectedFeature(f)} className="text-[10px] text-slate-500 mt-2 hover:text-indigo-400 transition text-right font-medium w-full">
                      +{f.subs.length - 4} lainnya →
                    </button>
                  )}
                  <div id={`anchor-sub-right-${idx}`} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                </div>
              ))}
            </div>

            {/* Col 4: SQL Schema */}
            <div className="flex flex-col gap-y-7 shrink-0 w-[240px]">
              {features.map((f, idx) => {
                const sqlToRender = f.sqlSchema && f.sqlSchema.length > 0 ? f.sqlSchema : [
                  `CREATE TABLE ${f.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")} (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`
                ];
                return (
                  <div key={`sql-${idx}`} id={`node-sql-${idx}`} className="relative p-4 bg-slate-900/50 border border-emerald-950/40 rounded-xl w-60 hover:border-emerald-800/40 transition-all">
                    <div id={`anchor-sql-left-${idx}`} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
                      <Lucide.Database size={12} className="text-emerald-400" /> SQL SCHEMA
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 font-mono text-[9px] text-emerald-400 overflow-hidden whitespace-pre leading-normal max-h-[72px]">
                      {sqlToRender[0]}
                    </div>
                    <button
                      onClick={() => navigate({ to: "/app/sql" as any })}
                      className="text-[10px] text-slate-500 mt-2 hover:text-emerald-400 transition text-right font-medium w-full flex items-center justify-end gap-1"
                    >
                      <Lucide.Database size={9} /> {sqlToRender.length} tabel → Buka SQL Page
                    </button>
                    <div id={`anchor-sql-right-${idx}`} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                  </div>
                );
              })}
            </div>

            {/* Col 5: AI Tasks */}
            <div className="flex flex-col gap-y-7 shrink-0 w-[260px]">
              {features.map((f, idx) => {
                const tasksToRender = f.tasks && f.tasks.length > 0 ? f.tasks : [
                  "1. Setup environment dan konfigurasi database",
                  "2. Buat API routes dan controller logic",
                  "3. Implement business logic dan validasi",
                  "4. Buat UI components dan integrasikan API",
                ];
                return (
                  <div key={`task-${idx}`} id={`node-task-${idx}`} className="relative p-4 bg-slate-900/40 border border-indigo-950/40 rounded-xl w-64 hover:border-indigo-800/40 transition-all">
                    <div id={`anchor-task-left-${idx}`} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 rounded-full bg-slate-800 border border-indigo-500 z-20" />
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
                      <Lucide.Cpu size={12} className="text-indigo-400 animate-pulse" /> TASK AGEN AI
                    </div>
                    <div className="space-y-1.5">
                      {tasksToRender.slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-900/50 bg-indigo-950/20 px-2.5 py-1.5 text-[10px] text-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                          <span className="leading-relaxed">{t}</span>
                        </div>
                      ))}
                    </div>
                    {tasksToRender.length > 3 && (
                      <button onClick={() => setSelectedFeature(f)} className="text-[10px] text-slate-500 mt-2 hover:text-indigo-400 transition text-right font-medium w-full">
                        +{tasksToRender.length - 3} task lainnya →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating Action Bar */}
        {!loading && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
            <button
              onClick={downloadZIP}
              disabled={downloadingZip}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-slate-300 shadow-xl hover:bg-slate-800 transition-all backdrop-blur-sm disabled:opacity-50"
            >
              {downloadingZip ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Archive size={14} className="text-amber-400" />}
              Unduh ZIP
            </button>
            <button
              onClick={openHistory}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-slate-300 shadow-xl hover:bg-slate-800 transition-all backdrop-blur-sm"
            >
              <Lucide.History size={14} className="text-violet-400" />
              Riwayat Generate
            </button>
            <button
              onClick={() => setShowRevisionModal(true)}
              disabled={revising}
              className="flex items-center gap-2 rounded-xl border border-amber-700/50 bg-amber-950/70 px-4 py-2.5 text-xs font-semibold text-amber-300 shadow-xl hover:bg-amber-900/70 transition-all backdrop-blur-sm"
            >
              <Lucide.Sparkles size={14} className="text-amber-400" />
              Revisi Canvas
            </button>
            <button
              onClick={() => navigate({ to: "/app/prd" })}
              disabled={loading || revising}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-2xl shadow-indigo-900/40 transition-all"
            >
              Lanjutkan ke PRD <Lucide.ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* History Drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Lucide.History size={15} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Riwayat Generate</h3>
                  <p className="text-[10px] text-slate-500">Semua versi dokumen per section</p>
                </div>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition">
                <Lucide.X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {historyLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Lucide.Loader2 size={28} className="animate-spin text-violet-400" />
                  <p className="text-xs text-slate-500">Memuat riwayat...</p>
                </div>
              ) : (
                DOC_TYPES.map((docType) => {
                  const hist = docHistories[docType.key] ?? [];
                  const IconComp = (Lucide as any)[docType.icon] as Lucide.LucideIcon ?? Lucide.FileText;
                  return (
                    <div key={docType.key} className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                      {/* Section header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <IconComp size={13} className="text-violet-400" />
                          <span className="text-xs font-bold text-slate-200">{docType.label}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                            {hist.length} versi
                          </span>
                        </div>
                        <button
                          onClick={() => regenerateDoc(docType.key)}
                          disabled={regenLoading === docType.key}
                          className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/30 transition disabled:opacity-50"
                        >
                          {regenLoading === docType.key
                            ? <Lucide.Loader2 size={11} className="animate-spin" />
                            : <Lucide.RefreshCw size={11} />}
                          Generate Ulang
                        </button>
                      </div>

                      {/* Version list */}
                      {hist.length === 0 ? (
                        <div className="px-4 py-4 text-[11px] text-slate-600 text-center">
                          Belum ada riwayat generate
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/60">
                          {hist.map((v: any) => (
                            <div key={v.id} className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-slate-800/30 transition">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    v.isCurrent ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-400"
                                  }`}>
                                    v{v.version}{v.isCurrent ? " · Current" : ""}
                                  </span>
                                  {v.providerUsed && (
                                    <span className="text-[10px] text-slate-500">{v.providerUsed}</span>
                                  )}
                                  {v.modelUsed && (
                                    <span className="text-[10px] text-slate-600 truncate max-w-[100px]">{v.modelUsed}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                                  <Lucide.Clock size={9} />
                                  {new Date(v.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                                  {v.tokensUsed && <span>· {v.tokensUsed.toLocaleString()} tokens</span>}
                                  {v.generationTimeMs && <span>· {(v.generationTimeMs / 1000).toFixed(1)}s</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <RevisionModal
        open={showRevisionModal}
        onClose={() => !revising && setShowRevisionModal(false)}
        onSubmit={handleRevision}
        loading={revising}
      />
      <FeatureDetailModal
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
