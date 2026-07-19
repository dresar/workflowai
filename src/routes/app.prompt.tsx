import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import JSZip from "jszip";

export const Route = createFileRoute("/app/prompt")({ component: PromptPage });

// ============================================================
// TYPES
// ============================================================
interface PromptModule {
  id: string;
  number: string;     // "01", "02", ...
  title: string;
  description: string;
  icon: Lucide.LucideIcon;
  iconCls: string;
  content: string;    // the generated prompt text
  filename: string;   // filename inside zip
  category: 'setup' | 'backend' | 'frontend' | 'infra';
}

// ============================================================
// 10 PROMPT TEMPLATES
// ============================================================
function buildDefaultModules(): PromptModule[] {
  return [
    {
      id: 'setup', number: '01', title: 'Project Setup & Structure',
      description: 'Inisialisasi repo, konfigurasi TypeScript, ESLint, folder structure, dan dependencies',
      icon: Lucide.FolderOpen, iconCls: 'text-slate-400 bg-slate-800 border-slate-700',
      content: '', filename: '01_Project_Setup.md', category: 'setup',
    },
    {
      id: 'database', number: '02', title: 'Database Schema & Migration',
      description: 'SQL schema lengkap, Drizzle ORM setup, migration pertama, dan seed data',
      icon: Lucide.Database, iconCls: 'text-emerald-400 bg-emerald-950/50 border-emerald-800',
      content: '', filename: '02_Database_Migration.md', category: 'backend',
    },
    {
      id: 'auth', number: '03', title: 'Authentication System',
      description: 'Implementasi login, register, JWT token, refresh token, dan auth middleware',
      icon: Lucide.Lock, iconCls: 'text-amber-400 bg-amber-950/50 border-amber-800',
      content: '', filename: '03_Auth_System.md', category: 'backend',
    },
    {
      id: 'api', number: '04', title: 'Core API Endpoints',
      description: 'REST API routes, controllers, validasi input, dan error handling',
      icon: Lucide.Server, iconCls: 'text-sky-400 bg-sky-950/50 border-sky-800',
      content: '', filename: '04_API_Endpoints.md', category: 'backend',
    },
    {
      id: 'landing', number: '05', title: 'Landing Page & Marketing',
      description: 'Halaman landing: hero, features, pricing, testimonial, dan CTA section',
      icon: Lucide.Globe, iconCls: 'text-violet-400 bg-violet-950/50 border-violet-800',
      content: '', filename: '05_Landing_Page.md', category: 'frontend',
    },
    {
      id: 'dashboard', number: '06', title: 'Dashboard & Analytics',
      description: 'Dashboard utama dengan KPI cards, chart, activity feed, dan quick actions',
      icon: Lucide.LayoutDashboard, iconCls: 'text-indigo-400 bg-indigo-950/50 border-indigo-800',
      content: '', filename: '06_Dashboard.md', category: 'frontend',
    },
    {
      id: 'crud', number: '07', title: 'Core CRUD Modules',
      description: 'Halaman list dengan search/filter, form create/edit, dan delete confirmation',
      icon: Lucide.Table2, iconCls: 'text-teal-400 bg-teal-950/50 border-teal-800',
      content: '', filename: '07_CRUD_Modules.md', category: 'frontend',
    },
    {
      id: 'components', number: '08', title: 'UI Component Library',
      description: 'Reusable components: buttons, modals, forms, tables, cards, dan navigasi',
      icon: Lucide.Boxes, iconCls: 'text-pink-400 bg-pink-950/50 border-pink-800',
      content: '', filename: '08_UI_Components.md', category: 'frontend',
    },
    {
      id: 'testing', number: '09', title: 'Testing & Quality Assurance',
      description: 'Unit test dengan Vitest, E2E test dengan Playwright, dan CI pipeline',
      icon: Lucide.TestTube2, iconCls: 'text-rose-400 bg-rose-950/50 border-rose-800',
      content: '', filename: '09_Testing_QA.md', category: 'infra',
    },
    {
      id: 'deployment', number: '10', title: 'Deployment & DevOps',
      description: 'Dockerfile, docker-compose, CI/CD dengan GitHub Actions, dan production config',
      icon: Lucide.Rocket, iconCls: 'text-orange-400 bg-orange-950/50 border-orange-800',
      content: '', filename: '10_Deployment.md', category: 'infra',
    },
  ];
}

// ============================================================
// GENERATE PROMPT CONTENT PER MODULE
// ============================================================
function generatePromptContent(module: PromptModule, projectName: string, techStack: string[], blueprintInfo: string, tasksInfo: string): string {
  const techLine = techStack.join(', ') || 'React, TypeScript, Node.js, PostgreSQL, Tailwind CSS';
  const header = `# ${module.number}. ${module.title}
## Project: ${projectName}
## Tech Stack: ${techLine}

---

`;

  const contextBlock = blueprintInfo ? `## Context dari Blueprint Aplikasi

${blueprintInfo}

---

` : '';

  const contentMap: Record<string, string> = {
    setup: `${header}${contextBlock}## Instruksi untuk AI Coding Agent (Cursor/Copilot)

Buat struktur project lengkap untuk **${projectName}** dengan spesifikasi berikut:

### 1. Inisialisasi Project
\`\`\`bash
# Buat project baru
npm create vite@latest . -- --template react-ts
# atau
npx create-next-app@latest . --typescript --tailwind --eslint
\`\`\`

### 2. Install Dependencies
\`\`\`bash
# Core
npm install ${techLine.toLowerCase().includes('drizzle') ? 'drizzle-orm drizzle-kit' : 'prisma @prisma/client'}

# UI & Styling
npm install tailwindcss @radix-ui/react-* lucide-react class-variance-authority

# State & Data Fetching  
npm install @tanstack/react-query @tanstack/react-router

# Utilities
npm install zod sonner jszip date-fns
\`\`\`

### 3. Folder Structure
\`\`\`
${projectName.toLowerCase().replace(/\s+/g, '-')}/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   └── layout/       # Layout components
│   ├── routes/           # Page components
│   ├── lib/
│   │   ├── api.ts        # API client
│   │   └── utils.ts      # Helpers
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── server/
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── routes/       # API routes
│   │   └── database/     # DB connection & schema
├── .env.example
├── .cursorrules          # AI coding rules
└── README.md
\`\`\`

### 4. Konfigurasi .env
\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=3000
NODE_ENV=development
\`\`\`

### 5. TypeScript Config (tsconfig.json)
Pastikan path aliases dikonfigurasi:
\`\`\`json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
\`\`\`

**PENTING:** Buat file README.md yang lengkap dengan instruksi setup untuk developer lain.`,

    database: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **database schema lengkap** untuk ${projectName} menggunakan Drizzle ORM dengan PostgreSQL.

### Schema yang Dibutuhkan

Berdasarkan blueprint aplikasi, buat schema untuk semua tabel yang diperlukan:

\`\`\`typescript
// server/src/database/schema/index.ts
import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enum
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'superadmin']);
export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').default('user'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
\`\`\`

### Migration
\`\`\`bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Seed data
npx tsx src/database/seed.ts
\`\`\`

### Seed Data
Buat file seed.ts yang mengisi data awal:
- Admin user default (admin@${projectName.toLowerCase().replace(/\s+/g, '')}.com)
- Sample data untuk testing
- Lookup data (categories, roles, dll)

**Pastikan semua foreign key, index, dan constraint sudah benar!**`,

    auth: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Implementasikan **authentication system lengkap** untuk ${projectName}.

### 1. JWT Middleware
\`\`\`typescript
// server/src/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

### 2. Auth Routes
- **POST /api/v1/auth/register** — Registrasi + validasi email unik + hash password
- **POST /api/v1/auth/login** — Login + return access token (15m) + refresh token (7d)
- **POST /api/v1/auth/refresh** — Refresh access token
- **POST /api/v1/auth/logout** — Blacklist refresh token

### 3. Password Hashing
Gunakan bcrypt dengan salt rounds 12:
\`\`\`typescript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
\`\`\`

### 4. Frontend Auth Pages
Buat komponen:
- \`LoginForm\` dengan email + password + "remember me"
- \`RegisterForm\` dengan email, nama, password, konfirmasi password
- \`ForgotPasswordForm\`
- Auth guard HOC/wrapper untuk protected routes

**PENTING:** Simpan access token di memory (useState), refresh token di httpOnly cookie!`,

    api: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **semua API endpoints** yang dibutuhkan ${projectName}.

### Standard Response Format
\`\`\`typescript
// Semua endpoint HARUS menggunakan format ini
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  requestId: string;
  error?: { code: string; details?: any };
}
\`\`\`

### Endpoints yang Harus Dibuat
Berdasarkan blueprint:

\`\`\`
GET    /api/v1/projects        → List projects (paginated, with search)
POST   /api/v1/projects        → Create project (body: name, description)
GET    /api/v1/projects/:id    → Get project detail
PUT    /api/v1/projects/:id    → Update project
DELETE /api/v1/projects/:id    → Soft delete project

[Tambah endpoint lain sesuai blueprint...]
\`\`\`

### Validasi dengan Zod
\`\`\`typescript
import { z } from 'zod';
const CreateProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
});
\`\`\`

### Error Handling
Gunakan middleware error handler terpusat, bukan try/catch di setiap route.

**Pastikan semua endpoint:**
- Memiliki validasi input (Zod)
- Return standard response format
- Terlindungi auth middleware jika perlu
- Memiliki rate limiting`,

    landing: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **Landing Page** yang premium dan modern untuk ${projectName}.

### Sections yang Dibutuhkan

1. **Navbar** — Logo, navigasi, tombol Login & CTA
2. **Hero Section** — Headline kuat, sub-headline, CTA button, visual/screenshot
3. **Features Section** — 3-6 fitur utama dengan icon dan deskripsi
4. **How It Works** — 3 langkah mudah dengan ilustrasi
5. **Testimonials** — 3-5 testimonial dengan foto avatar
6. **Pricing Section** — 3 tier (Free, Pro, Enterprise)
7. **CTA Section** — Banner ajakan bertindak
8. **Footer** — Links, sosmed, copyright

### Design Requirements
- Dark mode dengan gradient yang elegan
- Animasi scroll reveal
- Responsive (mobile-first)
- Font: Inter atau Outfit dari Google Fonts
- Warna: sesuaikan dengan brand ${projectName}

### Contoh Headline
"[Kata kerja aktif] [hasil/manfaat] [tanpa/lebih cepat/lebih mudah]"

**Buat visual yang WOW! Gunakan glassmorphism, gradient, dan micro-animations.**`,

    dashboard: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **halaman Dashboard** yang informatif dan indah untuk ${projectName}.

### Layout Dashboard
\`\`\`
┌─────────────────────────────────────────────┐
│  Sidebar   │  Header (breadcrumb + notif)    │
│  - Logo    │─────────────────────────────────│
│  - Nav     │  KPI Cards (4 cards)            │
│  - User    │─────────────────────────────────│
│            │  Chart (70%) │ Recent List (30%)│
│            │──────────────────────────────────│
│            │  Quick Actions | Stats           │
└────────────┴─────────────────────────────────┘
\`\`\`

### Komponen yang Dibutuhkan
1. **KPICard** — Angka besar, label, persentase perubahan, trend icon
2. **ActivityChart** — Line/bar chart menggunakan Recharts atau Chart.js
3. **RecentList** — List 5-10 item terbaru dengan avatar dan timestamp
4. **QuickActions** — Grid tombol shortcut untuk aksi umum
5. **Sidebar** — Collapsible, dengan active state, dan user profile di bawah

### Data Fetching
\`\`\`typescript
// Gunakan React Query
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => api.dashboard.stats(),
  refetchInterval: 30000, // refresh tiap 30 detik
});
\`\`\`

**Pastikan skeleton loading state ada untuk semua widget!**`,

    crud: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **halaman CRUD** untuk semua modul utama ${projectName}.

### Pattern CRUD Standard

#### List Page
- Tabel data dengan kolom sortable
- Search bar + filter dropdown
- Pagination (10, 25, 50 per page)
- Tombol "Tambah Baru"
- Row actions: Edit, Delete, View Detail
- Bulk select + bulk delete

#### Create/Edit Form
- Modal atau halaman terpisah
- Validasi real-time dengan Zod
- Loading state saat submit
- Toast notification sukses/gagal
- Auto-reset form setelah sukses

#### Delete Confirmation
- Modal konfirmasi dengan nama item
- Tombol merah untuk konfirmasi
- Tombol batal dengan keyboard Escape

### Contoh Implementasi
\`\`\`typescript
// hooks/use-crud.ts
export function useCrud<T>(endpoint: string) {
  const queryClient = useQueryClient();
  
  const list = useQuery({ queryKey: [endpoint], queryFn: () => api.get(endpoint) });
  const create = useMutation({ mutationFn: (data: T) => api.post(endpoint, data), onSuccess: () => queryClient.invalidateQueries([endpoint]) });
  const update = useMutation({ mutationFn: ({ id, data }: any) => api.put(\`\${endpoint}/\${id}\`, data) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(\`\${endpoint}/\${id}\`) });
  
  return { list, create, update, remove };
}
\`\`\`

**Pastikan UX konsisten di semua halaman CRUD!**`,

    components: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat **library UI components** yang reusable untuk ${projectName}.

### Komponen Wajib

\`\`\`
src/components/ui/
├── button.tsx          # variants: default, outline, ghost, destructive
├── input.tsx           # dengan label, error state, prefix/suffix icon  
├── modal.tsx           # configurable size, closeable
├── table.tsx           # sortable columns, selectable rows
├── badge.tsx           # status badges dengan warna dinamis
├── card.tsx            # dengan header, content, footer slot
├── dropdown.tsx        # menu dengan search
├── avatar.tsx          # dengan fallback initials
├── skeleton.tsx        # loading state placeholder
├── toast.tsx           # notifikasi (gunakan Sonner)
├── tooltip.tsx         # hover tooltip
└── empty-state.tsx     # empty state dengan ilustrasi
\`\`\`

### Panduan Design System
- Gunakan CSS variables untuk colors (dark/light mode)
- Semua komponen HARUS support \`className\` prop untuk override
- Ikuti pola shadcn/ui
- Dokumen setiap prop dengan TypeScript

### Contoh Button
\`\`\`typescript
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}
\`\`\`

**Setiap komponen HARUS memiliki loading state dan empty state!**`,

    testing: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Setup **testing infrastructure** lengkap untuk ${projectName}.

### Unit Testing (Vitest)
\`\`\`bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
\`\`\`

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] }
});
\`\`\`

### Tests yang Harus Dibuat
1. **API Unit Tests** — Test setiap endpoint dengan mock database
2. **Component Tests** — Test render, props, dan interaksi
3. **Hook Tests** — Test custom hooks dengan renderHook
4. **Utils Tests** — Test helper functions

### E2E Testing (Playwright)
\`\`\`bash
npm install -D @playwright/test
\`\`\`

Flow yang harus ditest:
- Register → Login → Dashboard
- Create project → Edit → Delete
- Admin panel access control

### CI Pipeline
\`\`\`yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
\`\`\`

**Target coverage minimum 70%!**`,

    deployment: `${header}${contextBlock}## Instruksi untuk AI Coding Agent

Buat konfigurasi **deployment & DevOps** untuk ${projectName}.

### Dockerfile
\`\`\`dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
\`\`\`

### docker-compose.yml
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/${projectName.toLowerCase().replace(/\s+/g, '_')}
    depends_on: [db]
  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: ${projectName.toLowerCase().replace(/\s+/g, '_')}
      POSTGRES_PASSWORD: password
volumes:
  postgres_data:
\`\`\`

### CI/CD Pipeline (GitHub Actions)
\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & Push Docker Image
        run: |
          docker build -t ${projectName.toLowerCase().replace(/\s+/g, '-')}:latest .
          docker push your-registry/${projectName.toLowerCase().replace(/\s+/g, '-')}:latest
\`\`\`

**Jangan lupa: setup monitoring dengan health checks dan logging terpusat!**`,
  };

  return contentMap[module.id] || `${header}## ${module.title}\n\n${module.description}\n\nInstruksi untuk modul ini akan digenerate berdasarkan blueprint aplikasi Anda.`;
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
// MAIN PAGE
// ============================================================
function PromptPage() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Proyek Aplikasi");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [modules, setModules] = useState<PromptModule[]>(buildDefaultModules());
  const [activeId, setActiveId] = useState('setup');
  const [generating, setGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    Promise.all([
      api.projects.get(projectId).catch(() => null),
      api.projects.getTechnologies(projectId).catch(() => null),
      api.projects.getCanvas(projectId).catch(() => null),
      api.projects.getDocumentByType(projectId, "tasks").catch(() => null),
    ]).then(([proj, techs, canvas, tasksDoc]) => {
      const name = proj?.name || "Proyek Aplikasi";
      const tech = techs?.map((t: any) => t.technologyName) || [];
      const blueprintInfo = canvas?.blueprint
        ? `Halaman: ${canvas.blueprint.pages?.map((p: any) => `${p.name} (${p.route})`).join(', ')}. API: ${canvas.blueprint.apiEndpoints?.map((e: any) => `${e.method} ${e.path}`).join(', ')}. Tabel: ${canvas.blueprint.tables?.map((t: any) => t.name).join(', ')}.`
        : '';
      const tasksInfo = tasksDoc?.content || '';

      setProjectName(name);
      setTechStack(tech);

      // Pre-generate all module contents
      setModules(buildDefaultModules().map(mod => ({
        ...mod,
        content: generatePromptContent(mod, name, tech, blueprintInfo, tasksInfo),
      })));
    });
  }, []);

  async function handleGenerateAll() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) { toast.error("Tidak ada project aktif"); return; }
    setGenerating(true);
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const result = await api.generate.prompt(projectId, { provider });
      if (result?.content) {
        const raw = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'object') {
            setModules(prev => prev.map(mod => ({
              ...mod,
              content: parsed[mod.id] || mod.content,
            })));
            toast.success("Semua 10 prompt berhasil digenerate oleh AI!");
          }
        } catch { toast.info("Prompt digenerate — menggunakan template yang ada"); }
      }
    } catch { toast.error("Gagal generate prompt dari AI"); }
    finally { setGenerating(false); }
  }

  async function downloadZIP() {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const safeProjectName = projectName.replace(/\s+/g, '_');
      const rootFolder = zip.folder(`${safeProjectName}_Prompts`)!;
      const rulesFolder = rootFolder.folder('rules')!;

      // 10 prompt files
      modules.forEach(mod => {
        rootFolder.file(mod.filename, mod.content || `# ${mod.title}\n\nPrompt ini belum digenerate. Klik "Generate Semua" terlebih dahulu.`);
      });

      // README
      rootFolder.file('00_README.md', `# ${projectName} — AI Coding Prompts
> Generated by AI Workflow Studio

## Cara Menggunakan

Folder ini berisi **10 prompt terstruktur** untuk membangun ${projectName} secara sistematis dengan bantuan AI Coding Agent (Cursor, GitHub Copilot, Claude Code, dll).

## Urutan Pengerjaan

| # | File | Isi |
|---|------|-----|
${modules.map(m => `| ${m.number} | ${m.filename} | ${m.description} |`).join('\n')}

## Tips Penggunaan

1. **Mulai dari 01** — Jangan skip urutan! Setiap prompt bergantung pada hasil prompt sebelumnya.
2. **Paste ke Cursor** — Buka Cursor, tekan \`Ctrl+L\` (chat), lalu paste isi file prompt.
3. **Review setiap hasil** — Setelah AI coding selesai, review kode sebelum lanjut ke prompt berikutnya.
4. **Gunakan .cursorrules** — Copy isi \`rules/CURSOR_RULES.md\` ke file \`.cursorrules\` di root project Anda.

## Tech Stack
${techStack.length > 0 ? techStack.join(', ') : 'Lihat TECH_STACK.md'}
`);

      // Cursor Rules
      rulesFolder.file('CURSOR_RULES.md', `# .cursorrules — ${projectName}

Paste konten ini ke file \`.cursorrules\` di root project Anda.

---

\`\`\`
You are an expert full-stack developer building ${projectName}.

## Tech Stack
${techStack.join(', ') || 'React, TypeScript, Node.js, PostgreSQL'}

## Code Style Rules
1. Always use TypeScript strict mode
2. Use functional components with hooks (no class components)
3. Prefer async/await over .then()
4. Always handle errors with try/catch
5. Use meaningful variable names in English
6. Add JSDoc comments for complex functions
7. Validate all user inputs with Zod
8. Use early returns instead of deep nesting

## Architecture Rules
1. Separate business logic from UI components
2. Use custom hooks for reusable stateful logic
3. Keep components under 200 lines
4. API calls only in hooks or service files, never directly in components
5. Use constants for magic strings/numbers

## Response Format
- Always provide complete, working code
- Include import statements
- Add brief comments for complex logic
- Suggest tests for important functions
\`\`\`
`);

      // Code Conventions
      rulesFolder.file('CODE_CONVENTIONS.md', `# Code Conventions — ${projectName}

## Naming Conventions
- **Files:** kebab-case (\`user-profile.tsx\`)
- **Components:** PascalCase (\`UserProfile\`)
- **Functions:** camelCase (\`getUserById\`)
- **Constants:** UPPER_SNAKE_CASE (\`MAX_RETRY_COUNT\`)
- **Types/Interfaces:** PascalCase (\`interface UserProps\`)

## Folder Structure
\`\`\`
src/
├── components/ui/     # Reusable UI components
├── routes/            # Page components
├── hooks/             # Custom hooks
├── lib/               # API client, utilities
└── types/             # TypeScript types
\`\`\`

## Git Commit Format
\`\`\`
feat: add user authentication
fix: resolve login form validation bug
docs: update API documentation
refactor: simplify data fetching logic
\`\`\`

## API Response Standard
Semua API response HARUS menggunakan format:
\`\`\`json
{ "success": true, "message": "...", "data": {...} }
\`\`\`
`);

      // Tech Stack
      rulesFolder.file('TECH_STACK.md', `# Tech Stack — ${projectName}

## Teknologi yang Digunakan

${techStack.length > 0 ? techStack.map(t => `- **${t}**`).join('\n') : `- React + TypeScript
- Node.js + Express
- PostgreSQL + Drizzle ORM
- Tailwind CSS
- TanStack Query + Router`}

## Dependencies Utama

### Frontend
- \`@tanstack/react-query\` — Data fetching & caching
- \`@tanstack/react-router\` — Type-safe routing
- \`lucide-react\` — Icon library
- \`sonner\` — Toast notifications
- \`zod\` — Schema validation

### Backend
- \`express\` — HTTP server
- \`drizzle-orm\` — ORM
- \`jsonwebtoken\` — JWT auth
- \`bcrypt\` — Password hashing
- \`zod\` — Input validation

### DevTools
- \`vitest\` — Unit testing
- \`playwright\` — E2E testing
- \`drizzle-kit\` — DB migrations
`);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeProjectName}_AI_Prompts.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP berhasil diunduh dengan 10 prompt + rules folder!");
    } catch { toast.error("Gagal membuat ZIP"); }
    finally { setDownloadingZip(false); }
  }

  function copyActivePrompt() {
    const mod = modules.find(m => m.id === activeId);
    if (!mod?.content) return;
    navigator.clipboard.writeText(mod.content);
    toast.success(`Prompt "${mod.title}" disalin ke clipboard!`);
  }

  const activeModule = modules.find(m => m.id === activeId) || modules[0];
  const generatedCount = modules.filter(m => m.content).length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-5 py-2.5 backdrop-blur-md z-10 relative">
        <StageBar active={3} />
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate({ to: "/app/prd" })} variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-slate-700">
            <Lucide.ArrowLeft size={12} /> Blueprint
          </Button>
          <Button onClick={handleGenerateAll} disabled={generating} variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-violet-700/40 text-violet-400 hover:bg-violet-950/40">
            {generating ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Sparkles size={12} />}
            {generating ? "AI Generating..." : "Generate Semua (AI)"}
          </Button>
          <button onClick={copyActivePrompt} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition">
            <Lucide.Copy size={12} className="text-indigo-400" /> Copy Aktif
          </button>
          <Button onClick={downloadZIP} disabled={downloadingZip} size="sm" className="text-[11px] h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
            {downloadingZip ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Archive size={12} />}
            Unduh ZIP Lengkap
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Module List */}
        <aside className="w-72 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">10 AI Prompts</span>
              <span className="text-[10px] text-slate-500">{generatedCount}/10 siap</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all" style={{ width: `${(generatedCount / 10) * 100}%` }} />
            </div>
          </div>

          <div className="flex-1 p-3 space-y-1.5">
            {modules.map(mod => {
              const Icon = mod.icon;
              const isActive = mod.id === activeId;
              const hasContent = !!mod.content;
              return (
                <button key={mod.id} onClick={() => setActiveId(mod.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all",
                    isActive ? "bg-indigo-950/50 border border-indigo-700/40" : "hover:bg-slate-800/40 border border-transparent"
                  )}>
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black", mod.iconCls)}>
                    {mod.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-[11px] font-bold truncate", isActive ? "text-indigo-300" : "text-slate-300")}>{mod.title}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5 truncate">{mod.description}</div>
                  </div>
                  {hasContent && <Lucide.CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: Prompt Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Module Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/20">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-black", activeModule.iconCls)}>
                {activeModule.number}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">{activeModule.title}</h2>
                <p className="text-[11px] text-slate-500">{activeModule.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono">{activeModule.filename}</span>
              <button onClick={copyActivePrompt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition">
                <Lucide.Copy size={12} className="text-indigo-400" /> Copy
              </button>
            </div>
          </div>

          {/* Content Area */}
          {generating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative"><Lucide.Loader2 size={40} className="animate-spin text-violet-500" /><div className="absolute -inset-4 rounded-full border border-violet-500/20 animate-ping" /></div>
              <p className="text-sm text-slate-400 font-medium">AI sedang menyusun 10 prompt...</p>
              <p className="text-xs text-slate-600">Membaca blueprint, tasks, dan PRD Anda</p>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Line numbers */}
              <div className="select-none border-r border-border/50 bg-slate-950/20 px-3 py-4 text-right text-slate-600/40 font-mono text-[10px] leading-[1.75] min-w-[42px] overflow-hidden">
                {(activeModule.content || '').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              {/* Content */}
              <div className="flex-1 overflow-auto p-5">
                <pre className="text-slate-300 font-mono text-[12px] leading-[1.75] whitespace-pre-wrap break-words">
                  <code>{activeModule.content || '— Klik "Generate Semua (AI)" untuk mengisi prompt ini dengan konten yang disesuaikan dengan blueprint aplikasi Anda —'}</code>
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
