import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import JSZip from "jszip";
import { ClaudeCollaboratorModal } from "@/components/claude-collaborator-modal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/prompt")({ component: PromptPage });

// ============================================================
// TYPES FOR DYNAMIC WORKSPACE
// ============================================================
interface PromptFile {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface PromptModule {
  id: string;
  number: string;
  title: string;
  description: string;
  filename: string;
}

interface PromptFolder {
  id: string;
  name: string;
  description: string;
  files: PromptFile[];
}

// ============================================================
// 10 DEFAULT FOLDERS & FILES BUILDER
// ============================================================
function buildDefaultFolders(projectName: string, techStack: string[], blueprintInfo: string, tasksInfo: string, prdInfo: string): PromptFolder[] {
  const techLine = techStack.join(', ') || 'React, TypeScript, Node.js, PostgreSQL, Tailwind CSS';
  const folders: PromptFolder[] = [
    {
      id: 'f_setup', name: '01_Project_Setup', description: 'Setup, inisialisasi folder, dan rules konfigurasi',
      files: [
        {
          id: 'file_setup_prompt',
          name: '01_Project_Setup.md',
          description: 'Instruksi setup project utama',
          content: generatePromptContent({ id: 'setup', number: '01', title: 'Project Setup & Structure', description: '', filename: '01_Project_Setup.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        },
        {
          id: 'file_cursorrules',
          name: '.cursorrules',
          description: 'Sistem rules AI Agent',
          content: `You are an expert full-stack developer building ${projectName}.

## Tech Stack
${techLine}

## Code Style Rules
1. Always use TypeScript strict mode.
2. Maintain modular file architecture.
3. Handle error exceptions cleanly.
4. JANGAN gunakan placeholder. Tulis kode fungsional penuh.`,
        }
      ]
    },
    {
      id: 'f_database', name: '02_Database_Migration', description: 'Skema database PostgreSQL, Drizzle ORM, dan seed data',
      files: [
        {
          id: 'file_db_prompt',
          name: '02_Database_Migration.md',
          description: 'Instruksi Drizzle migration',
          content: generatePromptContent({ id: 'database', number: '02', title: 'Database Schema & Migration', description: '', filename: '02_Database_Migration.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        },
        {
          id: 'file_db_schema',
          name: 'schema.sql',
          description: 'SQL DDL schema murni',
          content: '-- PostgreSQL SQL DDL schema\n-- Silakan generate dari AI atau tulis di sini.',
        }
      ]
    },
    {
      id: 'f_auth', name: '03_Auth_System', description: 'Autentikasi register, login, JWT token, dan auth middleware',
      files: [
        {
          id: 'file_auth_prompt',
          name: '03_Auth_System.md',
          description: 'Instruksi pembuatan Auth system',
          content: generatePromptContent({ id: 'auth', number: '03', title: 'Authentication System', description: '', filename: '03_Auth_System.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_api', name: '04_API_Endpoints', description: 'API routes, controller, validasi Zod, dan standard error handling',
      files: [
        {
          id: 'file_api_prompt',
          name: '04_API_Endpoints.md',
          description: 'Instruksi core API routes',
          content: generatePromptContent({ id: 'api', number: '04', title: 'Core API Endpoints', description: '', filename: '04_API_Endpoints.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_landing', name: '05_Landing_Page', description: 'Tampilan marketing landing page responsive',
      files: [
        {
          id: 'file_landing_prompt',
          name: '05_Landing_Page.md',
          description: 'Instruksi Landing page',
          content: generatePromptContent({ id: 'landing', number: '05', title: 'Landing Page & Marketing', description: '', filename: '05_Landing_Page.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_dashboard', name: '06_Dashboard', description: 'Halaman dashboard internal user/admin, widget KPI, dan charts',
      files: [
        {
          id: 'file_dashboard_prompt',
          name: '06_Dashboard.md',
          description: 'Instruksi Dashboard UI',
          content: generatePromptContent({ id: 'dashboard', number: '06', title: 'Dashboard & Analytics', description: '', filename: '06_Dashboard.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_crud', name: '07_CRUD_Modules', description: 'Modul halaman list data, form entri, edit, dan delete confirmation',
      files: [
        {
          id: 'file_crud_prompt',
          name: '07_CRUD_Modules.md',
          description: 'Instruksi CRUD core modules',
          content: generatePromptContent({ id: 'crud', number: '07', title: 'Core CRUD Modules', description: '', filename: '07_CRUD_Modules.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_components', name: '08_UI_Components', description: 'Reusable UI elements, form elements, dialog, dan tables',
      files: [
        {
          id: 'file_components_prompt',
          name: '08_UI_Components.md',
          description: 'Instruksi UI library components',
          content: generatePromptContent({ id: 'components', number: '08', title: 'UI Component Library', description: '', filename: '08_UI_Components.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_testing', name: '09_Testing_QA', description: 'Setup unit testing (Vitest) dan E2E testing (Playwright)',
      files: [
        {
          id: 'file_testing_prompt',
          name: '09_Testing_QA.md',
          description: 'Instruksi testing QA',
          content: generatePromptContent({ id: 'testing', number: '09', title: 'Testing & Quality Assurance', description: '', filename: '09_Testing_QA.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        }
      ]
    },
    {
      id: 'f_deployment', name: '10_Deployment_DevOps', description: 'Dockerization, script docker-compose, dan GitHub Actions CI/CD',
      files: [
        {
          id: 'file_deploy_prompt',
          name: '10_Deployment.md',
          description: 'Instruksi deployment & DevOps',
          content: generatePromptContent({ id: 'deployment', number: '10', title: 'Deployment & DevOps', description: '', filename: '10_Deployment.md' } as any, projectName, techStack, blueprintInfo, tasksInfo, prdInfo),
        },
        {
          id: 'file_dockerfile',
          name: 'Dockerfile',
          description: 'Docker build definition',
          content: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,
        }
      ]
    }
  ];
  return folders;
}

// ============================================================
// GENERATE PROMPT CONTENT PER MODULE
// ============================================================
function generatePromptContent(module: PromptModule, projectName: string, techStack: string[], blueprintInfo: string, tasksInfo: string, prdInfo: string): string {
  const techLine = techStack.join(', ') || 'React, TypeScript, Node.js, PostgreSQL, Tailwind CSS';
  
  // Unpack PRD content jika berupa JSON string
  let cleanPrd = prdInfo;
  try {
    const wrapper = JSON.parse(prdInfo);
    if (wrapper && typeof wrapper === 'object' && wrapper.content) {
      cleanPrd = wrapper.content;
    }
  } catch {}

  const header = `# ${module.number}. ${module.title}
## Project: ${projectName}
## Tech Stack: ${techLine}

=== ATURAN LINGKUP & PENCEGAHAN HALUSINASI (SCOPE CONTROL RULES) ===
1. LINGKUP MODUL: Fokus HANYA untuk membuat kode dan berkas yang relevan dengan modul "${module.title}". JANGAN membuat fitur di luar spesifikasi Blueprint, Tasks, atau dokumen PRD.
2. LARANGAN HALUSINASI: Jangan berasumsi atau membuat fitur fungsional tambahan jika tidak tertulis eksplisit di PRD. Jauhkan dari penambahan dependensi baru tanpa persetujuan.
3. BEBAS PLACEHOLDER: Jangan menulis kode secara asal, terpotong, atau menuliskan komentar "// TODO: implementasi". Tulis kode yang fully functional dan production-ready.
4. KONSISTENSI STACK: Patuhi stack teknologi pilihan (${techLine}) secara murni.

---

`;

  const canvasBlock = blueprintInfo ? `## Context dari Canvas Blueprint
${blueprintInfo}

---

` : '';

  const prdBlock = cleanPrd ? `## Dokumen Spesifikasi PRD Proyek (Requirement Utama)
${cleanPrd.slice(0, 6000)}

---

` : '';

  const contextBlock = `${canvasBlock}${prdBlock}`;

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
  const [folders, setFolders] = useState<PromptFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('f_setup');
  const [activeFileId, setActiveFileId] = useState<string | null>('file_setup_prompt');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'f_setup': true });
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [generatingActive, setGeneratingActive] = useState(false);

  async function savePromptsToDb(targetFolders: PromptFolder[]) {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    try {
      await api.projects.saveDocumentManual(projectId, "prompt", { content: JSON.stringify(targetFolders) });
    } catch {}
  }

  useEffect(() => {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) return;
    Promise.all([
      api.projects.get(projectId).catch(() => null),
      api.projects.getTechnologies(projectId).catch(() => null),
      api.projects.getCanvas(projectId).catch(() => null),
      api.projects.getDocumentByType(projectId, "tasks").catch(() => null),
      api.projects.getDocumentByType(projectId, "prd").catch(() => null),
      api.projects.getDocumentByType(projectId, "prompt").catch(() => null),
    ]).then(([proj, techs, canvas, tasksDoc, prdDoc, promptDoc]) => {
      const name = proj?.name || "Proyek Aplikasi";
      const tech = techs?.map((t: any) => t.technologyName) || [];
      const blueprintInfo = canvas?.features
        ? `Halaman: ${canvas.features.pages?.map((p: any) => `${p.name} (${p.route})`).join(', ')}. API: ${canvas.features.apiEndpoints?.map((e: any) => `${e.method} ${e.path}`).join(', ')}. Tabel: ${canvas.features.tables?.map((t: any) => t.name).join(', ')}.`
        : '';
      const tasksInfo = tasksDoc?.content || '';
      const prdInfo = prdDoc?.content || '';

      setProjectName(name);
      setTechStack(tech);

      // Coba load data prompt yang tersimpan di DB
      let initialFolders: PromptFolder[] = [];
      if (promptDoc?.content) {
        try {
          const parsed = JSON.parse(promptDoc.content);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].files) {
            initialFolders = parsed;
          }
        } catch {}
      }

      // Jika data DB kosong, inisialisasi dengan default folders
      if (initialFolders.length === 0) {
        initialFolders = buildDefaultFolders(name, tech, blueprintInfo, tasksInfo, prdInfo);
        // Simpan inisialisasi default ke DB agar konsisten
        api.projects.saveDocumentManual(projectId, "prompt", { content: JSON.stringify(initialFolders) }).catch(() => {});
      }

      setFolders(initialFolders);

      // Auto-trigger AI generate jika datang dari Blueprint page
      const autoGen = localStorage.getItem("auto_trigger_prompt_gen");
      if (autoGen === "true") {
        localStorage.removeItem("auto_trigger_prompt_gen");
        // Trigger generate all setelah set state selesai
        setTimeout(() => {
          handleGenerateAll();
        }, 800);
      }
    });
  }, []);

  async function handleGenerateAll() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) { toast.error("Tidak ada project aktif"); return; }
    setGenerating(true);
    const genToast = toast.loading("AI sedang men-generate modul prompt...");
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const result = await api.generate.prompt(projectId, { provider });
      if (result?.content) {
        // Unpack JSON wrapper jika respons dibungkus dalam object content
        let text = result.content;
        try {
          const wrapper = JSON.parse(result.content);
          if (wrapper && typeof wrapper === 'object' && wrapper.content) {
            text = wrapper.content;
          }
        } catch {}

        const raw = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const updated = folders.map(folder => ({
              ...folder,
              files: folder.files.map(file => {
                let matchedContent = file.content;
                Object.entries(parsed).forEach(([key, val]) => {
                  if (file.id.includes(key) || file.name.toLowerCase().includes(key.toLowerCase())) {
                    matchedContent = val as string;
                  }
                });
                return { ...file, content: matchedContent };
              })
            }));
            setFolders(updated);
            await savePromptsToDb(updated);
            toast.success("Semua prompt berhasil digenerate oleh AI!", { id: genToast });
          } else {
            toast.error("Format JSON AI tidak valid", { id: genToast });
          }
        } catch {
          toast.error("Gagal memproses JSON respons AI", { id: genToast });
        }
      }
    } catch { 
      toast.error("Gagal generate prompt dari AI", { id: genToast }); 
    } finally { 
      setGenerating(false); 
    }
  }

  async function handleGenerateActive() {
    const projectId = localStorage.getItem("active_project_id");
    if (!projectId) { toast.error("Tidak ada project aktif"); return; }
    const activeFile = folders.flatMap(f => f.files).find(f => f.id === activeFileId);
    const activeFolder = folders.find(f => f.id === activeFolderId);
    if (!activeFile || !activeFolder) { toast.error("Pilih file prompt terlebih dahulu"); return; }
    
    setGeneratingActive(true);
    const modToast = toast.loading(`AI sedang menyusun prompt untuk "${activeFile.name}"...`);
    try {
      const provider = localStorage.getItem("active_provider") ?? undefined;
      const result = await api.generate.prompt(projectId, { 
        provider, 
        revisionInstructions: `INSTRUKSI MANDAT: Hasilkan HANYA instruksi prompt spesifik dan detail untuk file "${activeFile.name}" (Modul Folder: "${activeFolder.name}"). Jangan hasilkan modul lain. Tulis konten prompt file ini langsung dalam format markdown murni tanpa dibungkus objek JSON atau block code JSON.`
      });
      
      if (result?.content) {
        let cleanText = result.content;
        try {
          const wrapper = JSON.parse(result.content);
          if (wrapper && typeof wrapper === 'object') {
            cleanText = wrapper.content || wrapper[activeFile.id] || result.content;
          }
        } catch {}

        // Remove any enclosing backticks if AI formatted as markdown code block
        if (cleanText.startsWith("```markdown")) cleanText = cleanText.substring(11);
        if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
        if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
        cleanText = cleanText.trim();

        const updated = folders.map(f => ({
          ...f,
          files: f.files.map(file => file.id === activeFileId ? { ...file, content: cleanText } : file)
        }));
        setFolders(updated);
        await savePromptsToDb(updated);
        toast.success(`Prompt "${activeFile.name}" berhasil di-generate!`, { id: modToast });
      }
    } catch {
      toast.error(`Gagal generate prompt "${activeFile.name}"`, { id: modToast });
    } finally {
      setGeneratingActive(false);
    }
  }

  async function downloadZIP() {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const safeProjectName = projectName.replace(/\s+/g, '_');
      const rootFolder = zip.folder(`${safeProjectName}_Prompts`)!;
      const rulesFolder = rootFolder.folder('rules')!;

      // Zipping folders and files hierarchically
      folders.forEach(folder => {
        const folderZip = rootFolder.folder(folder.name)!;
        folder.files.forEach(file => {
          folderZip.file(file.name, file.content || `# ${file.name}\n\nPrompt ini belum digenerate. Klik "Generate AI" atau gunakan bantuan Claude untuk melengkapinya.`);
        });
      });

      // README
      rootFolder.file('00_README.md', `# ${projectName} — AI Coding Prompts
> Generated by AI Workflow Studio

## Cara Menggunakan

Folder ini berisi **10 prompt terstruktur** untuk membangun ${projectName} secara sistematis dengan bantuan AI Coding Agent (Cursor, GitHub Copilot, Claude Code, dll).

## Urutan Pengerjaan

| # | File | Isi |
|---|------|-----|
${folders.flatMap(f => f.files).map((file, i) => `| ${String(i + 1).padStart(2, '0')} | ${file.name} | ${file.description} |`).join('\n')}

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

  // Dialog state
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [targetFolderIdForNewFile, setTargetFolderIdForNewFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileDesc, setNewFileDesc] = useState('');

  function handleAddFolder() {
    if (!newFolderName.trim()) { toast.error("Nama folder tidak boleh kosong"); return; }
    const newFolder: PromptFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim().replace(/\s+/g, '_'),
      description: newFolderDesc.trim() || 'Custom Folder',
      files: []
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    savePromptsToDb(updated);
    setActiveFolderId(newFolder.id);
    setActiveFileId(null);
    setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
    setShowAddFolderModal(false);
    setNewFolderName('');
    setNewFolderDesc('');
    toast.success(`Folder "${newFolder.name}" berhasil dibuat!`);
  }

  function handleAddFile() {
    if (!targetFolderIdForNewFile || !newFileName.trim()) { toast.error("Nama file tidak boleh kosong"); return; }
    const newFile: PromptFile = {
      id: `file_${Date.now()}`,
      name: newFileName.trim().endsWith('.md') ? newFileName.trim() : `${newFileName.trim()}.md`,
      description: newFileDesc.trim() || 'Custom Prompt File',
      content: ''
    };
    const updated = folders.map(f => {
      if (f.id === targetFolderIdForNewFile) {
        return { ...f, files: [...f.files, newFile] };
      }
      return f;
    });
    setFolders(updated);
    savePromptsToDb(updated);
    setActiveFolderId(targetFolderIdForNewFile);
    setActiveFileId(newFile.id);
    setShowAddFileModal(false);
    setNewFileName('');
    setNewFileDesc('');
    toast.success(`File "${newFile.name}" berhasil dibuat!`);
  }

  function handleDeleteFolder(folderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus folder ini beserta seluruh file di dalamnya?")) return;
    const updated = folders.filter(f => f.id !== folderId);
    setFolders(updated);
    savePromptsToDb(updated);
    if (activeFolderId === folderId) {
      const fallbackFolder = updated[0];
      setActiveFolderId(fallbackFolder?.id || '');
      setActiveFileId(fallbackFolder?.files[0]?.id || null);
    }
    toast.success("Folder berhasil dihapus");
  }

  function handleDeleteFile(folderId: string, fileId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus file ini?")) return;
    const updated = folders.map(f => {
      if (f.id === folderId) {
        return { ...f, files: f.files.filter(file => file.id !== fileId) };
      }
      return f;
    });
    setFolders(updated);
    savePromptsToDb(updated);
    if (activeFileId === fileId) {
      setActiveFileId(null);
    }
    toast.success("File berhasil dihapus");
  }

  function handleUpdateFileContent(newVal: string) {
    if (!activeFileId || !activeFolderId) return;
    const updated = folders.map(f => {
      if (f.id === activeFolderId) {
        return {
          ...f,
          files: f.files.map(file => file.id === activeFileId ? { ...file, content: newVal } : file)
        };
      }
      return f;
    });
    setFolders(updated);
    savePromptsToDb(updated);
  }

  function handleImportClaudeJson(newContent: string) {
    try {
      let text = newContent;
      try {
        const wrapper = JSON.parse(newContent);
        if (wrapper && typeof wrapper === 'object' && wrapper.content) {
          text = wrapper.content;
        }
      } catch {}

      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed && typeof parsed === 'object') {
        const draftFolders: PromptFolder[] = JSON.parse(JSON.stringify(folders));

        Object.entries(parsed).forEach(([key, val]) => {
          const fileContent = val as string;
          let folderName = '01_Project_Setup';
          let fileName = key;

          if (key.includes('/')) {
            const parts = key.split('/');
            folderName = parts[0].trim().replace(/\s+/g, '_');
            fileName = parts.slice(1).join('/').trim();
          }

          // Cari atau buat folder
          let targetFolder = draftFolders.find(
            f => f.name.toLowerCase() === folderName.toLowerCase() || f.id === folderName
          );
          if (!targetFolder) {
            targetFolder = {
              id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: folderName,
              description: `Generated folder for ${folderName}`,
              files: []
            };
            draftFolders.push(targetFolder);
          }

          // Cari atau buat file
          let targetFile = targetFolder.files.find(
            file => file.name.toLowerCase() === fileName.toLowerCase() || file.id === fileName
          );
          if (targetFile) {
            targetFile.content = fileContent;
          } else {
            targetFolder.files.push({
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: fileName,
              description: `Generated file for ${fileName}`,
              content: fileContent
            });
          }
        });

        setFolders(draftFolders);
        savePromptsToDb(draftFolders);
        toast.success("Prompt & files berhasil di-import dari Claude!");
      } else {
        toast.error("Format respons tidak valid. Pastikan berupa JSON object.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses JSON Claude. Pastikan format JSON sesuai.");
    }
  }

  const activeFolder = folders.find(f => f.id === activeFolderId) || folders[0];
  const activeFile = activeFolder?.files.find(file => file.id === activeFileId) || null;

  function copyActivePrompt() {
    if (!activeFile?.content) { toast.error("File tidak memiliki konten"); return; }
    navigator.clipboard.writeText(activeFile.content);
    toast.success(`Prompt "${activeFile.name}" disalin ke clipboard!`);
  }

  const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);
  const readyFiles = folders.reduce((sum, f) => sum + f.files.filter(file => file.content.trim()).length, 0);
  const pctReady = totalFiles > 0 ? Math.round((readyFiles / totalFiles) * 100) : 0;

  const projectId = localStorage.getItem("active_project_id");

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
          
          <ClaudeCollaboratorModal
            projectId={projectId || ""}
            documentType="prompt"
            onSaveSuccess={handleImportClaudeJson}
          />

          <Button onClick={downloadZIP} disabled={downloadingZip} size="sm" className="text-[11px] h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
            {downloadingZip ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Archive size={12} />}
            Unduh ZIP Lengkap
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Folder Tree Sidebar */}
        <aside className="w-72 border-r border-border bg-card/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Prompt Workspace</span>
              <span className="text-[10px] text-slate-500">{readyFiles}/{totalFiles} file siap</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all" style={{ width: `${pctReady}%` }} />
            </div>
            <Button
              onClick={() => setShowAddFolderModal(true)}
              variant="outline"
              size="sm"
              className="w-full text-[10px] h-7 gap-1 border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800"
            >
              <Lucide.FolderPlus size={11} className="mr-0.5" /> Tambah Folder
            </Button>
          </div>

          <div className="flex-1 p-3 space-y-1.5 overflow-y-auto font-sans">
            {folders.map(folder => {
              const isExpanded = expandedFolders[folder.id];
              const isActiveFolder = folder.id === activeFolderId && activeFileId === null;
              
              return (
                <div key={folder.id} className="space-y-1">
                  {/* Folder Item */}
                  <div
                    onClick={() => {
                      setActiveFolderId(folder.id);
                      setActiveFileId(null); // Show folder view
                      setExpandedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }));
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group",
                      isActiveFolder ? "bg-indigo-950/40 border border-indigo-800/40" : "hover:bg-slate-800/20 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <Lucide.ChevronDown size={13} className="text-slate-500 shrink-0" />
                      ) : (
                        <Lucide.ChevronRight size={13} className="text-slate-500 shrink-0" />
                      )}
                      <Lucide.Folder size={13} className="text-indigo-400 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-300 truncate">{folder.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Tambah File"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetFolderIdForNewFile(folder.id);
                          setShowAddFileModal(true);
                        }}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400"
                      >
                        <Lucide.Plus size={11} />
                      </button>
                      {folders.length > 1 && (
                        <button
                          title="Hapus Folder"
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                        >
                          <Lucide.Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Folder's Files (Expanded) */}
                  {isExpanded && (
                    <div className="pl-6 space-y-1">
                      {folder.files.map(file => {
                        const isActiveFile = file.id === activeFileId;
                        const hasContent = !!file.content.trim();
                        
                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              setActiveFolderId(folder.id);
                              setActiveFileId(file.id);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group/file",
                              isActiveFile ? "bg-slate-800/80 border border-slate-700/80" : "hover:bg-slate-800/20 border border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Lucide.FileText size={12} className={cn("shrink-0", hasContent ? "text-emerald-400" : "text-slate-500")} />
                              <span className="text-[10.5px] text-slate-400 group-hover/file:text-slate-200 truncate">{file.name}</span>
                            </div>

                            <button
                              onClick={(e) => handleDeleteFile(folder.id, file.id, e)}
                              className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover/file:opacity-100 transition-opacity"
                            >
                              <Lucide.Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {folder.files.length === 0 && (
                        <div className="text-[9.5px] text-slate-600 pl-6 py-1 italic">Folder kosong</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: Workspace Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/15">
          {activeFileId === null && activeFolder ? (
            /* Folder Dashboard View */
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shrink-0">
                    <Lucide.Folder size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">{activeFolder.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{activeFolder.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGenerateAll}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-8 gap-1 border-violet-700/40 text-violet-400 hover:bg-violet-950/40"
                  >
                    {generating ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Sparkles size={12} />}
                    Generate Folder (AI)
                  </Button>
                  
                  <ClaudeCollaboratorModal
                    projectId={projectId || ""}
                    documentType="prompt"
                    onSaveSuccess={handleImportClaudeJson}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar File Prompt ({activeFolder.files.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeFolder.files.map(file => (
                    <div
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-700/60 transition-all cursor-pointer flex justify-between items-start"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Lucide.FileText size={12} className={file.content.trim() ? "text-emerald-400" : "text-slate-500"} />
                          {file.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">{file.description}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded font-semibold",
                        file.content.trim() ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-slate-800/40 text-slate-500 border border-slate-700/40"
                      )}>
                        {file.content.trim() ? "Ready" : "Kosong"}
                      </span>
                    </div>
                  ))}
                  
                  {activeFolder.files.length === 0 && (
                    <div className="col-span-2 text-center py-8 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                      Folder ini belum memiliki file prompt. Klik "+" di sebelah nama folder untuk menambahkan file baru.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeFile ? (
            /* File Content Editor/Viewer View */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Lucide.FileText size={16} className="text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold text-slate-100 truncate">{activeFile.name}</h2>
                    <p className="text-[10px] text-slate-500 truncate">di dalam folder {activeFolder.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode Tabs */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setEditMode(false)}
                      className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition", !editMode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition", editMode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
                    >
                      Edit Raw
                    </button>
                  </div>

                  <span className="w-[1px] h-5 bg-slate-800 mx-1" />

                  <Button
                    onClick={handleGenerateActive}
                    disabled={generatingActive || generating}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7.5 gap-1 border-slate-700 bg-slate-900 text-violet-400 hover:bg-slate-800"
                  >
                    {generatingActive ? <Lucide.Loader2 size={11} className="animate-spin text-violet-500" /> : <Lucide.Sparkles size={11} />}
                    Generate AI (File Ini)
                  </Button>
                  
                  <button onClick={copyActivePrompt} className="flex items-center gap-1 h-7.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[10px] font-bold text-slate-300 hover:bg-slate-800 transition">
                    <Lucide.Copy size={11} className="text-indigo-400" /> Copy
                  </button>
                </div>
              </div>

              {/* Editor/Viewer Workspace */}
              {generatingActive ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="relative"><Lucide.Loader2 size={40} className="animate-spin text-violet-500" /><div className="absolute -inset-4 rounded-full border border-violet-500/20 animate-ping" /></div>
                  <p className="text-sm text-slate-400 font-medium">AI sedang menyusun prompt untuk "${activeFile.name}"...</p>
                  <p className="text-xs text-slate-600">Membaca spesifikasi PRD dan database schema</p>
                </div>
              ) : editMode ? (
                /* Editable Textarea */
                <div className="flex-1 p-5 overflow-hidden">
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => handleUpdateFileContent(e.target.value)}
                    placeholder="# Tulis atau tempel konten prompt di sini..."
                    className="w-full h-full bg-slate-950/20 border border-slate-800/80 rounded-xl p-4 font-mono text-[12px] leading-relaxed text-slate-300 focus:outline-none focus:border-indigo-500/40 resize-none overflow-y-auto"
                  />
                </div>
              ) : (
                /* Markdown Preview Mode */
                <div className="flex-1 flex overflow-hidden">
                  {/* Line numbers */}
                  <div className="select-none border-r border-border/50 bg-slate-950/20 px-3 py-4 text-right text-slate-600/40 font-mono text-[10px] leading-[1.75] min-w-[42px] overflow-hidden">
                    {(activeFile.content || '').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  {/* Markdown content */}
                  <div className="flex-1 overflow-auto p-5">
                    {activeFile.content ? (
                      <pre className="text-slate-300 font-mono text-[12px] leading-[1.75] whitespace-pre-wrap break-words">
                        <code>{activeFile.content}</code>
                      </pre>
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs">
                        — Konten prompt kosong. Klik "Generate AI (File Ini)" di atas atau beralih ke "Edit Raw" untuk mengisinya secara manual —
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Pilih folder atau file di panel kiri untuk mulai bekerja.
            </div>
          )}
        </main>
      </div>

      {/* Dialog: Tambah Folder Baru */}
      <Dialog open={showAddFolderModal} onOpenChange={setShowAddFolderModal}>
        <DialogContent className="max-w-sm text-slate-100 bg-[#0c1017] border border-slate-800 p-5">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-indigo-400">
              <Lucide.Folder size={15} /> Buat Folder Prompt Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tambahkan kategori folder untuk mengorganisir rules/prompts Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Folder</label>
              <Input
                placeholder="01_Setup"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-8.5 text-xs bg-slate-900 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Singkat</label>
              <Input
                placeholder="Inisialisasi repo dan rules"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                className="h-8.5 text-xs bg-slate-900 border-slate-800 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-slate-850">
            <Button variant="ghost" size="sm" onClick={() => setShowAddFolderModal(false)} className="text-xs text-slate-400">
              Batal
            </Button>
            <Button size="sm" onClick={handleAddFolder} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
              Buat Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tambah File Baru */}
      <Dialog open={showAddFileModal} onOpenChange={setShowAddFileModal}>
        <DialogContent className="max-w-sm text-slate-100 bg-[#0c1017] border border-slate-800 p-5">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-400">
              <Lucide.FileText size={15} /> Buat File Prompt Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tambahkan file aturan baru di dalam folder terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nama File</label>
              <Input
                placeholder="CURSOR_RULES.md"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="h-8.5 text-xs bg-slate-900 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan</label>
              <Input
                placeholder="Aturan penulisan kode"
                value={newFileDesc}
                onChange={(e) => setNewFileDesc(e.target.value)}
                className="h-8.5 text-xs bg-slate-900 border-slate-800 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-slate-850">
            <Button variant="ghost" size="sm" onClick={() => setShowAddFileModal(false)} className="text-xs text-slate-400">
              Batal
            </Button>
            <Button size="sm" onClick={handleAddFile} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              Buat File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
