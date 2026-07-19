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
  type PageStatus, PAGE_TYPE_META, AUTH_LEVEL_META, STATUS_META, METHOD_META,
} from "./-canvas-nodes";

export const Route = createFileRoute("/app/canvas")({ component: CanvasPage });

// ============================================================
// FALLBACK BLUEPRINT
// ============================================================
const FALLBACK_BLUEPRINT: AppBlueprint = {
  pages: [
    // Public & Auth
    { id: 'p1',   name: 'Landing Page',       route: '/',                              type: 'landing',   description: 'Hero, features, pricing, testimonial, dan CTA', components: ['HeroSection', 'FeaturesGrid', 'PricingTable', 'TestimonialSlider', 'CTABanner', 'Navbar', 'Footer'], authLevel: 'public', status: 'todo' },
    { id: 'p2',   name: 'Login',              route: '/auth/login',                    type: 'auth',      description: 'Email+password login dengan OAuth Google/GitHub', components: ['LoginForm', 'OAuthButtons', 'ForgotPasswordLink', 'RememberMeToggle'], authLevel: 'public', status: 'todo' },
    { id: 'p3',   name: 'Register',           route: '/auth/register',                 type: 'auth',      description: 'Form registrasi, password strength meter, terms', components: ['RegisterForm', 'PasswordStrengthMeter', 'TermsCheckbox', 'OAuthButtons'], authLevel: 'public', status: 'todo' },
    { id: 'p3b',  name: 'Forgot Password',    route: '/auth/forgot-password',          type: 'form',      description: 'Kirim email reset password, tampilkan konfirmasi', components: ['ForgotPasswordForm', 'SuccessMessage'], authLevel: 'public', status: 'todo' },
    { id: 'p3c',  name: 'Reset Password',     route: '/auth/reset-password/:token',    type: 'form',      description: 'Input password baru via token dari email', components: ['ResetPasswordForm', 'PasswordStrengthMeter', 'TokenExpiredMessage'], authLevel: 'public', status: 'todo' },
    // App Core
    { id: 'p4',   name: 'Dashboard',          route: '/app/dashboard',                 type: 'dashboard', description: 'KPI cards, activity chart, recent projects, quick actions', components: ['KPICards', 'ActivityLineChart', 'RecentProjectsList', 'QuickActionGrid', 'WelcomeBanner'], authLevel: 'protected', status: 'todo' },
    { id: 'p7',   name: 'Canvas Blueprint',   route: '/app/canvas',                    type: 'dashboard', description: 'Visual ERD: Frontend/Backend/Database layer, AI revision', components: ['ReactFlowCanvas', 'GroupNode', 'FilterPanel', 'RevisionModal', 'MiniMap'], authLevel: 'protected', status: 'todo' },
    { id: 'p8',   name: 'Tasks Checklist',    route: '/app/tasks',                     type: 'crud',      description: 'Task checklist untuk coding agent, generate dari canvas', components: ['TaskList', 'TaskCard', 'AddTaskModal', 'CategorySidebar', 'ProgressBar'], authLevel: 'protected', status: 'todo' },
    { id: 'p9',   name: 'AI Prompts (10x)',   route: '/app/prompt',                    type: 'crud',      description: '10 modul prompt terpisah + unduh ZIP dengan folder rules', components: ['PromptModuleList', 'PromptViewer', 'CopyButton', 'ZIPDownloadButton'], authLevel: 'protected', status: 'todo' },
    // Projects CRUD
    { id: 'p5',   name: 'Projects — List',    route: '/app/projects',                  type: 'crud',      description: 'Tabel, search, filter status, sort, pagination, bulk select', components: ['ProjectsTable', 'SearchBar', 'StatusFilter', 'SortDropdown', 'Pagination', 'BulkActionsBar', 'EmptyState'], authLevel: 'protected', status: 'todo' },
    { id: 'p5b',  name: 'Projects — Create',  route: '/app/projects/create',           type: 'form',      description: 'Multi-step form: project info, template pilihan, tech stack', components: ['MultiStepForm', 'ProjectInfoStep', 'TechStackPicker', 'TemplateGallery', 'FormProgress'], authLevel: 'protected', status: 'todo' },
    { id: 'p5c',  name: 'Projects — Detail',  route: '/app/projects/:id',              type: 'detail',    description: 'Header proyek, tabs dokumen AI, action bar generate & download', components: ['ProjectHeader', 'StatusTimeline', 'DocumentTabs', 'AIGenerateButton', 'RevisionPanel', 'DownloadZIPButton'], authLevel: 'protected', status: 'todo' },
    { id: 'p5d',  name: 'Projects — Edit',    route: '/app/projects/:id/edit',         type: 'form',      description: 'Form edit nama, deskripsi, tech stack, danger zone delete', components: ['EditProjectForm', 'TechStackEditor', 'AIPreferencePanel', 'DangerZoneCard', 'DeleteConfirmModal'], authLevel: 'protected', status: 'todo' },
    // Documents
    { id: 'p6',   name: 'Documents — List',   route: '/app/projects/:id/documents',    type: 'crud',      description: 'Grid dokumen AI: PRD, arsitektur, DB, API, tasks, prompt', components: ['DocumentGrid', 'TypeFilterTabs', 'DocumentCard', 'StatusBadge', 'RegenerateButton'], authLevel: 'protected', status: 'todo' },
    { id: 'p6b',  name: 'Document — Viewer',  route: '/app/projects/:id/documents/:type', type: 'detail', description: 'Markdown viewer, line numbers, revisi AI, version history', components: ['DocumentHeader', 'MarkdownViewer', 'LineNumbers', 'RevisionModal', 'VersionHistoryDrawer', 'CopyButton', 'DownloadButton'], authLevel: 'protected', status: 'todo' },
    // Settings
    { id: 'p10',  name: 'Settings — Profile', route: '/app/settings',                  type: 'settings',  description: 'Edit profil: nama, avatar, bio, GitHub link, preferensi', components: ['ProfileForm', 'AvatarUploader', 'SocialLinksForm'], authLevel: 'protected', status: 'todo' },
    { id: 'p10b', name: 'Settings — Security',route: '/app/settings/security',         type: 'settings',  description: 'Ganti password, list session aktif, logout semua device', components: ['ChangePasswordForm', 'ActiveSessionsList', 'LogoutAllDevicesButton'], authLevel: 'protected', status: 'todo' },
    { id: 'p10c', name: 'Settings — AI Prefs',route: '/app/settings/ai',               type: 'settings',  description: 'Pilih AI provider default, model, dan prompt preferences', components: ['ProviderSelector', 'ModelSelector', 'PromptPreferences'], authLevel: 'protected', status: 'todo' },
    // Admin
    { id: 'p11',  name: 'Admin — Dashboard',  route: '/admin',                         type: 'admin',     description: 'KPI sistem, AI usage chart, provider distribution, growth', components: ['AdminKPICards', 'AIUsageAreaChart', 'ProviderPieChart', 'UserGrowthChart', 'RecentErrorsList'], authLevel: 'admin', status: 'todo' },
    { id: 'p12',  name: 'Admin — Users',      route: '/admin/users',                   type: 'admin',     description: 'Tabel user, search, filter role, edit role, ban, delete', components: ['UsersDataTable', 'SearchAndFilter', 'UserDetailModal', 'EditRoleModal', 'BanConfirmModal', 'DeleteConfirmModal'], authLevel: 'admin', status: 'todo' },
    { id: 'p13',  name: 'Admin — Providers',  route: '/admin/providers',               type: 'admin',     description: 'Manajemen AI provider, API keys, quota monitoring', components: ['ProvidersTable', 'AddProviderModal', 'EditProviderDrawer', 'APIKeysManager', 'QuotaProgressBar'], authLevel: 'admin', status: 'todo' },
    { id: 'p14',  name: 'Admin — Monitoring', route: '/admin/monitoring',              type: 'admin',     description: 'Realtime: server health, AI latency, error rate, logs', components: ['RealtimeMetricCharts', 'ErrorLogsTable', 'ServerHealthBanner', 'AlertsPanel'], authLevel: 'admin', status: 'todo' },
    { id: 'p15',  name: 'Admin — Settings',   route: '/admin/settings',                type: 'admin',     description: 'Prompt templates, interview questions, feature flags', components: ['PromptTemplateEditor', 'QuestionListManager', 'FeatureFlagsToggle', 'SystemConfigForm'], authLevel: 'admin', status: 'todo' },
  ],
  apiEndpoints: [
    // Auth
    { id: 'a1',  method: 'POST',   path: '/api/v1/auth/register',                description: 'Registrasi, hash bcrypt/12, kirim email verif, return JWT', authLevel: 'public' },
    { id: 'a2',  method: 'POST',   path: '/api/v1/auth/login',                   description: 'Login email+password, return access_token (15m) + refresh cookie (7d)', authLevel: 'public' },
    { id: 'a3',  method: 'POST',   path: '/api/v1/auth/logout',                  description: 'Hapus refresh token dari DB, clear httpOnly cookie', authLevel: 'protected' },
    { id: 'a4',  method: 'POST',   path: '/api/v1/auth/refresh',                 description: 'Baca refresh_token dari cookie, generate access_token baru', authLevel: 'public' },
    { id: 'a5',  method: 'POST',   path: '/api/v1/auth/forgot-password',         description: 'Kirim email OTP reset (expire 15 menit)', authLevel: 'public' },
    { id: 'a6',  method: 'POST',   path: '/api/v1/auth/reset-password',          description: 'Validasi OTP, hash password baru, invalidate semua session lama', authLevel: 'public' },
    { id: 'a7',  method: 'GET',    path: '/api/v1/auth/verify-email/:token',     description: 'Verifikasi email via token → set is_verified=true', authLevel: 'public' },
    { id: 'a8',  method: 'GET',    path: '/api/v1/auth/me',                      description: 'Return profil user aktif dari Bearer JWT', authLevel: 'protected' },
    { id: 'a9',  method: 'GET',    path: '/api/v1/auth/sessions',                description: 'List semua session aktif (device, IP, last_active)', authLevel: 'protected' },
    { id: 'a10', method: 'DELETE', path: '/api/v1/auth/sessions/:sessionId',     description: 'Logout dari device tertentu berdasarkan session ID', authLevel: 'protected' },
    // Projects
    { id: 'b1',  method: 'GET',    path: '/api/v1/projects',                     description: 'List proyek user (paginated, search, status, sort)', authLevel: 'protected' },
    { id: 'b2',  method: 'POST',   path: '/api/v1/projects',                     description: 'Buat proyek baru → return data + ID', authLevel: 'protected' },
    { id: 'b3',  method: 'GET',    path: '/api/v1/projects/:id',                 description: 'Detail proyek + dokumen terbaru + canvas + tech stack', authLevel: 'protected' },
    { id: 'b4',  method: 'PUT',    path: '/api/v1/projects/:id',                 description: 'Update nama, deskripsi, preferred_provider', authLevel: 'protected' },
    { id: 'b5',  method: 'DELETE', path: '/api/v1/projects/:id',                 description: 'Soft delete → is_deleted=true, recoverable 30 hari', authLevel: 'protected' },
    { id: 'b6',  method: 'POST',   path: '/api/v1/projects/:id/restore',         description: 'Restore dari recycle bin', authLevel: 'protected' },
    { id: 'b7',  method: 'POST',   path: '/api/v1/projects/:id/duplicate',       description: 'Clone proyek + semua dokumen, canvas, tech stack', authLevel: 'protected' },
    { id: 'b8',  method: 'GET',    path: '/api/v1/projects/:id/canvas',          description: 'Get canvas blueprint JSON terbaru', authLevel: 'protected' },
    { id: 'b9',  method: 'POST',   path: '/api/v1/projects/:id/canvas',          description: 'Simpan/update canvas (auto-save + versioning)', authLevel: 'protected' },
    { id: 'b10', method: 'GET',    path: '/api/v1/projects/:id/documents',       description: 'List semua dokumen AI (tipe, versi, provider)', authLevel: 'protected' },
    { id: 'b11', method: 'GET',    path: '/api/v1/projects/:id/documents/:type', description: 'Get dokumen terbaru (prd, architecture, database, api, tasks, prompt)', authLevel: 'protected' },
    { id: 'b12', method: 'POST',   path: '/api/v1/projects/:id/documents/:type', description: 'Simpan dokumen manual atau revisi dari cursor', authLevel: 'protected' },
    { id: 'b13', method: 'GET',    path: '/api/v1/projects/:id/documents/:type/history', description: 'Riwayat versi dokumen untuk rollback', authLevel: 'protected' },
    { id: 'b14', method: 'GET',    path: '/api/v1/projects/:id/technologies',    description: 'List tech stack terpilih untuk proyek', authLevel: 'protected' },
    { id: 'b15', method: 'POST',   path: '/api/v1/projects/:id/technologies',    description: 'Update tech stack (replace seluruh array)', authLevel: 'protected' },
    { id: 'b16', method: 'GET',    path: '/api/v1/projects/:id/answers',         description: 'Get semua jawaban interview tersimpan', authLevel: 'protected' },
    { id: 'b17', method: 'POST',   path: '/api/v1/projects/:id/answers',         description: 'Upsert jawaban interview per proyek', authLevel: 'protected' },
    // Generate
    { id: 'c1',  method: 'POST',   path: '/api/v1/generate/canvas/:id',          description: 'AI generate blueprint JSON (pages, API, tables)', authLevel: 'protected' },
    { id: 'c2',  method: 'POST',   path: '/api/v1/generate/prd/:id',             description: 'AI generate PRD: latar belakang, user stories, scope', authLevel: 'protected' },
    { id: 'c3',  method: 'POST',   path: '/api/v1/generate/architecture/:id',    description: 'AI generate arsitektur sistem, tech decisions, deployment', authLevel: 'protected' },
    { id: 'c4',  method: 'POST',   path: '/api/v1/generate/database/:id',        description: 'AI generate ERD + SQL schema + migration', authLevel: 'protected' },
    { id: 'c5',  method: 'POST',   path: '/api/v1/generate/api/:id',             description: 'AI generate spesifikasi API endpoint lengkap', authLevel: 'protected' },
    { id: 'c6',  method: 'POST',   path: '/api/v1/generate/tasks/:id',           description: 'AI generate task breakdown dari canvas + dokumen', authLevel: 'protected' },
    { id: 'c7',  method: 'POST',   path: '/api/v1/generate/prompt/:id',          description: 'AI generate 10 modul prompt untuk coding agent', authLevel: 'protected' },
    // Public
    { id: 'e1',  method: 'GET',    path: '/api/v1/technologies',                 description: 'List semua teknologi aktif untuk dipilih', authLevel: 'public' },
    { id: 'e2',  method: 'GET',    path: '/api/v1/technologies/categories',      description: 'List kategori teknologi', authLevel: 'public' },
    { id: 'e3',  method: 'GET',    path: '/api/v1/interview/questions',          description: 'List pertanyaan interview AI', authLevel: 'public' },
    // Admin
    { id: 'd1',  method: 'GET',    path: '/api/v1/admin/dashboard/stats',        description: 'Stats global: users, projects, AI calls, cost', authLevel: 'admin' },
    { id: 'd2',  method: 'GET',    path: '/api/v1/admin/dashboard/ai-usage',     description: 'Data chart AI usage per hari/minggu', authLevel: 'admin' },
    { id: 'd3',  method: 'GET',    path: '/api/v1/admin/dashboard/provider-distribution', description: 'Distribusi penggunaan per AI provider', authLevel: 'admin' },
    { id: 'd4',  method: 'GET',    path: '/api/v1/admin/users',                  description: 'List semua user (paginated, search, filter)', authLevel: 'admin' },
    { id: 'd5',  method: 'PUT',    path: '/api/v1/admin/users/:id',              description: 'Update user: role, verifikasi, ban status', authLevel: 'admin' },
    { id: 'd6',  method: 'DELETE', path: '/api/v1/admin/users/:id',              description: 'Hard delete user + semua data terkait', authLevel: 'admin' },
    { id: 'd7',  method: 'GET',    path: '/api/v1/admin/providers',              description: 'List semua AI provider (status, quota, usage)', authLevel: 'admin' },
    { id: 'd8',  method: 'POST',   path: '/api/v1/admin/providers',              description: 'Tambah AI provider baru', authLevel: 'admin' },
    { id: 'd9',  method: 'PUT',    path: '/api/v1/admin/providers/:id',          description: 'Update provider (model, priority, aktif/nonaktif)', authLevel: 'admin' },
    { id: 'd10', method: 'DELETE', path: '/api/v1/admin/providers/:id',          description: 'Hapus provider (hanya jika tidak ada usage log)', authLevel: 'admin' },
    { id: 'd11', method: 'GET',    path: '/api/v1/admin/api-keys',               description: 'List API key per provider (ter-mask)', authLevel: 'admin' },
    { id: 'd12', method: 'POST',   path: '/api/v1/admin/api-keys',               description: 'Tambah API key baru (dienkripsi)', authLevel: 'admin' },
    { id: 'd13', method: 'PUT',    path: '/api/v1/admin/api-keys/:id',           description: 'Update label, quota, is_active API key', authLevel: 'admin' },
    { id: 'd14', method: 'DELETE', path: '/api/v1/admin/api-keys/:id',           description: 'Hapus API key permanen', authLevel: 'admin' },
    { id: 'd15', method: 'GET',    path: '/api/v1/admin/monitoring/realtime',    description: 'Monitoring realtime: CPU, memory, latency P95', authLevel: 'admin' },
    { id: 'd16', method: 'GET',    path: '/api/v1/admin/logs/activity',          description: 'Log aktivitas dengan filter dan paginasi', authLevel: 'admin' },
    { id: 'd17', method: 'GET',    path: '/api/v1/admin/settings',               description: 'Get semua system settings', authLevel: 'admin' },
    { id: 'd18', method: 'PUT',    path: '/api/v1/admin/settings/:key',          description: 'Update system setting berdasarkan key', authLevel: 'admin' },
    { id: 'd19', method: 'GET',    path: '/api/v1/admin/prompt-templates',       description: 'List prompt template per tipe generate', authLevel: 'admin' },
    { id: 'd20', method: 'PUT',    path: '/api/v1/admin/prompt-templates/:id',   description: 'Update system prompt dan user prompt template', authLevel: 'admin' },
  ],
  tables: [
    // Users Cluster
    { id: 't1',   name: 'users',               description: 'Akun utama: email, password_hash, role, is_verified, is_banned', columns: ['id uuid PK', 'email varchar UNIQUE', 'name varchar', 'avatar_url text', 'password_hash text', 'role enum', 'is_verified bool', 'is_banned bool', 'created_at', 'updated_at'] },
    { id: 't1b',  name: 'user_sessions',       description: 'Refresh token aktif per device (multi-device login)', columns: ['id uuid PK', 'user_id FK→users', 'refresh_token_hash text UNIQUE', 'device_info jsonb', 'ip_address inet', 'user_agent text', 'expires_at', 'created_at'] },
    { id: 't1c',  name: 'user_profiles',       description: 'Profil tambahan: bio, sosmed, preferensi tema/bahasa', columns: ['id uuid PK', 'user_id FK→users UNIQUE', 'bio text', 'website_url', 'github_url', 'preferred_language', 'ui_theme', 'updated_at'] },
    { id: 't1d',  name: 'password_resets',     description: 'Token OTP reset password (expire 15 menit)', columns: ['id uuid PK', 'user_id FK→users', 'token_hash text', 'expires_at', 'used_at', 'ip_requested inet', 'created_at'] },
    { id: 't1e',  name: 'email_verifications', description: 'Token verifikasi email setelah registrasi (expire 24 jam)', columns: ['id uuid PK', 'user_id FK→users', 'token_hash UNIQUE', 'expires_at', 'verified_at', 'created_at'] },
    { id: 't1f',  name: 'notifications',       description: 'Notifikasi in-app per user: generate selesai, error, alert', columns: ['id uuid PK', 'user_id FK→users', 'type varchar', 'title', 'message text', 'is_read bool', 'action_url', 'metadata jsonb', 'created_at'] },
    // Projects Cluster
    { id: 't2',   name: 'projects',            description: 'Proyek utama dengan soft delete dan status alur kerja AI', columns: ['id uuid PK', 'user_id FK→users', 'name varchar', 'description text', 'status enum', 'preferred_provider', 'is_deleted bool', 'deleted_at', 'created_at', 'updated_at'] },
    { id: 't2b',  name: 'project_answers',     description: 'Jawaban interview AI per proyek (upsert key-value)', columns: ['id uuid PK', 'project_id FK→projects', 'question_key varchar', 'answer_value text', 'created_at', 'updated_at', 'UNIQUE(project_id, question_key)'] },
    { id: 't2c',  name: 'project_canvas',      description: 'Canvas blueprint JSON: pages, apiEndpoints, tables per proyek', columns: ['id uuid PK', 'project_id FK→projects UNIQUE', 'blueprint jsonb NOT NULL', 'is_ai_generated bool', 'schema_version int', 'created_at', 'updated_at'] },
    { id: 't2d',  name: 'project_technologies',description: 'Relasi many-to-many proyek ↔ teknologi terpilih', columns: ['id uuid PK', 'project_id FK→projects', 'technology_id FK→technologies', 'created_at', 'UNIQUE(project_id, technology_id)'] },
    // Documents Cluster
    { id: 't3',   name: 'generated_documents', description: 'Dokumen AI terbaru per tipe per proyek (PRD, arsitektur, dll)', columns: ['id uuid PK', 'project_id FK→projects', 'type document_type_enum', 'content text NOT NULL', 'provider_used', 'model_used', 'tokens_used int', 'generation_time_ms', 'version int', 'created_at', 'UNIQUE(project_id, type)'] },
    { id: 't3b',  name: 'document_history',    description: 'Riwayat semua versi dokumen untuk rollback dan audit', columns: ['id uuid PK', 'project_id FK→projects', 'document_id FK→generated_documents', 'type enum', 'content text', 'version int', 'revision_note text', 'generated_by', 'created_at'] },
    // AI Providers Cluster
    { id: 't4',   name: 'ai_providers',        description: 'Gemini, Groq, OpenAI, Anthropic — prioritas rotasi dan quota', columns: ['id uuid PK', 'name varchar UNIQUE', 'display_name', 'default_model', 'base_url text', 'is_active bool', 'priority int', 'max_tokens int', 'created_at', 'updated_at'] },
    { id: 't4b',  name: 'api_keys',            description: 'API key per provider, AES-256 encrypted, quota tracking', columns: ['id uuid PK', 'provider_id FK→ai_providers', 'label varchar', 'key_encrypted text NOT NULL', 'quota_limit int', 'quota_used int', 'is_active bool', 'last_used_at', 'expires_at', 'created_at'] },
    { id: 't4c',  name: 'ai_usage_logs',       description: 'Log token AI per generate per proyek (billing & monitoring)', columns: ['id uuid PK', 'project_id FK→projects', 'user_id FK→users', 'provider_id FK→ai_providers', 'api_key_id FK→api_keys', 'generate_type', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'cost_usd numeric', 'latency_ms', 'status', 'created_at'] },
    // System Config Cluster
    { id: 't5',   name: 'technologies',        description: 'Katalog teknologi yang tersedia sebagai pilihan tech stack', columns: ['id uuid PK', 'name varchar UNIQUE', 'display_name', 'category', 'logo_url text', 'description text', 'is_active bool', 'sort_order int', 'created_at'] },
    { id: 't5b',  name: 'interview_questions', description: 'Pertanyaan interview AI yang ditampilkan saat setup proyek', columns: ['id uuid PK', 'key varchar UNIQUE', 'question_text text NOT NULL', 'type enum', 'options jsonb', 'is_required bool', 'sort_order int', 'is_active bool'] },
    { id: 't5c',  name: 'prompt_templates',    description: 'Template sistem prompt AI per tipe generate — bisa diedit admin', columns: ['id uuid PK', 'type document_type_enum', 'name varchar', 'system_prompt text NOT NULL', 'user_prompt_template text', 'version int', 'is_published bool', 'created_by FK→users', 'created_at'] },
    { id: 't5d',  name: 'system_settings',     description: 'Key-value store untuk konfigurasi global (feature flags, dll)', columns: ['id uuid PK', 'key varchar UNIQUE', 'value text', 'type enum', 'description text', 'updated_by FK→users', 'updated_at'] },
    { id: 't5e',  name: 'activity_logs',       description: 'Audit trail semua aksi penting untuk keamanan & debugging', columns: ['id uuid PK', 'user_id FK→users', 'action varchar', 'resource_type', 'resource_id uuid', 'ip_address inet', 'user_agent text', 'metadata jsonb', 'created_at'] },
    { id: 't5f',  name: 'request_logs',        description: 'Log HTTP request: method, path, status, duration, user', columns: ['id uuid PK', 'method varchar', 'path text', 'status_code int', 'user_id FK→users', 'duration_ms int', 'ip_address inet', 'created_at'] },
  ],
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

  // Resolve groups
  const resolvedFE = FRONTEND_GROUPS.map(g => ({
    ...g,
    pages:     blueprint.pages.filter(g.filter.pages!),
    endpoints: [] as ApiEndpointItem[],
    tables:    [] as TableItem[],
    count:     blueprint.pages.filter(g.filter.pages!).length,
    preview:   blueprint.pages.filter(g.filter.pages!).map(p => p.name),
  })).filter(g => g.count > 0);

  const resolvedBE = BACKEND_GROUPS.map(g => ({
    ...g,
    pages:     [] as PageItem[],
    endpoints: blueprint.apiEndpoints.filter(g.filter.endpoints!),
    tables:    [] as TableItem[],
    count:     blueprint.apiEndpoints.filter(g.filter.endpoints!).length,
    preview:   blueprint.apiEndpoints.filter(g.filter.endpoints!).map(e => e.path),
  })).filter(g => g.count > 0);

  const resolvedDB = DATABASE_GROUPS.map(g => ({
    ...g,
    pages:     [] as PageItem[],
    endpoints: [] as ApiEndpointItem[],
    tables:    blueprint.tables.filter(g.filter.tables!),
    count:     blueprint.tables.filter(g.filter.tables!).length,
    preview:   blueprint.tables.filter(g.filter.tables!).map(t => t.name),
  })).filter(g => g.count > 0);

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
function GroupDetailModal({
  groupId, blueprint, onClose,
}: { groupId: string | null; blueprint: AppBlueprint; onClose: () => void }) {
  if (!groupId) return null;

  const allGroups = [...FRONTEND_GROUPS, ...BACKEND_GROUPS, ...DATABASE_GROUPS];
  const groupDef = allGroups.find(g => g.id === groupId);
  if (!groupDef) return null;

  const layerType = groupId.startsWith('fg') ? 'frontend' : groupId.startsWith('bg') ? 'backend' : 'database';

  const pages     = groupDef.filter.pages     ? blueprint.pages.filter(groupDef.filter.pages)            : [];
  const endpoints = groupDef.filter.endpoints ? blueprint.apiEndpoints.filter(groupDef.filter.endpoints) : [];
  const tables    = groupDef.filter.tables    ? blueprint.tables.filter(groupDef.filter.tables)           : [];

  const colors = {
    frontend: { header: 'border-violet-700/40 bg-violet-950/20', badge: 'bg-violet-950/60 text-violet-300 border-violet-700/40', dot: 'bg-violet-500', ring: 'border-violet-500/30' },
    backend:  { header: 'border-sky-700/40 bg-sky-950/20',       badge: 'bg-sky-950/60 text-sky-300 border-sky-700/40',           dot: 'bg-sky-500',     ring: 'border-sky-500/30' },
    database: { header: 'border-emerald-700/40 bg-emerald-950/20', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40', dot: 'bg-emerald-500', ring: 'border-emerald-500/30' },
  }[layerType];

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
          {/* Pages */}
          {pages.map(page => {
            const meta = PAGE_TYPE_META[page.type]; const Icon = meta.icon;
            const auth = AUTH_LEVEL_META[page.authLevel];
            const status = STATUS_META[page.status];
            return (
              <div key={page.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/60 transition">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-700/30">
                  <Icon size={15} className={meta.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-slate-100">{page.name}</span>
                    <code className="text-[10px] text-slate-500 font-mono">{page.route}</code>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{page.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {page.components.slice(0, 5).map(c => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 border border-white/8 text-slate-500 font-mono">{c}</span>)}
                    {page.components.length > 5 && <span className="text-[9px] text-slate-600">+{page.components.length - 5}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${status.cls}`}>{status.label}</span>
                  <span className={`text-[9px] font-bold flex items-center gap-1 ${auth.text}`}><span className={`h-1.5 w-1.5 rounded-full ${auth.dot}`} />{auth.label}</span>
                </div>
              </div>
            );
          })}

          {/* Endpoints */}
          {endpoints.map(ep => {
            const m = METHOD_META[ep.method]; const a = AUTH_LEVEL_META[ep.authLevel];
            return (
              <div key={ep.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/60 transition">
                <span className={`shrink-0 text-[11px] font-black px-2.5 py-1 rounded border ${m.cls} min-w-[52px] text-center`}>{ep.method}</span>
                <div className="flex-1 min-w-0">
                  <code className="text-[11px] font-bold text-slate-200 break-all">{ep.path}</code>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{ep.description}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold ${a.text} flex items-center gap-1`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />{a.label}
                </span>
              </div>
            );
          })}

          {/* Tables */}
          {tables.map(table => (
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
                  {table.columns.slice(0, 5).map(c => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400/70 font-mono">{c}</span>)}
                  {table.columns.length > 5 && <span className="text-[9px] text-slate-600">+{table.columns.length - 5}</span>}
                </div>
              </div>
            </div>
          ))}
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

  const allGroups = [...FRONTEND_GROUPS, ...BACKEND_GROUPS, ...DATABASE_GROUPS];
  const groupDef = allGroups.find(g => g.id === groupId);
  if (!groupDef) return null;

  const layerType = groupId.startsWith('fg') ? 'frontend' : groupId.startsWith('bg') ? 'backend' : 'database';

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasNoBlueprint, setHasNoBlueprint] = useState(false);
  const [generatingInitial, setGeneratingInitial] = useState(false);

  const onGroupDetail = useCallback((id: string) => setDetailGroupId(id), []);
  const onGroupAdd    = useCallback((id: string) => setAddGroupId(id), []);

  useEffect(() => {
    if (hasNoBlueprint) return;
    const { nodes: n, edges: e } = buildGraph(blueprint, projectName, onGroupDetail, onGroupAdd);
    setNodes(n); setEdges(e);
  }, [blueprint, projectName, onGroupDetail, onGroupAdd, hasNoBlueprint]);

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
            if (parsed && parsed.pages) {
              setBlueprint(parsed);
              setLoading(false);
              return;
            }
          } catch {}
        }

        // 2. Coba load dari DB
        const canvas = await api.projects.getCanvas(projectId);
        if (canvas?.blueprint?.pages) {
          setBlueprint(canvas.blueprint);
          localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(canvas.blueprint));
        } else {
          // Tampilkan opsi generate, jangan otomatis generate di database/API
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
      // Simpan di local storage dulu
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
        const parsed: AppBlueprint = JSON.parse(gen.content.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.pages) {
          setBlueprint(parsed);
          localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(parsed));
          setHasNoBlueprint(false);
          toast.success("Blueprint berhasil digenerate oleh AI!");
        }
      }
    } catch {
      toast.error("Gagal generate blueprint");
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
      await api.projects.saveCanvas(projectId, { blueprint, isAiGenerated: false });
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
        const parsed: AppBlueprint = JSON.parse(gen.content.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.pages) {
          setBlueprint(parsed);
          localStorage.setItem(`canvas_blueprint_${projectId}`, JSON.stringify(parsed));
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
        const parsed: AppBlueprint = JSON.parse(gen.content.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.pages) {
          setBlueprint(parsed);
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

      <GroupDetailModal groupId={detailGroupId} blueprint={blueprint} onClose={() => setDetailGroupId(null)} />
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
