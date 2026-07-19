import { Handle, Position, NodeToolbar } from '@xyflow/react';
import * as Lucide from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPE DEFINITIONS (exported for use in canvas page)
// ============================================================
export type PageType = 'landing' | 'auth' | 'dashboard' | 'crud' | 'detail' | 'form' | 'settings' | 'admin';
export type AuthLevel = 'public' | 'protected' | 'admin';
export type PageStatus = 'todo' | 'in-progress' | 'done';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PageItem {
  id: string;
  name: string;
  route: string;
  type: PageType;
  description: string;
  components: string[];
  authLevel: AuthLevel;
  status: PageStatus;
}

export interface ApiEndpointItem {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  authLevel: AuthLevel;
}

export interface TableItem {
  id: string;
  name: string;
  description: string;
  columns: string[];
}

export interface AppBlueprint {
  pages: PageItem[];
  apiEndpoints: ApiEndpointItem[];
  tables: TableItem[];
}

// ============================================================
// VISUAL META
// ============================================================
export const PAGE_TYPE_META: Record<PageType, { label: string; text: string; icon: Lucide.LucideIcon }> = {
  landing:   { label: 'Landing',   text: 'text-violet-300',  icon: Lucide.Globe },
  auth:      { label: 'Auth',      text: 'text-amber-300',   icon: Lucide.Lock },
  dashboard: { label: 'Dashboard', text: 'text-indigo-300',  icon: Lucide.LayoutDashboard },
  crud:      { label: 'CRUD',      text: 'text-sky-300',     icon: Lucide.Table2 },
  detail:    { label: 'Detail',    text: 'text-teal-300',    icon: Lucide.FileText },
  form:      { label: 'Form',      text: 'text-emerald-300', icon: Lucide.ClipboardEdit },
  settings:  { label: 'Settings',  text: 'text-zinc-300',    icon: Lucide.Settings2 },
  admin:     { label: 'Admin',     text: 'text-rose-300',    icon: Lucide.ShieldAlert },
};

export const AUTH_LEVEL_META: Record<AuthLevel, { label: string; dot: string; text: string }> = {
  public:    { label: 'Public',    dot: 'bg-emerald-400', text: 'text-emerald-400' },
  protected: { label: 'Protected', dot: 'bg-amber-400',   text: 'text-amber-400' },
  admin:     { label: 'Admin',     dot: 'bg-rose-400',    text: 'text-rose-400' },
};

export const STATUS_META: Record<PageStatus, { label: string; cls: string }> = {
  'todo':        { label: 'TODO',        cls: 'text-slate-400 border-slate-700 bg-slate-900/60' },
  'in-progress': { label: 'IN PROGRESS', cls: 'text-amber-400 border-amber-700/40 bg-amber-950/40' },
  'done':        { label: 'DONE',        cls: 'text-emerald-400 border-emerald-700/40 bg-emerald-950/40' },
};

export const METHOD_META: Record<HttpMethod, { cls: string }> = {
  GET:    { cls: 'text-emerald-300 bg-emerald-950/60 border-emerald-700/40' },
  POST:   { cls: 'text-sky-300 bg-sky-950/60 border-sky-700/40' },
  PUT:    { cls: 'text-amber-300 bg-amber-950/60 border-amber-700/40' },
  PATCH:  { cls: 'text-violet-300 bg-violet-950/60 border-violet-700/40' },
  DELETE: { cls: 'text-rose-300 bg-rose-950/60 border-rose-700/40' },
};

type LayerType = 'frontend' | 'backend' | 'database';

const LAYER_COLORS: Record<LayerType, {
  border: string; hoverBorder: string; icon: string; count: string;
  badge: string; glow: string; selectedBorder: string;
}> = {
  frontend: {
    border: 'border-violet-800/50', hoverBorder: 'hover:border-violet-600/70', selectedBorder: 'border-violet-500/60',
    icon: 'bg-violet-500/15 border-violet-600/30 text-violet-400',
    count: 'text-violet-300 bg-violet-950/70 border-violet-700/40',
    badge: 'bg-violet-950/50 text-violet-400 border-violet-700/40',
    glow: 'shadow-violet-900/20',
  },
  backend: {
    border: 'border-sky-800/50', hoverBorder: 'hover:border-sky-600/70', selectedBorder: 'border-sky-500/60',
    icon: 'bg-sky-500/15 border-sky-600/30 text-sky-400',
    count: 'text-sky-300 bg-sky-950/70 border-sky-700/40',
    badge: 'bg-sky-950/50 text-sky-400 border-sky-700/40',
    glow: 'shadow-sky-900/20',
  },
  database: {
    border: 'border-emerald-800/50', hoverBorder: 'hover:border-emerald-600/70', selectedBorder: 'border-emerald-500/60',
    icon: 'bg-emerald-500/15 border-emerald-600/30 text-emerald-400',
    count: 'text-emerald-300 bg-emerald-950/70 border-emerald-700/40',
    badge: 'bg-emerald-950/50 text-emerald-400 border-emerald-700/40',
    glow: 'shadow-emerald-900/20',
  },
};

const ICON_MAP: Record<string, Lucide.LucideIcon> = {
  Globe: Lucide.Globe, Lock: Lucide.Lock, LayoutDashboard: Lucide.LayoutDashboard,
  FolderOpen: Lucide.FolderOpen, FileText: Lucide.FileText, Settings2: Lucide.Settings2,
  ShieldAlert: Lucide.ShieldAlert, Server: Lucide.Server, Sparkles: Lucide.Sparkles,
  Cpu: Lucide.Cpu, Database: Lucide.Database, Users: Lucide.Users,
  Monitor: Lucide.Monitor, Table2: Lucide.Table2, ClipboardEdit: Lucide.ClipboardEdit,
};

// ============================================================
// ROOT NODE
// ============================================================
export function RootNode({ data }: { data: any }) {
  return (
    <div className="relative flex flex-col items-center gap-3 p-5 w-52 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-indigo-500/30 rounded-2xl text-center shadow-2xl shadow-indigo-900/30">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
          <Lucide.Layers size={26} />
        </div>
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border-2 border-slate-900">
          <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        </div>
      </div>
      <div className="space-y-0.5">
        <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">Application Blueprint</div>
        <div className="text-sm font-bold text-slate-100 leading-snug px-1">{data.projectName}</div>
      </div>
      <div className="grid grid-cols-3 w-full gap-1">
        {[
          { label: 'Pages',   val: data.pagesCount  || 0, cls: 'text-violet-400' },
          { label: 'APIs',    val: data.apiCount    || 0, cls: 'text-sky-400' },
          { label: 'Tables',  val: data.tablesCount || 0, cls: 'text-emerald-400' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex flex-col items-center py-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
            <span className={`text-sm font-bold ${cls}`}>{val}</span>
            <span className="text-[8px] text-slate-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-800 !border-indigo-500/60" />
    </div>
  );
}

// ============================================================
// LAYER NODE
// ============================================================
export function LayerNode({ data }: { data: any }) {
  const layerIcons: Record<string, Lucide.LucideIcon> = {
    frontend: Lucide.Monitor, backend: Lucide.Server, database: Lucide.Database,
  };
  const c = LAYER_COLORS[data.layerType as LayerType] || LAYER_COLORS.frontend;
  const Icon = layerIcons[data.layerType] || Lucide.Box;

  return (
    <div className={`relative flex flex-col items-center gap-2 px-4 py-3 w-44 bg-slate-900/80 border ${c.border} rounded-xl shadow-lg ${c.glow}`}>
      <Handle type="target" position={Position.Left}  className="!w-3 !h-3 !bg-slate-900 !border-slate-600" />
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${c.icon}`}><Icon size={18} /></div>
      <div className="text-center">
        <div className="text-xs font-bold text-slate-200">{data.label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{data.groupCount} modul · {data.itemCount} item</div>
      </div>
      <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.badge} uppercase tracking-wider`}>{data.layerType}</div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-900 !border-slate-600" />
    </div>
  );
}

// ============================================================
// GROUP NODE — The main canvas node (module summary)
// ============================================================
export function GroupNode({ data, selected }: { data: any; selected?: boolean }) {
  const c = LAYER_COLORS[data.layerType as LayerType] || LAYER_COLORS.frontend;
  const Icon = ICON_MAP[data.icon] || Lucide.Box;

  return (
    <>
      <NodeToolbar
        isVisible={selected} position={Position.Top}
        className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md"
      >
        <button onClick={data.onDetail} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition",
          data.layerType === 'frontend' ? "bg-violet-600/20 hover:bg-violet-600/40 text-violet-300" :
          data.layerType === 'backend'  ? "bg-sky-600/20 hover:bg-sky-600/40 text-sky-300" :
          "bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300"
        )}>
          <Lucide.Eye size={12} /> Lihat Detail ({data.count})
        </button>
        <button onClick={data.onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/40 hover:bg-slate-600/60 text-slate-300 text-[11px] font-bold transition">
          <Lucide.Plus size={12} /> Tambah
        </button>
      </NodeToolbar>

      <div className={cn(
        "relative flex flex-col gap-3 p-4 w-60 bg-slate-900/70 border rounded-xl cursor-pointer transition-all",
        selected ? `${c.selectedBorder} shadow-lg ${c.glow}` : `${c.border} ${c.hoverBorder}`
      )}>
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-900 !border-slate-600" />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.icon}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-slate-100 leading-tight">{data.label}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{data.description}</div>
          </div>
          <div className={cn("shrink-0 text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-lg border", c.count)}>
            {data.count}
          </div>
        </div>

        {/* Preview pills */}
        {data.previewItems && data.previewItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(data.previewItems as string[]).slice(0, 4).map((item: string, index: number) => (
              <span key={`${item}-${index}`} className="px-1.5 py-0.5 rounded text-[9px] bg-black/30 border border-white/8 text-slate-500 font-mono truncate max-w-[110px]">
                {item}
              </span>
            ))}
            {data.previewItems.length > 4 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-600">+{data.previewItems.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className={cn("text-[9px] font-bold uppercase tracking-wider", c.icon.split(' ').find(x => x.startsWith('text-')))}>
            {data.layerType}
          </span>
          <span className="text-[9px] text-slate-600 flex items-center gap-1">
            <Lucide.Eye size={9} /> klik untuk detail
          </span>
        </div>

        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-900 !border-slate-600" />
      </div>
    </>
  );
}

// ============================================================
// NODE TYPES MAP
// ============================================================
export const nodeTypes = {
  rootNode:  RootNode,
  layerNode: LayerNode,
  groupNode: GroupNode,
};
