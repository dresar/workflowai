import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

// ============================================================
// TYPES
// ============================================================
type TaskCategory = 'frontend' | 'backend' | 'database' | 'config' | 'testing' | 'deployment';
type TaskPriority = 'high' | 'medium' | 'low';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  done: boolean;
  isAiGenerated?: boolean;
}

// ============================================================
// META
// ============================================================
const CATEGORY_META: Record<TaskCategory, { label: string; dot: string; badge: string; icon: any }> = {
  frontend:   { label: 'Frontend',   dot: 'bg-violet-500', badge: 'text-violet-400 bg-violet-950/50 border-violet-700/40',  icon: Lucide.Monitor },
  backend:    { label: 'Backend',    dot: 'bg-sky-500',    badge: 'text-sky-400 bg-sky-950/50 border-sky-700/40',            icon: Lucide.Server },
  database:   { label: 'Database',   dot: 'bg-emerald-500',badge: 'text-emerald-400 bg-emerald-950/50 border-emerald-700/40',icon: Lucide.Database },
  config:     { label: 'Config',     dot: 'bg-amber-500',  badge: 'text-amber-400 bg-amber-950/50 border-amber-700/40',      icon: Lucide.Settings2 },
  testing:    { label: 'Testing',    dot: 'bg-rose-500',   badge: 'text-rose-400 bg-rose-950/50 border-rose-700/40',         icon: Lucide.TestTube2 },
  deployment: { label: 'Deployment', dot: 'bg-slate-400',  badge: 'text-slate-300 bg-slate-800/60 border-slate-700/40',      icon: Lucide.Rocket },
};

const PRIORITY_META: Record<TaskPriority, { label: string; cls: string }> = {
  high:   { label: 'Prioritas Tinggi', cls: 'text-rose-400 bg-rose-950/40 border-rose-700/40' },
  medium: { label: 'Sedang',           cls: 'text-amber-400 bg-amber-950/40 border-amber-700/40' },
  low:    { label: 'Rendah',           cls: 'text-slate-400 bg-slate-900 border-slate-700' },
};

// ============================================================
// FALLBACK TASKS
// ============================================================
const FALLBACK_TASKS: Task[] = [
  { id: 't1', title: 'Inisialisasi project & folder structure', description: 'Setup repo, install dependencies, konfigurasi TypeScript dan ESLint', category: 'config', priority: 'high', done: false, isAiGenerated: true },
  { id: 't2', title: 'Setup database connection & Drizzle ORM', description: 'Konfigurasi koneksi database, generate schema migration pertama', category: 'database', priority: 'high', done: false, isAiGenerated: true },
  { id: 't3', title: 'Buat auth system (Login + Register)', description: 'Implementasi JWT, middleware auth, route login/register', category: 'backend', priority: 'high', done: false, isAiGenerated: true },
  { id: 't4', title: 'Buat halaman Landing Page', description: 'Hero, features, pricing, CTA, dan footer section', category: 'frontend', priority: 'medium', done: false, isAiGenerated: true },
  { id: 't5', title: 'Buat halaman Dashboard', description: 'KPI cards, activity chart, dan recent projects list', category: 'frontend', priority: 'medium', done: false, isAiGenerated: true },
  { id: 't6', title: 'API CRUD untuk Projects module', description: 'GET, POST, PUT, DELETE /api/projects dengan validasi', category: 'backend', priority: 'high', done: false, isAiGenerated: true },
  { id: 't7', title: 'Buat halaman Projects List + Detail', description: 'Tabel list dengan search/filter, halaman detail dengan tab', category: 'frontend', priority: 'medium', done: false, isAiGenerated: true },
  { id: 't8', title: 'Setup Admin Panel', description: 'Protected admin routes, user management, system monitoring', category: 'backend', priority: 'low', done: false, isAiGenerated: true },
  { id: 't9', title: 'Unit testing & E2E testing', description: 'Vitest untuk unit test, Playwright untuk E2E', category: 'testing', priority: 'low', done: false, isAiGenerated: true },
  { id: 't10', title: 'Docker & deployment configuration', description: 'Dockerfile, docker-compose, CI/CD pipeline dengan GitHub Actions', category: 'deployment', priority: 'medium', done: false, isAiGenerated: true },
];

// ============================================================
// STAGE BAR
// ============================================================
function StageBar({ active }: { active: number }) {
  const stages = ["Canvas", "Tasks", "Blueprint", "Prompting"];
  return (
    <div className="flex items-center gap-1 text-[11px]">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold",
            i < active ? "border-emerald-700/40 bg-emerald-950/40 text-emerald-400" :
            i === active ? "border-indigo-500/40 bg-indigo-950/40 text-indigo-400" :
            "border-slate-800 text-slate-600"
          )}>
            {i < active && <Lucide.Check size={9} />}{s}
          </span>
          {i < stages.length - 1 && <Lucide.ChevronRight size={11} className="text-slate-700" />}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ADD TASK MODAL
// ============================================================
function AddTaskModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: Task) => void }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'frontend' as TaskCategory, priority: 'medium' as TaskPriority });
  useEffect(() => { if (!open) setForm({ title: '', description: '', category: 'frontend', priority: 'medium' }); }, [open]);
  if (!open) return null;
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Lucide.Plus size={16} className="text-indigo-400" /> Tambah Task Manual
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 transition"><Lucide.X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">JUDUL TASK *</label>
            <input autoFocus type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Contoh: Buat halaman login dengan JWT"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder-slate-600" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">DESKRIPSI (opsional)</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
              placeholder="Detail lebih lanjut tentang task ini..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none placeholder-slate-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">KATEGORI</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">PRIORITAS</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                <option value="high">🔴 Tinggi</option>
                <option value="medium">🟡 Sedang</option>
                <option value="low">🟢 Rendah</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={onClose} variant="outline" size="sm" className="text-xs border-slate-700 hover:bg-slate-800">Batal</Button>
          <Button onClick={() => {
            if (!form.title.trim()) { toast.error('Judul task wajib diisi'); return; }
            onAdd({ ...form, id: `manual-${Date.now()}`, done: false, isAiGenerated: false });
            onClose();
          }} size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white">Tambah Task</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TASK CARD
// ============================================================
function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const cat = CATEGORY_META[task.category];
  const pri = PRIORITY_META[task.priority];
  const CatIcon = cat.icon;

  return (
    <div className={cn(
      "group flex items-start gap-3 p-4 rounded-xl border transition-all",
      task.done
        ? "bg-slate-950/30 border-slate-800/40 opacity-60"
        : "bg-slate-900/60 border-slate-800/60 hover:border-slate-700/60"
    )}>
      <button onClick={onToggle} className={cn(
        "mt-0.5 shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
        task.done
          ? "bg-indigo-600 border-indigo-500"
          : "border-slate-700 hover:border-indigo-500/60 bg-transparent"
      )}>
        {task.done && <Lucide.Check size={11} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("text-sm font-semibold leading-snug", task.done ? "line-through text-slate-600" : "text-slate-100")}>
            {task.title}
          </div>
          <button onClick={onDelete} className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-950/40 transition">
            <Lucide.Trash2 size={12} />
          </button>
        </div>
        {task.description && (
          <p className={cn("text-[11px] mt-1 leading-relaxed", task.done ? "text-slate-700" : "text-slate-500")}>{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span className={cn("flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border", cat.badge)}>
            <CatIcon size={9} />{cat.label}
          </span>
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", pri.cls)}>{pri.label}</span>
          {task.isAiGenerated && (
            <span className="flex items-center gap-1 text-[9px] text-slate-600 font-medium">
              <Lucide.Sparkles size={9} className="text-slate-600" /> AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCat, setFilterCat] = useState<TaskCategory | 'all'>('all');

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Load saved tasks
  useEffect(() => {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    
    // 1. Coba load dari localStorage
    const local = localStorage.getItem(`tasks_list_${projectId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
          return;
        }
      } catch {}
    }

    // 2. Coba load dari DB
    api.projects.getDocumentByType(projectId, "tasks").then((doc) => {
      if (doc?.content) {
        try {
          const raw = doc.content;
          let parsed;
          try { const j = JSON.parse(raw); if (j?.content) { parsed = JSON.parse(j.content); } else { parsed = j; } } catch { return; }
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            localStorage.setItem(`tasks_list_${projectId}`, JSON.stringify(parsed));
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Auto-save tasks di local storage
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId || tasks.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`tasks_list_${projectId}`, JSON.stringify(tasks));
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [tasks]);

  async function handleProceedToBlueprint() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    setSavingDb(true);
    const saveToast = toast.loading("Menyimpan tasks ke database...");
    try {
      await api.projects.saveDocumentManual(projectId, "tasks", { content: JSON.stringify(tasks) });
      toast.success("Tasks berhasil disimpan ke database!", { id: saveToast });
      navigate({ to: "/app/prd" });
    } catch {
      toast.error("Gagal menyimpan tasks ke database", { id: saveToast });
    } finally {
      setSavingDb(false);
    }
  }

  async function generateFromCanvas() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) { toast.error("Tidak ada project aktif"); return; }
    setGenerating(true);
    try {
      const canvas = await api.projects.getCanvas(projectId).catch(() => null);
      const blueprintInfo = canvas?.features
        ? `Pages: ${canvas.features.pages?.map((p: any) => `${p.name} (${p.route})`).join(', ')}. API Endpoints: ${canvas.features.apiEndpoints?.map((e: any) => `${e.method} ${e.path}`).join(', ')}. Tables: ${canvas.features.tables?.map((t: any) => t.name).join(', ')}.`
        : "Tidak ada data canvas tersedia";

      const provider = localStorage.getItem("active_provider") ?? undefined;
      const result = await api.generate.tasks(projectId, { provider, blueprintInfo });

      if (result?.content) {
        try {
          // Unpack JSON wrapper jika respons dibungkus dalam object content
          let text = result.content;
          try {
            const wrapper = JSON.parse(result.content);
            if (wrapper && typeof wrapper === 'object' && wrapper.content) {
              text = wrapper.content;
            }
          } catch {}

          let parsed;
          const raw = text.replace(/```json/g, '').replace(/```/g, '').trim();
          try { parsed = JSON.parse(raw); } catch {}

          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
            setTasks(parsed.map((t: any, i: number) => ({ ...t, id: t.id || `ai-${i}-${Date.now()}`, done: false, isAiGenerated: true })));
            toast.success("Tasks berhasil digenerate oleh AI!");
          } else {
            // Fallback parsing jika AI menghasilkan format markdown teks list
            const lines = text.split('\n');
            const aiTasks: Task[] = [];
            let currentCategory: TaskCategory = 'backend';

            for (const line of lines) {
              const cleaned = line.trim();
              if (!cleaned) continue;

              const lower = cleaned.toLowerCase();
              if (lower.includes('frontend') || lower.includes('halaman') || lower.includes('tampilan')) {
                currentCategory = 'frontend';
                continue;
              } else if (lower.includes('database') || lower.includes('tabel') || lower.includes('migrasi')) {
                currentCategory = 'database';
                continue;
              } else if (lower.includes('backend') || lower.includes('api') || lower.includes('endpoint')) {
                currentCategory = 'backend';
                continue;
              }

              const taskMatch = line.match(/^(?:\d+\.|[-*])\s+(.+)/);
              if (taskMatch && taskMatch[1].length > 5) {
                aiTasks.push({ id: `ai-${aiTasks.length}-${Date.now()}`, title: taskMatch[1].trim(), category: currentCategory, priority: 'medium', done: false, isAiGenerated: true });
              }
            }

            if (aiTasks.length > 0) {
              setTasks(aiTasks);
              toast.success(`${aiTasks.length} tasks digenerate dari AI!`);
            } else {
              toast.error("Format respons AI tidak dikenali");
            }
          }
        } catch {
          toast.error("Gagal parse respons AI");
        }
      }
    } catch {
      toast.error("Gagal generate tasks dari AI");
    } finally {
      setGenerating(false);
    }
  }

  const filtered = filterCat === 'all' ? tasks : tasks.filter(t => t.category === filterCat);
  const toggleTask = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: string) => { setTasks(ts => ts.filter(t => t.id !== id)); toast.success("Task dihapus"); };
  const addTask = (t: Task) => setTasks(ts => [t, ...ts]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-5 py-2.5 backdrop-blur-md z-10 relative">
        <StageBar active={1} />
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate({ to: "/app/canvas" })} variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700">
            <Lucide.ArrowLeft size={12} /> Canvas
          </Button>
          <Button
            onClick={generateFromCanvas} disabled={generating} variant="outline" size="sm"
            className="text-[11px] h-8 gap-1.5 border-violet-700/40 text-violet-400 hover:bg-violet-950/40"
          >
            {generating ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Sparkles size={12} />}
            {generating ? "AI Membaca Canvas..." : "Generate Tasks dari Canvas"}
          </Button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition">
            <Lucide.Plus size={12} className="text-indigo-400" /> Tambah Manual
          </button>
          <Button onClick={handleProceedToBlueprint} disabled={savingDb} size="sm" className="text-[11px] h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
            {savingDb ? <Lucide.Loader2 size={12} className="animate-spin" /> : null}
            Tasks Selesai → Buat Blueprint <Lucide.ArrowRight size={12} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* Progress */}
          <div className="p-4 rounded-xl border border-border bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Progress Tasks</span>
              <span className="text-xs font-bold text-indigo-400">{done}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 text-right">{pct}% selesai</div>
          </div>

          {/* Filter */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filter Kategori</div>
            <div className="space-y-1">
              <button onClick={() => setFilterCat('all')} className={cn("w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition", filterCat === 'all' ? "bg-indigo-950/40 text-indigo-300 border border-indigo-700/30" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40")}>
                <Lucide.LayoutGrid size={12} /> Semua ({tasks.length})
              </button>
              {Object.entries(CATEGORY_META).map(([k, v]) => {
                const count = tasks.filter(t => t.category === k).length;
                const CatIcon = v.icon;
                return (
                  <button key={k} onClick={() => setFilterCat(k as TaskCategory)} className={cn("w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition", filterCat === k ? `${v.badge} border` : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40")}>
                    <CatIcon size={12} /> {v.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-auto p-3 rounded-xl bg-slate-950/30 border border-slate-800/60">
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2">Statistik</div>
            {[
              { label: 'Belum dikerjakan', val: tasks.filter(t => !t.done).length, cls: 'text-slate-400' },
              { label: 'Selesai', val: tasks.filter(t => t.done).length, cls: 'text-emerald-400' },
              { label: 'AI Generated', val: tasks.filter(t => t.isAiGenerated).length, cls: 'text-violet-400' },
              { label: 'Manual', val: tasks.filter(t => !t.isAiGenerated).length, cls: 'text-sky-400' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between items-center py-1 text-[10px]">
                <span className="text-slate-600">{label}</span>
                <span className={`font-bold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main List */}
        <main className="flex-1 overflow-y-auto p-6">
          {generating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <Lucide.Loader2 size={40} className="animate-spin text-violet-500" />
                <div className="absolute -inset-4 rounded-full border border-violet-500/20 animate-ping" />
              </div>
              <p className="text-sm text-slate-400 font-medium">AI sedang membaca canvas dan menyusun tasks...</p>
              <p className="text-xs text-slate-600">Menganalisis semua halaman, API endpoint, dan tabel database</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                <Lucide.ClipboardList size={28} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">Belum ada tasks</p>
                <p className="text-xs text-slate-600 mt-1">Klik "Generate Tasks dari Canvas" untuk mulai, atau tambahkan manual</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={generateFromCanvas} size="sm" className="text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                  <Lucide.Sparkles size={13} /> Generate dari Canvas
                </Button>
                <Button onClick={() => setShowAddModal(true)} variant="outline" size="sm" className="text-xs border-slate-700 gap-1.5">
                  <Lucide.Plus size={13} /> Tambah Manual
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-sm font-bold text-slate-300">
                  {filterCat === 'all' ? 'Semua Tasks' : CATEGORY_META[filterCat].label}
                  <span className="ml-2 text-slate-600 font-normal">({filtered.length})</span>
                </h1>
                <button onClick={() => setTasks(ts => ts.map(t => ({ ...t, done: done < total })))} className="text-[10px] text-slate-500 hover:text-slate-300 transition font-medium">
                  {done < total ? "Centang semua" : "Hapus semua centang"}
                </button>
              </div>
              {filtered.map(task => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
              ))}
            </div>
          )}
        </main>
      </div>

      <AddTaskModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addTask} />
    </div>
  );
}
