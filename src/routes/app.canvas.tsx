import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState,
  BackgroundVariant, Node, Edge, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  nodeTypes, type AppBlueprint, type PageItem, type ApiEndpointItem, type TableItem,
  type PageStatus, type HttpMethod, PAGE_TYPE_META, AUTH_LEVEL_META, STATUS_META, METHOD_META,
} from "./-canvas-nodes";

export const Route = createFileRoute("/app/canvas")({ component: CanvasPage });

// ============================================================
// FALLBACK BLUEPRINT
// ============================================================
const FALLBACK_BLUEPRINT: AppBlueprint = {
  pages: [
    // Public & Auth
    { id: 'p1',   name: 'Landing Page',       route: '/',                              type: 'landing',   description: 'Halaman landing dengan Hero section, Fitur utama, dan tombol registrasi.', components: ['Navbar', 'HeroSection', 'FeaturesGrid', 'CTABanner', 'Footer'], authLevel: 'public', status: 'todo' },
    { id: 'p2',   name: 'Login',              route: '/auth/login',                    type: 'auth',      description: 'Halaman login pengguna dengan email dan password.', components: ['LoginForm', 'SocialLoginButtons'], authLevel: 'public', status: 'todo' },
    { id: 'p3',   name: 'Register',           route: '/auth/register',                 type: 'auth',      description: 'Halaman pendaftaran pengguna baru.', components: ['RegisterForm'], authLevel: 'public', status: 'todo' },
    // App Core
    { id: 'p4',   name: 'Dashboard',          route: '/app/dashboard',                 type: 'dashboard', description: 'Dashboard utama menampilkan ringkasan data, matriks KPI, dan navigasi cepat.', components: ['KPICards', 'RecentActivityList', 'QuickActions'], authLevel: 'protected', status: 'todo' },
    { id: 'p5',   name: 'Profile Settings',    route: '/app/settings',                  type: 'settings',  description: 'Pengaturan profil: nama, foto profil, dan ganti password.', components: ['ProfileForm', 'PasswordChangeForm'], authLevel: 'protected', status: 'todo' },
  ],
  apiEndpoints: [
    // Auth & Users
    { id: 'a1',  method: 'POST',   path: '/api/v1/auth/register',                description: 'Pendaftaran user baru, return access_token JWT', authLevel: 'public' },
    { id: 'a2',  method: 'POST',   path: '/api/v1/auth/login',                   description: 'Login dengan email + password, return JWT token', authLevel: 'public' },
    { id: 'a3',  method: 'GET',    path: '/api/v1/user/profile',                 description: 'Mengambil data profil pengguna aktif', authLevel: 'protected' },
    { id: 'a4',  method: 'PUT',    path: '/api/v1/user/profile',                 description: 'Memperbarui data profil pengguna', authLevel: 'protected' },
  ],
  tables: [
    // Database Tables
    { id: 't1',   name: 'users',               description: 'Data pengguna utama: email, password_hash, dan profile metadata', columns: ['id uuid PK', 'email varchar UNIQUE', 'name varchar', 'password_hash text', 'created_at timestamptz', 'updated_at timestamptz'] },
    { id: 't2',   name: 'user_settings',       description: 'Konfigurasi preferensi pengguna seperti tema dan bahasa', columns: ['id uuid PK', 'user_id FK→users UNIQUE', 'theme varchar', 'notifications_enabled bool', 'updated_at timestamptz'] },
  ]
};


// ============================================================
// GROUP DEFINITIONS
// ============================================================
interface GroupDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  filter: {
    pages?: (p: PageItem) => boolean;
    endpoints?: (e: ApiEndpointItem) => boolean;
    tables?: (t: TableItem) => boolean;
  };
}

const FRONTEND_GROUPS: GroupDef[] = [
  { id: 'fg-public',   label: 'Public & Auth',   description: 'Landing, login, register, forgot & reset password', icon: 'Globe', filter: { pages: (p) => p.authLevel === 'public' || p.route.startsWith('/auth/') } },
  { id: 'fg-core',     label: 'App Core',        description: 'Dashboard, canvas blueprint, tasks, AI prompts', icon: 'LayoutDashboard', filter: { pages: (p) => ['/app/dashboard','/app/canvas','/app/tasks','/app/prompt'].some(r => p.route.startsWith(r)) } },
  { id: 'fg-projects', label: 'Projects CRUD',   description: 'List, create form, detail view, edit form, delete modal', icon: 'FolderOpen', filter: { pages: (p) => p.route.startsWith('/app/projects') } },
  { id: 'fg-docs',     label: 'Documents',       description: 'Grid dokumen AI dan markdown viewer dengan version history', icon: 'FileText', filter: { pages: (p) => p.route.includes('/documents') } },
  { id: 'fg-settings', label: 'Settings',        description: 'Profile, keamanan & sessions, preferensi AI', icon: 'Settings2', filter: { pages: (p) => p.route.startsWith('/app/settings') } },
  { id: 'fg-admin',    label: 'Admin Pages',     description: 'Dashboard, users, providers, monitoring, settings, tech', icon: 'ShieldAlert', filter: { pages: (p) => p.authLevel === 'admin' } },
];

const BACKEND_GROUPS: GroupDef[] = [
  { id: 'bg-auth',     label: 'Auth Module',        description: '10 endpoint: register, login, logout, refresh, sessions...', icon: 'Lock', filter: { endpoints: (e) => e.path.includes('/auth/') } },
  { id: 'bg-projects', label: 'Projects & Docs',    description: '17 endpoint: CRUD, canvas, documents, tech stack, answers', icon: 'FolderOpen', filter: { endpoints: (e) => e.path.match(/\/projects/) !== null } },
  { id: 'bg-generate', label: 'AI Generate',        description: '7 endpoint: canvas, prd, architecture, database, api, tasks, prompt', icon: 'Sparkles', filter: { endpoints: (e) => e.path.includes('/generate/') } },
  { id: 'bg-public',   label: 'Public APIs',        description: '3 endpoint: technologies, categories, interview questions', icon: 'Globe', filter: { endpoints: (e) => e.authLevel === 'public' && !e.path.includes('/auth/') && !e.path.includes('/generate/') } },
  { id: 'bg-admin',    label: 'Admin Module',       description: '20 endpoint: users, providers, API keys, monitoring, settings', icon: 'ShieldAlert', filter: { endpoints: (e) => e.path.includes('/admin/') } },
];

const DATABASE_GROUPS: GroupDef[] = [
  { id: 'dg-users',     label: 'Users Cluster',        description: 'users · sessions · profiles · resets · verifications · notifications', icon: 'Users', filter: { tables: (t) => t.id.startsWith('t1') } },
  { id: 'dg-projects',  label: 'Projects Cluster',     description: 'projects · answers · canvas · technologies (M:M)', icon: 'FolderOpen', filter: { tables: (t) => t.id.startsWith('t2') } },
  { id: 'dg-documents', label: 'Documents Cluster',    description: 'generated_documents · document_history (versioning)', icon: 'FileText', filter: { tables: (t) => t.id.startsWith('t3') } },
  { id: 'dg-providers', label: 'AI Providers Cluster', description: 'ai_providers · api_keys (encrypted) · ai_usage_logs', icon: 'Cpu', filter: { tables: (t) => t.id.startsWith('t4') } },
  { id: 'dg-system',    label: 'System Config Cluster',description: 'technologies · questions · templates · settings · logs', icon: 'Settings2', filter: { tables: (t) => t.id.startsWith('t5') } },
];

// ============================================================
// LAYOUT ALGORITHM — 3-level tree, compact
// ============================================================
const COL_ROOT  = 50;
const COL_LAYER = 340;
const COL_GROUP = 620;
const ROW_H     = 115;  // vertical space per group node
const LAYER_GAP = 70;   // gap between layers

function buildGraph(
  blueprint: AppBlueprint, projectName: string,
  onGroupDetail: (groupId: string) => void,
  onGroupAdd: (groupId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Track assigned items
  const assignedPages = new Set<string>();
  const assignedEndpoints = new Set<string>();
  const assignedTables = new Set<string>();

  // 1. Resolve Frontend Groups
  const resolvedFE = FRONTEND_GROUPS.map(g => {
    const pages = blueprint.pages.filter(p => {
      if (assignedPages.has(p.id)) return false;
      return g.filter.pages ? g.filter.pages(p) : false;
    });
    pages.forEach(p => assignedPages.add(p.id));

    return {
      ...g,
      pages,
      endpoints: [] as ApiEndpointItem[],
      tables: [] as TableItem[],
      count: pages.length,
      preview: pages.map(p => p.name),
    };
  }).filter(g => g.count > 0);

  // Catch unassigned pages into fallback group
  const unassignedPages = blueprint.pages.filter(p => !assignedPages.has(p.id));
  if (unassignedPages.length > 0) {
    resolvedFE.push({
      id: 'fg-features',
      label: 'Feature Modules',
      description: 'Modul dan halaman fitur utama aplikasi',
      icon: 'LayoutDashboard',
      filter: {},
      pages: unassignedPages,
      endpoints: [],
      tables: [],
      count: unassignedPages.length,
      preview: unassignedPages.map(p => p.name),
    });
  }

  // 2. Resolve Backend Groups
  const resolvedBE = BACKEND_GROUPS.map(g => {
    const endpoints = blueprint.apiEndpoints.filter(e => {
      if (assignedEndpoints.has(e.id)) return false;
      return g.filter.endpoints ? g.filter.endpoints(e) : false;
    });
    endpoints.forEach(e => assignedEndpoints.add(e.id));

    return {
      ...g,
      pages: [] as PageItem[],
      endpoints,
      tables: [] as TableItem[],
      count: endpoints.length,
      preview: endpoints.map(e => e.path),
    };
  }).filter(g => g.count > 0);

  // Catch unassigned endpoints into fallback group
  const unassignedEndpoints = blueprint.apiEndpoints.filter(e => !assignedEndpoints.has(e.id));
  if (unassignedEndpoints.length > 0) {
    resolvedBE.push({
      id: 'bg-core-services',
      label: 'Core REST APIs',
      description: 'Endpoint layanan backend dan pengolahan data',
      icon: 'Sparkles',
      filter: {},
      pages: [],
      endpoints: unassignedEndpoints,
      tables: [],
      count: unassignedEndpoints.length,
      preview: unassignedEndpoints.map(e => `${e.method} ${e.path}`),
    });
  }

  // 3. Resolve Database Groups
  const resolvedDB = DATABASE_GROUPS.map(g => {
    const tables = blueprint.tables.filter(t => {
      if (assignedTables.has(t.id)) return false;
      return g.filter.tables ? g.filter.tables(t) : false;
    });
    tables.forEach(t => assignedTables.add(t.id));

    return {
      ...g,
      pages: [] as PageItem[],
      endpoints: [] as ApiEndpointItem[],
      tables,
      count: tables.length,
      preview: tables.map(t => t.name),
    };
  }).filter(g => g.count > 0);

  // Catch unassigned tables into fallback group
  const unassignedTables = blueprint.tables.filter(t => !assignedTables.has(t.id));
  if (unassignedTables.length > 0) {
    resolvedDB.push({
      id: 'dg-entity-tables',
      label: 'Database Schema',
      description: 'Tabel database dan relasi entity relational model',
      icon: 'Database',
      filter: {},
      pages: [],
      endpoints: [],
      tables: unassignedTables,
      count: unassignedTables.length,
      preview: unassignedTables.map(t => t.name),
    });
  }

  // Y layout
  let yOffset = 0;

  function placeLayer(
    layerId: string, layerType: 'frontend' | 'backend' | 'database',
    layerLabel: string, groups: typeof resolvedFE
  ) {
    if (groups.length === 0) return;
    const layerStartY = yOffset;

    groups.forEach((g, i) => {
      const y = yOffset + i * ROW_H;
      nodes.push({
        id: g.id, type: 'groupNode', position: { x: COL_GROUP, y },
        data: {
          label: g.label, description: g.description, icon: g.icon,
          layerType, count: g.count, previewItems: g.preview,
          onDetail: () => onGroupDetail(g.id),
          onAdd:    () => onGroupAdd(g.id),
        },
      });
      edges.push({
        id: `e-${layerId}-${g.id}`, source: layerId, target: g.id,
        type: 'smoothstep', animated: false,
        style: { stroke: layerType === 'frontend' ? '#7c3aed' : layerType === 'backend' ? '#0ea5e9' : '#10b981', strokeWidth: 1.5, opacity: 0.6 },
      });
    });

    const layerCenterY = layerStartY + ((groups.length - 1) * ROW_H) / 2;
    const totalItems = groups.reduce((s, g) => s + g.count, 0);
    nodes.push({
      id: layerId, type: 'layerNode', position: { x: COL_LAYER, y: layerCenterY - 40 },
      data: { layerType, label: layerLabel, groupCount: groups.length, itemCount: totalItems },
    });
    edges.push({
      id: `e-root-${layerId}`, source: 'root', target: layerId, type: 'smoothstep', animated: true,
      style: { stroke: layerType === 'frontend' ? '#7c3aed' : layerType === 'backend' ? '#0ea5e9' : '#10b981', strokeWidth: 2 },
    });

    yOffset += groups.length * ROW_H + LAYER_GAP;
  }

  placeLayer('layer-frontend', 'frontend', 'Frontend Layer', resolvedFE);
  placeLayer('layer-backend',  'backend',  'Backend Layer',  resolvedBE);
  placeLayer('layer-database', 'database', 'Database Layer', resolvedDB);

  const totalH = yOffset - LAYER_GAP;
  const rootY  = totalH / 2 - 88;

  nodes.push({
    id: 'root', type: 'rootNode', position: { x: COL_ROOT, y: rootY },
    data: {
      projectName,
      pagesCount:   blueprint.pages.length,
      apiCount:     blueprint.apiEndpoints.length,
      tablesCount:  blueprint.tables.length,
    },
  });

  return { nodes, edges };
}

// ============================================================
// GROUP DETAIL MODAL
// ============================================================
function resolveGroupDef(groupId: string, blueprint: AppBlueprint) {
  if (!groupId) return null;

  const staticGroups = [...FRONTEND_GROUPS, ...BACKEND_GROUPS, ...DATABASE_GROUPS];
  const staticMatch = staticGroups.find(g => g.id === groupId);

  if (staticMatch) {
    const pages = staticMatch.filter.pages ? blueprint.pages.filter(staticMatch.filter.pages) : [];
    const endpoints = staticMatch.filter.endpoints ? blueprint.apiEndpoints.filter(staticMatch.filter.endpoints) : [];
    const tables = staticMatch.filter.tables ? blueprint.tables.filter(staticMatch.filter.tables) : [];
    const layerType = groupId.startsWith('fg') ? 'frontend' : groupId.startsWith('bg') ? 'backend' : 'database';

    return {
      id: staticMatch.id,
      label: staticMatch.label,
      description: staticMatch.description,
      icon: staticMatch.icon,
      layerType: layerType as 'frontend' | 'backend' | 'database',
      pages,
      endpoints,
      tables,
    };
  }

  if (groupId === 'fg-features') {
    return {
      id: 'fg-features',
      label: 'Feature Modules',
      description: 'Modul dan halaman fitur utama aplikasi',
      icon: 'LayoutDashboard',
      layerType: 'frontend' as const,
      pages: blueprint.pages,
      endpoints: [],
      tables: [],
    };
  }

  if (groupId === 'bg-core-services') {
    return {
      id: 'bg-core-services',
      label: 'Core REST APIs',
      description: 'Endpoint layanan backend dan pengolahan data',
      icon: 'Sparkles',
      layerType: 'backend' as const,
      pages: [],
      endpoints: blueprint.apiEndpoints,
      tables: [],
    };
  }

  if (groupId === 'dg-entity-tables') {
    return {
      id: 'dg-entity-tables',
      label: 'Database Schema',
      description: 'Tabel database dan relasi entity relational model',
      icon: 'Database',
      layerType: 'database' as const,
      pages: [],
      endpoints: [],
      tables: blueprint.tables,
    };
  }

  return null;
}

// ============================================================
// GROUP DETAIL MODAL (WITH EDIT & DELETE ITEMS)
// ============================================================
function GroupDetailModal({
  groupId, blueprint, onClose, setBlueprint,
}: {
  groupId: string | null;
  blueprint: AppBlueprint;
  onClose: () => void;
  setBlueprint: React.Dispatch<React.SetStateAction<AppBlueprint>>;
}) {
  if (!groupId) return null;

  const groupDef = resolveGroupDef(groupId, blueprint);
  if (!groupDef) return null;

  const { layerType, pages, endpoints, tables } = groupDef;
  const [editingItem, setEditingItem] = useState<{ type: 'page' | 'endpoint' | 'table'; item: any } | null>(null);

  const colors = {
    frontend: { header: 'border-violet-700/40 bg-violet-950/20', badge: 'bg-violet-950/60 text-violet-300 border-violet-700/40', ring: 'border-violet-500/30' },
    backend:  { header: 'border-sky-700/40 bg-sky-950/20',       badge: 'bg-sky-950/60 text-sky-300 border-sky-700/40',           ring: 'border-sky-500/30' },
    database: { header: 'border-emerald-700/40 bg-emerald-950/20', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40', ring: 'border-emerald-500/30' },
  }[layerType];

  const handleDeleteItem = (itemType: 'page' | 'endpoint' | 'table', id: string) => {
    setBlueprint(prev => {
      const next = { ...prev };
      if (itemType === 'page') {
        next.pages = next.pages.filter(p => p.id !== id);
      } else if (itemType === 'endpoint') {
        next.apiEndpoints = next.apiEndpoints.filter(e => e.id !== id);
      } else {
        next.tables = next.tables.filter(t => t.id !== id);
      }
      return next;
    });
    toast.success("Item berhasil dihapus!");
  };

  const handleSaveEdit = (edited: any) => {
    if (!editingItem) return;
    setBlueprint(prev => {
      const next = { ...prev };
      if (editingItem.type === 'page') {
        next.pages = next.pages.map(p => p.id === edited.id ? edited : p);
      } else if (editingItem.type === 'endpoint') {
        next.apiEndpoints = next.apiEndpoints.map(e => e.id === edited.id ? edited : e);
      } else {
        next.tables = next.tables.map(t => t.id === edited.id ? edited : t);
      }
      return next;
    });
    setEditingItem(null);
    toast.success("Item berhasil diperbarui!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-2xl max-h-[85vh] rounded-2xl border ${colors.ring} bg-slate-900 shadow-2xl flex flex-col overflow-hidden`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.header}`}>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{groupDef.label}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{groupDef.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${colors.badge}`}>
              {pages.length + endpoints.length + tables.length} items
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 transition"><Lucide.X size={16} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pages.length === 0 && endpoints.length === 0 && tables.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              Belum ada item dalam grup ini.
            </div>
          )}

          {/* Pages */}
          {pages.map(page => {
            const meta = PAGE_TYPE_META[page.type] || PAGE_TYPE_META.crud;
            const Icon = meta.icon;
            const auth = AUTH_LEVEL_META[page.authLevel] || AUTH_LEVEL_META.protected;
            const status = STATUS_META[page.status] || STATUS_META.todo;
            const isEditing = editingItem?.type === 'page' && editingItem.item.id === page.id;

            if (isEditing) {
              return (
                <div key={page.id} className="p-4 rounded-xl bg-slate-950 border border-violet-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-300">Edit Halaman Frontend</span>
                    <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-white"><Lucide.X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={editingItem.item.name} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, name: e.target.value } }))} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white" placeholder="Nama Halaman" />
                    <input type="text" value={editingItem.item.route} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, route: e.target.value } }))} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white" placeholder="Route / Path" />
                  </div>
                  <textarea value={editingItem.item.description} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, description: e.target.value } }))} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white resize-none" placeholder="Deskripsi" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="text-xs">Batal</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(editingItem.item)} className="text-xs bg-violet-600 hover:bg-violet-500">Simpan Perubahan</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={page.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/60 transition group">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-700/30">
                  <Icon size={15} className={meta.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-slate-100">{page.name}</span>
                    <code className="text-[10px] text-slate-500 font-mono">{page.route}</code>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{page.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setEditingItem({ type: 'page', item: { ...page } })} className="p-1 rounded text-slate-400 hover:text-violet-300 hover:bg-violet-950/50" title="Edit Halaman"><Lucide.Pencil size={13} /></button>
                  <button onClick={() => handleDeleteItem('page', page.id)} className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/50" title="Hapus Halaman"><Lucide.Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}

          {/* Endpoints */}
          {endpoints.map(ep => {
            const m = METHOD_META[ep.method] || METHOD_META.GET;
            const a = AUTH_LEVEL_META[ep.authLevel] || AUTH_LEVEL_META.protected;
            const isEditing = editingItem?.type === 'endpoint' && editingItem.item.id === ep.id;

            if (isEditing) {
              return (
                <div key={ep.id} className="p-4 rounded-xl bg-slate-950 border border-sky-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">Edit API Endpoint</span>
                    <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-white"><Lucide.X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={editingItem.item.method} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, method: e.target.value as HttpMethod } }))} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white">
                      <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option>
                    </select>
                    <input type="text" value={editingItem.item.path} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, path: e.target.value } }))} className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white" placeholder="Path /api/v1/..." />
                  </div>
                  <textarea value={editingItem.item.description} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, description: e.target.value } }))} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white resize-none" placeholder="Deskripsi API" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="text-xs">Batal</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(editingItem.item)} className="text-xs bg-sky-600 hover:bg-sky-500">Simpan Perubahan</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={ep.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/60 transition">
                <span className={`shrink-0 text-[11px] font-black px-2.5 py-1 rounded border ${m.cls} min-w-[52px] text-center`}>{ep.method}</span>
                <div className="flex-1 min-w-0">
                  <code className="text-[11px] font-bold text-slate-200 break-all">{ep.path}</code>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{ep.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setEditingItem({ type: 'endpoint', item: { ...ep } })} className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-sky-950/50" title="Edit Endpoint"><Lucide.Pencil size={13} /></button>
                  <button onClick={() => handleDeleteItem('endpoint', ep.id)} className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/50" title="Hapus Endpoint"><Lucide.Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}

          {/* Tables */}
          {tables.map(table => {
            const isEditing = editingItem?.type === 'table' && editingItem.item.id === table.id;

            if (isEditing) {
              return (
                <div key={table.id} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Edit Tabel Database</span>
                    <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-white"><Lucide.X size={14} /></button>
                  </div>
                  <input type="text" value={editingItem.item.name} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, name: e.target.value } }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white" placeholder="Nama Tabel" />
                  <textarea value={editingItem.item.description} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, description: e.target.value } }))} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white resize-none" placeholder="Deskripsi Tabel" />
                  <input type="text" value={Array.isArray(editingItem.item.columns) ? editingItem.item.columns.join(', ') : editingItem.item.columns} onChange={e => setEditingItem(prev => ({ ...prev!, item: { ...prev!.item, columns: e.target.value.split(',').map((c: string) => c.trim()).filter(Boolean) } }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white" placeholder="Kolom (pisahkan dengan koma)" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="text-xs">Batal</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(editingItem.item)} className="text-xs bg-emerald-600 hover:bg-emerald-500">Simpan Perubahan</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={table.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-emerald-950/40 hover:border-emerald-900/40 transition">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-700/30">
                  <Lucide.Table2 size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[12px] font-bold text-emerald-300">{table.name}</code>
                    <span className="text-[9px] text-slate-600">{table.columns.length} kolom</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{table.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {table.columns.slice(0, 5).map((c: string) => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400/70 font-mono">{c}</span>)}
                    {table.columns.length > 5 && <span className="text-[9px] text-slate-600">+{table.columns.length - 5}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setEditingItem({ type: 'table', item: { ...table } })} className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/50" title="Edit Tabel"><Lucide.Pencil size={13} /></button>
                  <button onClick={() => handleDeleteItem('table', table.id)} className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/50" title="Hapus Tabel"><Lucide.Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADD ITEM GROUP MODAL (AI & MANUAL)
// ============================================================
function AddItemGroupModal({
  groupId, blueprint, onClose, onSaveManual, onSaveAi, aiLoading
}: {
  groupId: string | null;
  blueprint: AppBlueprint;
  onClose: () => void;
  onSaveManual: (layerType: 'frontend' | 'backend' | 'database', newItem: any) => void;
  onSaveAi: (prompt: string) => Promise<void>;
  aiLoading: boolean;
}) {
  if (!groupId) return null;

  const groupDef = resolveGroupDef(groupId, blueprint);
  if (!groupDef) return null;

  const { layerType } = groupDef;

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');

  // Form states
  const [pageForm, setPageForm] = useState({ name: '', route: '/', type: 'crud' as PageItem['type'], description: '', components: '', authLevel: 'protected' as PageItem['authLevel'] });
  const [apiForm, setApiForm] = useState({ method: 'GET' as HttpMethod, path: '/api/v1/', description: '', authLevel: 'protected' as PageItem['authLevel'] });
  const [tableForm, setTableForm] = useState({ name: '', description: '', columns: '' });

  const colors = {
    frontend: { border: 'border-violet-700/40', accent: 'bg-violet-600 hover:bg-violet-500', tabActive: 'border-violet-500 text-violet-400', text: 'text-violet-300', textMuted: 'text-violet-400/60' },
    backend:  { border: 'border-sky-700/40',    accent: 'bg-sky-600 hover:bg-sky-500',    tabActive: 'border-sky-500 text-sky-400',       text: 'text-sky-300',    textMuted: 'text-sky-400/60' },
    database: { border: 'border-emerald-700/40',accent: 'bg-emerald-600 hover:bg-emerald-500',tabActive: 'border-emerald-500 text-emerald-400',text: 'text-emerald-300',textMuted: 'text-emerald-400/60' },
  }[layerType];

  const handleManualSubmit = () => {
    if (layerType === 'frontend') {
      if (!pageForm.name.trim()) return toast.error('Nama halaman wajib diisi');
      const newPage: PageItem = {
        id: `p-${Date.now()}`,
        name: pageForm.name,
        route: pageForm.route,
        type: pageForm.type,
        description: pageForm.description,
        components: pageForm.components.split(',').map(c => c.trim()).filter(Boolean),
        authLevel: pageForm.authLevel,
        status: 'todo',
      };
      onSaveManual('frontend', newPage);
    } else if (layerType === 'backend') {
      if (!apiForm.path.trim()) return toast.error('Path API wajib diisi');
      const newApi: ApiEndpointItem = {
        id: `a-${Date.now()}`,
        method: apiForm.method,
        path: apiForm.path,
        description: apiForm.description,
        authLevel: apiForm.authLevel,
      };
      onSaveManual('backend', newApi);
    } else {
      if (!tableForm.name.trim()) return toast.error('Nama tabel wajib diisi');
      const newTable: TableItem = {
        id: `t-${Date.now()}`,
        name: tableForm.name,
        description: tableForm.description,
        columns: tableForm.columns.split(',').map(c => c.trim()).filter(Boolean),
      };
      onSaveManual('database', newTable);
    }
    onClose();
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return toast.error('Perintah AI wajib diisi');
    const enrichedPrompt = `Pada grup "${groupDef.label}" di layer ${layerType.toUpperCase()} (${groupDef.description}), tolong tambahkan item baru dengan instruksi spesifik ini: "${aiPrompt}". Pastikan tetap mempertahankan data blueprint JSON yang ada sebelumnya, jangan menghapus item yang sudah ada, cukup tambahkan item baru yang relevan dengan instruksi tersebut.`;
    await onSaveAi(enrichedPrompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !aiLoading && onClose()} />
      <div className={`relative z-10 w-full max-w-md rounded-2xl border ${colors.border} bg-slate-900 shadow-2xl p-6 flex flex-col gap-4 overflow-hidden`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Lucide.PlusCircle size={16} className={colors.text} />
              Tambah ke: {groupDef.label}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{groupDef.description}</p>
          </div>
          <button onClick={() => !aiLoading && onClose()} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 transition"><Lucide.X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/80">
          <button onClick={() => setActiveTab('ai')} className={cn("flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all", activeTab === 'ai' ? colors.tabActive : "border-transparent text-slate-500 hover:text-slate-300")}>
            🤖 Tambah dengan AI
          </button>
          <button onClick={() => setActiveTab('manual')} className={cn("flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all", activeTab === 'manual' ? colors.tabActive : "border-transparent text-slate-500 hover:text-slate-300")}>
            ✏️ Tambah Manual
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 py-2">
          {activeTab === 'ai' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">PERINTAH AI (BISA MENGGUNAKAN BAHASA INDONESIA)</label>
                <textarea
                  value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  disabled={aiLoading} rows={4} autoFocus
                  placeholder="Contoh: Tambahkan modul laporan export PDF untuk dashboard admin..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                ✨ AI akan mendeteksi tipe layer ({layerType.toUpperCase()}) dan grup target secara otomatis, lalu menyusun blueprint baru dengan item tambahan Anda.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                <Button onClick={onClose} variant="outline" size="sm" disabled={aiLoading} className="text-xs border-slate-700 hover:bg-slate-800">Batal</Button>
                <Button onClick={handleAiSubmit} disabled={aiLoading || !aiPrompt.trim()} size="sm" className={cn("text-xs text-white gap-1.5", colors.accent)}>
                  {aiLoading ? <><Lucide.Loader2 size={13} className="animate-spin" /> Sedang Menambahkan...</> : <><Lucide.Sparkles size={13} /> Tambah dengan AI</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {layerType === 'frontend' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">NAMA HALAMAN *</label>
                    <input type="text" value={pageForm.name} onChange={e => setPageForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none" placeholder="Contoh: Admin Backup" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">ROUTE URL</label>
                    <input type="text" value={pageForm.route} onChange={e => setPageForm(f => ({ ...f, route: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none" placeholder="Contoh: /admin/backup" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">TIPE HALAMAN</label>
                      <select value={pageForm.type} onChange={e => setPageForm(f => ({ ...f, type: e.target.value as PageItem['type'] }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                        {Object.entries(PAGE_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">AUTH LEVEL</label>
                      <select value={pageForm.authLevel} onChange={e => setPageForm(f => ({ ...f, authLevel: e.target.value as PageItem['authLevel'] }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                        <option value="public">🟢 Public</option>
                        <option value="protected">🟡 Protected</option>
                        <option value="admin">🔴 Admin Only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">DESKRIPSI</label>
                    <textarea value={pageForm.description} onChange={e => setPageForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none resize-none" placeholder="Deskripsi halaman..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">KOMPONEN (PISAH DENGAN KOMA)</label>
                    <input type="text" value={pageForm.components} onChange={e => setPageForm(f => ({ ...f, components: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none" placeholder="Contoh: BackupTable, RestoreButton, LogViewer" />
                  </div>
                </>
              )}

              {layerType === 'backend' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">METHOD</label>
                      <select value={apiForm.method} onChange={e => setApiForm(f => ({ ...f, method: e.target.value as HttpMethod }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">AUTH LEVEL</label>
                      <select value={apiForm.authLevel} onChange={e => setApiForm(f => ({ ...f, authLevel: e.target.value as PageItem['authLevel'] }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none">
                        <option value="public">🟢 Public</option>
                        <option value="protected">🟡 Protected</option>
                        <option value="admin">🔴 Admin Only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">PATH API *</label>
                    <input type="text" value={apiForm.path} onChange={e => setApiForm(f => ({ ...f, path: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none" placeholder="Contoh: /api/v1/admin/backup" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">DESKRIPSI</label>
                    <textarea value={apiForm.description} onChange={e => setApiForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none resize-none" placeholder="Deskripsi endpoint..." />
                  </div>
                </>
              )}

              {layerType === 'database' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">NAMA TABEL *</label>
                    <input type="text" value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none" placeholder="Contoh: system_backups" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">DESKRIPSI</label>
                    <textarea value={tableForm.description} onChange={e => setTableForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none resize-none" placeholder="Deskripsi tabel..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">KOLOM (PISAH DENGAN KOMA)</label>
                    <textarea value={tableForm.columns} onChange={e => setTableForm(f => ({ ...f, columns: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 focus:outline-none resize-none" placeholder="Contoh: id uuid PK, filename varchar, size_bytes int, status varchar, created_at" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                <Button onClick={onClose} variant="outline" size="sm" className="text-xs border-slate-700 hover:bg-slate-800">Batal</Button>
                <Button onClick={handleManualSubmit} size="sm" className={cn("text-xs text-white gap-1.5", colors.accent)}>
                  <Lucide.Check size={13} /> Simpan Item
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
            i < active  ? "border-emerald-700/40 bg-emerald-950/40 text-emerald-400" :
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
// MAIN PAGE
// ============================================================
function CanvasPage() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Proyek Aplikasi");
  const [blueprint, setBlueprint]     = useState<AppBlueprint>(FALLBACK_BLUEPRINT);
  const [loading, setLoading]         = useState(true);
  const [revising, setRevising]       = useState(false);
  const [savingDb, setSavingDb]       = useState(false);
  const [revisionText, setRevisionText] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [addGroupId, setAddGroupId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [hasNoBlueprint, setHasNoBlueprint] = useState(false);
  const [generatingInitial, setGeneratingInitial] = useState(false);

  const onGroupDetail = useCallback((id: string) => setDetailGroupId(id), []);
  const onGroupAdd    = useCallback((id: string) => setAddGroupId(id), []);

  useEffect(() => {
    if (hasNoBlueprint) return;
    const { nodes: n, edges: e } = buildGraph(blueprint, projectName, onGroupDetail, onGroupAdd);
    setNodes(n); setEdges(e);
  }, [blueprint, projectName, onGroupDetail, onGroupAdd, hasNoBlueprint]);

function parseAiContentToBlueprint(rawContent: string): AppBlueprint | null {
  if (!rawContent) return null;
  let content = rawContent.trim();
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    content = jsonMatch[1].trim();
  } else {
    const objectMatch = content.match(/\{[\s\S]*\}/);
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (objectMatch && (!arrayMatch || objectMatch.index! < arrayMatch.index!)) {
      content = objectMatch[0];
    } else if (arrayMatch) {
      content = arrayMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(content);
    return normalizeToAppBlueprint(parsed);
  } catch (err) {
    console.error("Failed to parse AI content as JSON:", err);
    return null;
  }
}

function normalizeToAppBlueprint(raw: any): AppBlueprint {
  if (!raw) return FALLBACK_BLUEPRINT;

  // Case 1: Raw is already AppBlueprint with pages
  if (raw.pages && Array.isArray(raw.pages) && raw.pages.length > 0) {
    return {
      pages: raw.pages,
      apiEndpoints: raw.apiEndpoints || [],
      tables: raw.tables || [],
    };
  }

  // Case 2: Raw is features array or { features: [...] }
  const featuresList: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.features)
    ? raw.features
    : [];

  if (featuresList.length > 0) {
    const pages: PageItem[] = [];
    const apiEndpoints: ApiEndpointItem[] = [];
    const tables: TableItem[] = [];

    featuresList.forEach((feat, idx) => {
      const slug = String(feat.name || `feature-${idx + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      pages.push({
        id: `p-${idx + 1}`,
        name: feat.name || `Fitur ${idx + 1}`,
        route: `/app/${slug}`,
        type: idx === 0 ? "dashboard" : feat.name.toLowerCase().includes("login") ? "auth" : "settings",
        description: feat.phase || feat.name || "Modul fitur utama aplikasi",
        components: Array.isArray(feat.subs) ? feat.subs : [feat.name],
        authLevel: idx < 2 ? "public" : "protected",
        status: "todo",
      });

      apiEndpoints.push({
        id: `a-${idx + 1}-list`,
        method: "GET",
        path: `/api/v1/${slug}`,
        description: `Mengambil daftar data ${feat.name}`,
        authLevel: "protected",
      });

      apiEndpoints.push({
        id: `a-${idx + 1}-create`,
        method: "POST",
        path: `/api/v1/${slug}`,
        description: `Membuat data ${feat.name} baru`,
        authLevel: "protected",
      });

      if (Array.isArray(feat.sqlSchema) && feat.sqlSchema.length > 0) {
        feat.sqlSchema.forEach((sql: string, tableIdx: number) => {
          const tableNameMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
          const tableName = tableNameMatch ? tableNameMatch[1] : `${slug.replace(/-/g, '_')}_tbl`;
          tables.push({
            id: `t-${idx + 1}-${tableIdx + 1}`,
            name: tableName,
            description: `Tabel database untuk ${feat.name}`,
            columns: ["id uuid PK", "created_at timestamptz", "updated_at timestamptz"],
          });
        });
      } else {
        tables.push({
          id: `t-${idx + 1}`,
          name: slug.replace(/-/g, "_"),
          description: `Tabel database untuk ${feat.name}`,
          columns: ["id uuid PK", "created_at timestamptz", "updated_at timestamptz"],
        });
      }
    });

    return { pages, apiEndpoints, tables };
  }

  return FALLBACK_BLUEPRINT;
}

  useEffect(() => {
    async function load() {
      const projectId = localStorage.getItem("active_project_id");
      if (!projectId) { setLoading(false); return; }
      try {
        const proj = await api.projects.get(projectId);
        if (proj) setProjectName(proj.name);

        // 1. Coba load dari localStorage
        const local = localStorage.getItem(`canvas_blueprint_${projectId}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            const normalized = normalizeToAppBlueprint(parsed);
            if (normalized && normalized.pages && normalized.pages.length > 0) {
              setBlueprint(normalized);
              setHasNoBlueprint(false);
              setLoading(false);
              return;
            }
          } catch {}
        }

        // 2. Coba load dari DB
        const canvas = await api.projects.getCanvas(projectId);
        if (canvas?.features) {
          const normalized = normalizeToAppBlueprint(canvas.features);
          if (normalized && normalized.pages && normalized.pages.length > 0) {
            setBlueprint(normalized);
            localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(normalized));
            setHasNoBlueprint(false);
          } else {
            setHasNoBlueprint(true);
          }
        } else {
          setHasNoBlueprint(true);
        }
      } catch {
        setHasNoBlueprint(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading || hasNoBlueprint) return;
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(blueprint));
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [blueprint, loading, hasNoBlueprint]);

  async function handleInitialGenerate() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    setGeneratingInitial(true);
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const gen = await api.generate.canvas(projectId, { provider });
      if (gen?.content) {
        const normalized = parseAiContentToBlueprint(gen.content);
        if (normalized && normalized.pages && normalized.pages.length > 0) {
          setBlueprint(normalized);
          localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(normalized));
          setHasNoBlueprint(false);
          toast.success("Blueprint berhasil digenerate oleh AI!");
        } else {
          toast.error("Gagal memproses format blueprint AI");
        }
      }
    } catch (err: any) {
      console.error("Generate canvas error:", err);
      toast.error(err?.message || "Gagal generate blueprint");
    } finally {
      setGeneratingInitial(false);
    }
  }

  function handleUseEmpty() {
    setBlueprint(FALLBACK_BLUEPRINT);
    setHasNoBlueprint(false);
    toast.success("Memulai dengan default blueprint skeleton!");
  }

  async function handleProceedToTasks() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    setSavingDb(true);
    const saveToast = toast.loading("Menyimpan blueprint canvas ke database...");
    try {
      await api.projects.saveCanvas(projectId, { features: blueprint, isAiGenerated: false });
      toast.success("Blueprint berhasil disimpan ke database!", { id: saveToast });
      navigate({ to: "/app/tasks" });
    } catch {
      toast.error("Gagal menyimpan blueprint ke database", { id: saveToast });
    } finally {
      setSavingDb(false);
    }
  }

  async function handleRevision() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId || !revisionText.trim()) return;
    setRevising(true);
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const gen = await api.generate.canvas(projectId, { provider, revision: revisionText });
      if (gen?.content) {
        const normalized = parseAiContentToBlueprint(gen.content);
        if (normalized && normalized.pages && normalized.pages.length > 0) {
          setBlueprint(normalized);
          localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(normalized));
          toast.success("Blueprint berhasil direvisi!");
          setShowRevision(false);
          setRevisionText('');
        }
      }
    } catch { toast.error("Gagal revisi blueprint"); }
    finally { setRevising(false); }
  }

  const handleSaveManual = useCallback((layerType: 'frontend' | 'backend' | 'database', newItem: any) => {
    setBlueprint(prev => {
      const next = { ...prev };
      if (layerType === 'frontend') {
        next.pages = [newItem, ...next.pages];
      } else if (layerType === 'backend') {
        next.apiEndpoints = [newItem, ...next.apiEndpoints];
      } else {
        next.tables = [newItem, ...next.tables];
      }
      return next;
    });
    toast.success("Item berhasil ditambahkan secara manual!");
  }, []);

  const handleSaveAi = useCallback(async (instructionPrompt: string) => {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    setRevising(true);
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const gen = await api.generate.canvas(projectId, { provider, revision: instructionPrompt });
      if (gen?.content) {
        const normalized = parseAiContentToBlueprint(gen.content);
        if (normalized && normalized.pages && normalized.pages.length > 0) {
          setBlueprint(normalized);
          toast.success("AI berhasil menambahkan item ke blueprint!");
        } else {
          toast.error("Respons AI tidak valid");
        }
      }
    } catch {
      toast.error("Gagal menambahkan item via AI");
    } finally {
      setRevising(false);
    }
  }, []);

  const totalPages = blueprint.pages.length;
  const totalAPIs  = blueprint.apiEndpoints.length;
  const totalTables = blueprint.tables.length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#070a0f]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-5 py-2.5 backdrop-blur-md z-10 relative">
        <StageBar active={0} />
        <div className="flex items-center gap-2">
          {!hasNoBlueprint && (
            <>
              <span className="hidden sm:block text-[11px] text-slate-600 font-mono">
                {totalPages}P · {totalAPIs}API · {totalTables}DB
              </span>
              <button onClick={() => setShowRevision(true)} className="flex items-center gap-1.5 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-900/40 transition">
                <Lucide.Wand2 size={12} /> Revisi AI
              </button>
            </>
          )}
          <Button onClick={handleProceedToTasks} disabled={loading || hasNoBlueprint || savingDb} size="sm" className="text-[11px] h-8 bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
            {savingDb ? <Lucide.Loader2 size={12} className="animate-spin" /> : null}
            Canvas Selesai → Buat Tasks <Lucide.ArrowRight size={12} />
          </Button>
        </div>
      </div>

      {/* Canvas / Empty State */}
      <div className="relative flex-1">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a0f]">
            <div className="relative mb-6">
              <Lucide.Loader2 size={40} className="animate-spin text-indigo-500" />
              <div className="absolute -inset-4 rounded-full border border-indigo-500/20 animate-ping" />
            </div>
            <p className="text-sm text-slate-400 font-medium">Memuat Application Blueprint...</p>
          </div>
        ) : hasNoBlueprint ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a0f] p-6 text-center">
            <div className="relative mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Lucide.Layers size={28} />
              </div>
            </div>
            <h2 className="text-sm font-bold text-slate-200">Rancang Blueprint Aplikasi Anda</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
              Anda belum memiliki blueprint canvas untuk proyek ini. Mulai dengan membuat rancangan menggunakan AI atau template default.
            </p>
            <div className="flex gap-2.5 mt-5">
              <Button onClick={handleInitialGenerate} disabled={generatingInitial} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                {generatingInitial ? <Lucide.Loader2 size={13} className="animate-spin" /> : <Lucide.Sparkles size={13} />}
                {generatingInitial ? "AI Merancang..." : "Generate dengan AI"}
              </Button>
              <Button onClick={handleUseEmpty} disabled={generatingInitial} variant="outline" className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300">
                Gunakan Template Default
              </Button>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.15 }}
            minZoom={0.05} maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" variant={BackgroundVariant.Dots} gap={28} size={1.5} />
            <Controls className="!bg-slate-900 !border-slate-800 [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-800" />
            <MiniMap nodeColor="#1e293b" maskColor="rgba(7,10,15,0.75)" className="!bg-slate-900 !border-slate-800" />

            {/* Legend */}
            <Panel position="top-left" className="m-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 backdrop-blur-md space-y-2.5">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Layer</div>
                {[
                  { dot: 'bg-violet-500', label: 'Frontend — Halaman UI' },
                  { dot: 'bg-sky-500',    label: 'Backend — API Endpoint' },
                  { dot: 'bg-emerald-500',label: 'Database — Tabel PostgreSQL' },
                ].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />{label}
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-2 text-[9px] text-slate-600">
                  Klik node untuk lihat detail
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {/* Revision Modal */}
      {showRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !revising && setShowRevision(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-700/30 bg-slate-900 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20"><Lucide.Wand2 size={16} className="text-amber-400" /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Revisi Blueprint dengan AI</h3>
                  <p className="text-[11px] text-slate-500">AI akan menyusun ulang peta aplikasi</p>
                </div>
              </div>
              <button onClick={() => !revising && setShowRevision(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 transition"><Lucide.X size={16} /></button>
            </div>
            <textarea
              value={revisionText} onChange={e => setRevisionText(e.target.value)}
              disabled={revising} autoFocus rows={5}
              placeholder="Contoh: Tambahkan halaman chat real-time, payment gateway, modul laporan PDF..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowRevision(false)} variant="outline" size="sm" disabled={revising} className="text-xs border-slate-700">Batal</Button>
              <Button onClick={handleRevision} disabled={revising || !revisionText.trim()} size="sm" className="text-xs bg-amber-600 hover:bg-amber-500 text-white gap-1.5">
                {revising ? <><Lucide.Loader2 size={13} className="animate-spin" />Proses...</> : <><Lucide.Send size={13} />Revisi Blueprint</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <GroupDetailModal groupId={detailGroupId} blueprint={blueprint} onClose={() => setDetailGroupId(null)} setBlueprint={setBlueprint} />
      <AddItemGroupModal
        groupId={addGroupId}
        blueprint={blueprint}
        onClose={() => setAddGroupId(null)}
        onSaveManual={handleSaveManual}
        onSaveAi={handleSaveAi}
        aiLoading={revising}
      />
    </div>
  );
}
