import { db } from '../../database/connection';
import { promptTemplates } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import type { BuiltPrompt } from '../providers/ai-provider.interface';
import type { ProjectContext } from '../context/context.types';
import type { GenerateType } from '../../shared/constants/app.constants';
import { ContextBuilder } from '../context/context-builder';

export class PromptBuilder {
  private contextBuilder = new ContextBuilder();

  async build(generateType: GenerateType, context: ProjectContext): Promise<BuiltPrompt> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.generateType, generateType),
          eq(promptTemplates.isActive, true),
          eq(promptTemplates.isDefault, true),
        ),
      )
      .limit(1);

    const contextText = this.contextBuilder.serializeToText(context);

    if (!template) {
      return this.buildFallbackPrompt(generateType, context, contextText);
    }

    const userPrompt = this.interpolate(template.userPrompt, {
      context: contextText,
      project_name: context.project.name,
      project_idea: context.project.idea,
      language: context.project.language === 'id' ? 'Indonesian' : 'English',
      ai_target: context.project.preferredAiTarget ?? 'any AI coding tool',
      tech_stack: context.technologies.map((t) => `${t.category}: ${t.technologyName}`).join(', '),
      existing_prd: context.existingDocuments.prd ?? 'Not yet generated',
      existing_architecture: context.existingDocuments.architecture ?? 'Not yet generated',
      existing_database: context.existingDocuments.database ?? 'Not yet generated',
    });

    return {
      systemPrompt: template.systemPrompt,
      developerPrompt: template.developerPrompt ?? undefined,
      userPrompt,
      config: {
        model: template.model ?? 'gemini-3.1-flash-lite-preview',
        temperature: Number(template.temperature ?? 0.7),
        maxTokens: generateType === 'canvas' || generateType === 'prompt' ? 32768 : generateType === 'prd' ? 16384 : (template.maxTokens ?? 8192),
        topP: Number(template.topP ?? 0.9),
      },
    };
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
  }

  private buildFallbackPrompt(
    generateType: GenerateType,
    context: ProjectContext,
    contextText: string,
  ): BuiltPrompt {
    const language = context.project.language === 'id' ? 'Indonesian' : 'English';
    const aiTarget = context.project.preferredAiTarget ?? 'AI coding tools';

    const systemPrompts: Record<string, string> = {
      prd: `You are an expert Product Manager. Generate a comprehensive Product Requirement Document (PRD) in ${language}. Output in clean Markdown format. IMPORTANT: Maintain clean Markdown syntax. Do NOT output empty bold asterisks or strange double-bold symbols like '****'. Ensure all bullet points, headings, and bold text are clean and properly spaced.`,
      architecture: `You are a Senior Software Architect. Generate a detailed Software Architecture document in ${language}. Include system components, patterns, and diagrams description in Markdown.`,
      database: `You are a Senior Database Architect. Generate a complete Database Design document in ${language}. Include all tables, columns, relationships, and indexes in Markdown.`,
      api: `You are a Senior Backend Engineer. Generate a comprehensive REST API Design document in ${language}. Include all endpoints, request/response schemas, and authentication in Markdown.`,
      tasks: `You are a Senior AI Developer and Architect. Generate a detailed Task Breakdown in ${language} tailored SPECIFICALLY for AI coding agents (like Cursor, Trae, Windsurf, or Antigravity) to execute via 'vibe coding'. DO NOT include human project management metrics like hour estimations, story points, or timelines. DO provide exact actionable technical steps (e.g., 'Create file X', 'Run command Y', 'Implement function Z') organized by development phases and dependencies in Markdown.`,
      prompt: `Hasilkan struktur file prompt modular untuk menginisialisasi KESELURUHAN AI workspace (untuk semua folder utama) berdasarkan blueprint dan PRD proyek ini.

PENTING:
1. Anda BEBAS menentukan berapa jumlah folder dan file yang dibutuhkan untuk membangun proyek ini (sesuaikan dengan kompleksitas fitur).
2. Setiap folder harus memiliki instruksi spesifik untuk modul tersebut.
3. JANGAN PERNAH membuat file bernama "README.md".
4. Setiap nama folder dan file HARUS diawali dengan angka urutan (contoh: 01_Project_Setup, 02_Database, dll. Dan untuk file: 01_instruksi.md, 02_schema.sql, dll).
5. WAJIB BUAT FILE TERAKHIR PER FOLDER: File paling akhir di setiap folder HARUS bernama "99_ringkasan.md".
6. Output Anda HARUS HANYA berupa JSON object murni tanpa pembungkus blok kode Markdown (\`\`\`json). Key adalah path file lengkap dengan foldernya, dan value adalah isi konten teks/Markdown-nya.

Format JSON yang Diharapkan:
{
  "01_Project_Setup/01_setup_utama.md": "# Project Setup\\n...",
  "01_Project_Setup/99_ringkasan.md": "Ringkasan setup...",
  "02_Database/01_skema.md": "# Database\\n...",
  "02_Database/99_ringkasan.md": "Ringkasan database..."
}`,
      canvas: `You are a Senior Software Architect and Full-Stack System Designer. Generate a COMPREHENSIVE and COMPLEX feature canvas structure for this project. You MUST generate between 12 and 15 feature objects. Each feature MUST have detailed sub-features, complete SQL schemas, and actionable AI agent tasks. Output ONLY a valid JSON array with no explanations and no markdown code blocks. The JSON must be directly parseable by JSON.parse().`,
      workflow: `You are a Senior Software Architect. Generate a complete development workflow overview in ${language}. Markdown format.`,
    };

    const userPrompt = generateType === 'canvas'
      ? `Analyze this project idea and generate a COMPREHENSIVE feature canvas in ${language}:\n\nProject Idea: ${context.project.idea}\nTech Stack: ${context.technologies.map((t) => `${t.category}: ${t.technologyName}`).join(', ')}\n\nGenerate a JSON array of EXACTLY 12-15 features. The features should cover these domains (adapt to the project): Authentication & Security, Dashboard & Analytics, User Management & Roles, Core Domain Feature 1, Core Domain Feature 2, Core Domain Feature 3, Payment & Billing (if relevant), Notifications & Messaging, Search & Filtering, Reports & Exports, Settings & Configuration, Admin Panel, API Integration Management, Mobile/PWA Support, and Audit Logs & Monitoring.\n\nEach feature object MUST follow this EXACT format:\n[\n  {\n    "name": "Feature Name in ${language}",\n    "iconName": "lucide-icon-name",\n    "phase": "Fase N: Phase Description in ${language}",\n    "subs": [\n      "Sub-feature 1 with detail",\n      "Sub-feature 2 with detail",\n      "Sub-feature 3 with detail",\n      "Sub-feature 4 with detail",\n      "Sub-feature 5 with detail",\n      "Sub-feature 6 with detail"\n    ],\n    "sqlSchema": [\n      "CREATE TABLE table1 (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\\n  name VARCHAR(255) NOT NULL,\\n  created_at TIMESTAMPTZ DEFAULT NOW(),\\n  updated_at TIMESTAMPTZ DEFAULT NOW()\\n);\\nCREATE INDEX idx_table1_user_id ON table1(user_id);",\n      "CREATE TABLE table2 (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  table1_id UUID REFERENCES table1(id) ON DELETE CASCADE,\\n  status VARCHAR(50) DEFAULT 'active',\\n  metadata JSONB,\\n  created_at TIMESTAMPTZ DEFAULT NOW()\\n);"\n    ],\n    "tasks": [\n      "1. [SETUP] Configure environment variables and run database migrations for this feature",\n      "2. [BACKEND] Create Express router, controller, and service files for this feature with full CRUD",\n      "3. [AUTH] Implement authorization middleware to protect this feature's endpoints",\n      "4. [FRONTEND] Build React components (list view, form modal, detail page) for this feature",\n      "5. [TESTING] Write integration tests for this feature's API endpoints"\n    ]\n  }\n]\n\nOrganize phases as: Fase 1 (Core Infrastructure: Auth, Dashboard), Fase 2 (Core Features: main business logic), Fase 3 (Advanced Features: integrations, reports), Fase 4 (Polish & Scale: performance, admin, monitoring). Use simple lowercase lucide icon names like: shield, layout-dashboard, users, package, bell, settings, credit-card, bar-chart-2, search, file, mail, lock, zap, cloud, smartphone. Output ONLY the JSON array.`
      : `Based on the following project context, generate the ${generateType.toUpperCase()} document:\n\n${contextText}`;

    return {
      systemPrompt: systemPrompts[generateType] ?? systemPrompts.prd,
      userPrompt,
      config: {
        model: 'gemini-3.1-flash-lite-preview',
        temperature: 0.7,
        maxTokens: generateType === 'canvas' || generateType === 'prompt' ? 32768 : generateType === 'prd' ? 16384 : 8192,
        topP: 0.9,
      },
    };
  }
}
