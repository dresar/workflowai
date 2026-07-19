import * as dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { encrypt, maskKey } from '../shared/utils/crypto.util';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../database/schema';
import { eq, and, notInArray, or, like } from 'drizzle-orm';

const databaseConnection = neon(process.env.DATABASE_URL!);
const db = drizzle(databaseConnection, { schema });

const technologiesData = [
  { name: 'React', category: 'Frontend', version: '19.0', description: 'UI library based on components', sortOrder: 1 },
  { name: 'Next.js', category: 'Frontend', version: '15.0', description: 'React framework with SSR/SSG', sortOrder: 2 },
  { name: 'Vue', category: 'Frontend', version: '3.5', description: 'Progressive JavaScript framework', sortOrder: 3 },
  { name: 'Svelte', category: 'Frontend', version: '5.0', description: 'Compile-time frontend framework', sortOrder: 4 },
  { name: 'Angular', category: 'Frontend', version: '19.0', description: 'Full-featured SPA framework', sortOrder: 5 },
  { name: 'Node.js', category: 'Backend', version: '22.0', description: 'JavaScript runtime', sortOrder: 10 },
  { name: 'NestJS', category: 'Backend', version: '10.0', description: 'Enterprise Node framework', sortOrder: 11 },
  { name: 'Express.js', category: 'Backend', version: '5.0', description: 'Minimal Node web framework', sortOrder: 12 },
  { name: 'Django', category: 'Backend', version: '5.1', description: 'Python web framework', sortOrder: 13 },
  { name: 'Laravel', category: 'Backend', version: '11.0', description: 'PHP web framework', sortOrder: 14 },
  { name: 'Go (Fiber)', category: 'Backend', version: '2.0', description: 'Go web framework', sortOrder: 15 },
  { name: 'PostgreSQL', category: 'Database', version: '16.0', description: 'Advanced SQL relational database', sortOrder: 20 },
  { name: 'MySQL', category: 'Database', version: '8.4', description: 'Popular SQL database', sortOrder: 21 },
  { name: 'MongoDB', category: 'Database', version: '7.0', description: 'NoSQL document database', sortOrder: 22 },
  { name: 'SQLite', category: 'Database', version: '3.45', description: 'Embedded SQL database', sortOrder: 23 },
  { name: 'Redis', category: 'Database', version: '7.4', description: 'In-memory data store', sortOrder: 24 },
  { name: 'Vercel', category: 'Deployment', version: '-', description: 'Frontend deployment platform', sortOrder: 30 },
  { name: 'Netlify', category: 'Deployment', version: '-', description: 'JAMstack deployment', sortOrder: 31 },
  { name: 'Cloudflare Workers', category: 'Deployment', version: '-', description: 'Edge deployment', sortOrder: 32 },
  { name: 'AWS', category: 'Deployment', version: '-', description: 'Amazon Web Services', sortOrder: 33 },
  { name: 'Docker', category: 'Deployment', version: '27.0', description: 'Container platform', sortOrder: 34 },
  { name: 'cPanel Hosting', category: 'Deployment', version: '-', description: 'Shared hosting environment', sortOrder: 35 },
  { name: 'Supabase Auth', category: 'Authentication', version: '2.0', description: 'Authentication service with OAuth', sortOrder: 40 },
  { name: 'Clerk', category: 'Authentication', version: '-', description: 'Comprehensive auth platform', sortOrder: 41 },
  { name: 'Auth0', category: 'Authentication', version: '-', description: 'Enterprise auth provider', sortOrder: 42 },
  { name: 'JWT', category: 'Authentication', version: '-', description: 'JSON Web Token based auth', sortOrder: 43 },
  { name: 'Tailwind CSS', category: 'Styling', version: '4.0', description: 'Utility-first CSS framework', sortOrder: 50 },
  { name: 'shadcn/ui', category: 'Styling', version: '-', description: 'Headless component library', sortOrder: 51 },
  { name: 'Chakra UI', category: 'Styling', version: '3.0', description: 'Accessible component library', sortOrder: 52 },
  { name: 'MUI', category: 'Styling', version: '6.0', description: 'Material Design components', sortOrder: 53 },
  { name: 'TanStack Query', category: 'State Management', version: '5.0', description: 'Async state management', sortOrder: 60 },
  { name: 'Zustand', category: 'State Management', version: '5.0', description: 'Minimal state management', sortOrder: 61 },
  { name: 'Redux Toolkit', category: 'State Management', version: '2.0', description: 'Predictable state container', sortOrder: 62 },
  { name: 'React Native', category: 'Mobile', version: '0.76', description: 'Cross-platform mobile framework', sortOrder: 70 },
  { name: 'Expo', category: 'Mobile', version: '52.0', description: 'React Native development platform', sortOrder: 71 },
  { name: 'Flutter', category: 'Mobile', version: '3.27', description: 'Google mobile framework', sortOrder: 72 },
  { name: 'Electron', category: 'Desktop', version: '33.0', description: 'Desktop app framework', sortOrder: 80 },
  { name: 'Tauri', category: 'Desktop', version: '2.0', description: 'Lightweight desktop apps', sortOrder: 81 },
  { name: 'Vitest', category: 'Testing', version: '3.0', description: 'Modern unit testing', sortOrder: 90 },
  { name: 'Playwright', category: 'Testing', version: '1.50', description: 'E2E testing framework', sortOrder: 91 },
  { name: 'LangChain', category: 'AI Framework', version: '0.3', description: 'LLM application framework', sortOrder: 100 },
  { name: 'Drizzle ORM', category: 'ORM', version: '0.44', description: 'TypeScript-first ORM', sortOrder: 110 },
  { name: 'Prisma', category: 'ORM', version: '6.0', description: 'Type-safe database ORM', sortOrder: 111 },
];



const providersData = [
  { name: 'gemini', displayName: 'Google Gemini', defaultModel: 'gemini-2.5-flash', priority: 1, isActive: true, timeoutMs: 60000, maxRetries: 3 },
  { name: 'groq', displayName: 'Groq', defaultModel: 'llama-3.3-70b-versatile', priority: 2, isActive: true, timeoutMs: 30000, maxRetries: 3 },
];

const promptTemplatesData = [
  {
    generateType: 'prd' as const,
    name: 'Default PRD Generator',
    systemPrompt: `You are an expert Senior Product Manager with 15+ years of experience building successful software products. Your task is to generate a comprehensive Product Requirement Document (PRD) based on the provided project context.\n\nGenerate the PRD in {{language}} language.\n\nOutput ONLY clean, well-structured Markdown. Do not add explanations outside the document. IMPORTANT: Maintain clean Markdown syntax. Do NOT output empty bold asterisks or strange double-bold symbols like '****'. Ensure all bullet points, headings, and bold text are clean and properly spaced.`,
    userPrompt: `Generate a complete PRD for this project:\n\n{{context}}\n\nThe PRD must include:\n1. Executive Summary\n2. Problem Statement\n3. Goals & Success Metrics\n4. Target Users & Personas\n5. Core Features (with detailed user stories)\n6. User Flows\n7. Business Rules & Constraints\n8. Non-functional Requirements\n9. Out of Scope\n10. Technical Considerations\n\nBe specific, detailed, and actionable. Do NOT use duplicate asterisks like **** or write broken Markdown bold blocks. Tech stack: {{tech_stack}}`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'architecture' as const,
    name: 'Default Architecture Generator',
    systemPrompt: `You are a Senior Software Architect with 20+ years of experience designing large-scale distributed systems. Generate a comprehensive Software Architecture Document based on the project context.\n\nOutput language: {{language}}\nOutput format: Clean Markdown with diagrams described in text.`,
    userPrompt: `Generate a complete Software Architecture Document for:\n\n{{context}}\n\nInclude:\n1. Architecture Overview & Patterns chosen\n2. System Components Diagram (described)\n3. Technology Stack Justification\n4. Frontend Architecture\n5. Backend Architecture\n6. Database Architecture\n7. API Design Principles\n8. Authentication & Authorization Strategy\n9. Caching Strategy\n10. Deployment Architecture\n11. Scalability Considerations\n12. Security Considerations\n\nTech stack: {{tech_stack}}`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'database' as const,
    name: 'Default Database Designer',
    systemPrompt: `You are a Senior Database Architect. Generate a complete Database Design document. Output in {{language}}. Use Markdown with tables and code blocks for SQL.`,
    userPrompt: `Design the complete database for:\n\n{{context}}\n\nDeliver:\n1. Entity Relationship Overview\n2. All Tables with columns, types, constraints, indexes\n3. Relationships & Foreign Keys\n4. Enum/Lookup Tables\n5. Indexing Strategy\n6. Sample SQL CREATE statements\n7. Migration strategy\n\nExisting PRD: {{existing_prd}}`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'api' as const,
    name: 'Default API Designer',
    systemPrompt: `You are a Senior Backend Engineer specializing in RESTful API design. Generate a comprehensive API Design document. Output in {{language}}. Markdown format with code blocks for request/response examples.`,
    userPrompt: `Design all APIs for:\n\n{{context}}\n\nFor each endpoint provide:\n- Method, Path, Description\n- Request headers, query params, body schema\n- Response schema with examples\n- Error responses\n- Authentication requirements\n\nOrganize by modules. Follow REST best practices. Include pagination, filtering, sorting standards.\n\nExisting architecture: {{existing_architecture}}`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'tasks' as const,
    name: 'Default Task Breakdown Generator',
    systemPrompt: `You are a Senior Engineering Manager. Break down the project into actionable development tasks organized by phase and module. Output in {{language}}. Markdown format.`,
    userPrompt: `Generate a complete Task Breakdown for:\n\n{{context}}\n\nFor each task include:\n- Task title and clear description\n- Module/category (Frontend/Backend/Database/DevOps)\n- Priority (High/Medium/Low)\n- Estimated hours\n- Dependencies\n- Acceptance criteria\n\nOrganize into phases (MVP, Phase 2, Phase 3, etc.).\n\nPRD: {{existing_prd}}\nArchitecture: {{existing_architecture}}`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'prompt' as const,
    name: 'Default AI Coding Prompt Generator',
    systemPrompt: `You are an expert AI Prompt Engineer and Senior Web Developer. Create a highly detailed development prompt for {{ai_target}} to build this application. The prompt must be extremely comprehensive (aiming for up to 50,000 characters). IMPORTANT FORMATTING RULES:\n- DO NOT use markdown hash heading symbols (like #, ##, ###, etc.) anywhere in the prompt text.\n- DO NOT use markdown bold/italic formatting symbols (like **, ***, *, __, _) anywhere in the prompt text.\n- Use UPPERCASE sections and dividers like '=== SECTION NAME ===' to separate different parts.\n- Make sure the prompt is structured with these exact four sections:\n1. "=== UI/UX & FRONTEND SPECIFICATIONS ===" (role/persona of a senior frontend developer, list all pages, color palette guidelines, consistent button design instructions)\n2. "=== BACKEND SPECIFICATIONS & SYSTEM FLOW ===" (role/persona of a senior backend developer, endpoints, controllers, logical flows, ERD descriptions)\n3. "=== DATABASE SQL SCHEMAS ===" (pure SQL DDL CREATE TABLE scripts, separated from prose)\n4. "=== AI AGENT PROMPTS & DEVELOPMENT TASKS ===" (explicit task instructions for coding agents like Antigravity, Cursor, or Trae on what steps to execute first and how to build the app step-by-step). Always output the prompt in English.`,
    userPrompt: `Generate a complete, production-ready AI coding prompt for {{ai_target}} to build this application based on the following PRD and Architecture:\n\nPRD:\n{{existing_prd}}\n\nArchitecture:\n{{existing_architecture}}\n\nYour output prompt must be extremely detailed and long (aiming for up to 50,000 characters) to instruct Cursor/Antigravity step-by-step. Remember to NEVER use '#' or '*' symbols for markdown formatting. Use uppercase plain text and '===' dividers. Structure the prompt with these exact sections:\n\n=== UI/UX & FRONTEND SPECIFICATIONS ===\n- You are a senior frontend developer. Build the UI/UX layout.\n- Colors & Themes: Specify recommended color palettes (hex values, tailwind color classes) and typography.\n- Consistency: Define clear rules for buttons (sizes, hover effects, variant colors), spacing, and input fields to maintain consistency.\n- Pages: Detail every single page of the application, its layout, paths, inputs, and components.\n\n=== BACKEND SPECIFICATIONS & SYSTEM FLOW ===\n- You are a senior backend developer. Build the server-side API.\n- System Flow: Explain the logical system flow, ERD relationship design (which tables relate to which, cascades), authentication flows, and controller logic.\n- Endpoints: List API endpoints, inputs, outputs, and status codes.\n\n=== DATABASE SQL SCHEMAS ===\n- Provide all raw SQL CREATE TABLE scripts. Do not mix other text here. Keep it clean for easy copy-pasting.\n\n=== AI AGENT PROMPTS & DEVELOPMENT TASKS ===\n- Task list for AI Agents (Antigravity, Cursor, Trae) indicating which files/features to start creating first (the coding order) and detailed prompts for each step.\n\nMake sure the generated prompt is very detailed.`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
  {
    generateType: 'canvas' as const,
    name: 'Default Canvas Generator',
    systemPrompt: `You are a Senior Software Architect. Analyze the project idea and generate a feature canvas. Generate all feature names, phases, subfeatures, and AI agent tasks in {{language}} language. Output ONLY a valid JSON array of features, with no explanations and no markdown code blocks.`,
    userPrompt: `Analyze this project idea and generate a feature canvas in {{language}}:\n\nIdea: {{project_idea}}\nTech Stack: {{tech_stack}}\n\nGenerate a JSON array of features in this exact format:\n[\n  {\n    "name": "Feature Name (in {{language}})",\n    "icon": "lucide-icon-name",\n    "phase": "Phase/Fase (in {{language}})",\n    "subs": ["Sub-feature 1 (in {{language}})", "Sub-feature 2 (in {{language}})"],\n    "sqlSchema": [\n      "CREATE TABLE table_name (\\n  id UUID PRIMARY KEY,\\n  ...\\n);"\n    ],\n    "tasks": ["Task 1 for AI Agent (in {{language}})", "Task 2 for AI Agent (in {{language}})"]\n  }\n]\n\nInclude 6-12 features organized by phases (e.g. Fase 1, Fase 2, Fase 3). 'sqlSchema' must be an array of standard SQL CREATE TABLE statements necessary for this feature. 'tasks' must be detailed technical coding steps that an AI coding assistant (like Antigravity, Cursor, Trae) will execute to build this feature, with clear prompting instructions of where to start first. Use simple lowercase lucide icon names.`,
    isDefault: true,
    isActive: true,
    version: 1,
  },
];

const rotationConfigData = {
  strategy: 'round_robin' as const,
  autoRotation: true,
  autoRetry: true,
  maxRetries: 3,
  timeoutSeconds: 60,
  cooldownMinutes: 5,
  providerOrder: [] as string[],
};

const projectTemplatesData = [
  { name: 'Marketplace', category: 'E-commerce', description: 'Multi-vendor marketplace platform', ideaTemplate: 'I want to build a marketplace platform where sellers can list products and buyers can purchase them. Features include product catalog, shopping cart, checkout with payment integration, seller dashboard, and buyer profile.', sortOrder: 1 },
  { name: 'SaaS Dashboard', category: 'SaaS', description: 'Software as a Service application with dashboard', ideaTemplate: 'I want to build a SaaS application with subscription management, user dashboard, analytics, team collaboration features, and admin panel.', sortOrder: 2 },
  { name: 'AI Chat App', category: 'AI', description: 'Intelligent AI-powered chat application', ideaTemplate: 'I want to build an AI-powered chat application where users can have conversations with AI assistants, manage chat history, create custom AI personas, and share conversations.', sortOrder: 3 },
  { name: 'Company Profile', category: 'Landing', description: 'Professional company website', ideaTemplate: 'I want to build a modern company profile website with a landing page, about section, services/products showcase, portfolio, team section, blog, and contact form.', sortOrder: 4 },
  { name: 'Learning Management System', category: 'Education', description: 'Online course and learning platform', ideaTemplate: 'I want to build an LMS platform where instructors can create courses with videos and quizzes, students can enroll and track progress, with certificate generation and payment integration.', sortOrder: 5 },
  { name: 'Project Management', category: 'Productivity', description: 'Task and project management tool', ideaTemplate: 'I want to build a project management tool with kanban boards, task assignment, time tracking, team collaboration, file sharing, and reporting dashboard.', sortOrder: 6 },
];

const appSettingsData = [
  { key: 'app_name', value: 'AI Software Architect', type: 'string' as const, description: 'Application display name' },
  { key: 'app_tagline', value: 'AI Workflow Generator', type: 'string' as const, description: 'Application tagline' },
  { key: 'app_description', value: 'Transform your app idea into a complete development workflow with AI.', type: 'string' as const, description: 'Application description' },
  { key: 'app_version', value: '1.0.0', type: 'string' as const, description: 'Application version' },
  { key: 'default_language', value: 'id', type: 'string' as const, description: 'Default interface language' },
  { key: 'footer_text', value: '© 2026 AI Software Architect. All rights reserved.', type: 'string' as const, description: 'Footer copyright text' },
  { key: 'max_projects_per_user', value: '10', type: 'number' as const, description: 'Maximum projects per user' },
  { key: 'enable_registration', value: 'true', type: 'boolean' as const, description: 'Allow new user registrations' },
];

async function seed() {
  console.log('Starting database seed...');

  try {
    console.log('Seeding technologies...');
    for (const tech of technologiesData) {
      await db.insert(schema.technologies).values(tech).onConflictDoNothing();
    }
    console.log(`Seeded ${technologiesData.length} technologies`);

    console.log('Clearing old interview questions...');
    await db.delete(schema.interviewQuestions);

    console.log('Cleaning unneeded AI providers...');
    await db.delete(schema.aiProviders).where(notInArray(schema.aiProviders.name, ['gemini', 'groq']));

    console.log('Seeding AI providers...');
    for (const p of providersData) {
      const existing = await db.select().from(schema.aiProviders).where(eq(schema.aiProviders.name, p.name)).limit(1);
      if (existing.length > 0) {
        await db.update(schema.aiProviders).set({ defaultModel: p.defaultModel, isActive: true }).where(eq(schema.aiProviders.name, p.name));
      } else {
        await db.insert(schema.aiProviders).values({
          id: crypto.randomUUID(),
          name: p.name,
          displayName: p.displayName,
          defaultModel: p.defaultModel,
          priority: p.priority,
          isActive: p.isActive,
          timeoutMs: p.timeoutMs,
          maxRetries: p.maxRetries,
        });
      }
    }
    console.log(`Seeded ${providersData.length} providers`);

    // Sync API Keys from Environment Variables (.env)
    console.log('Syncing API keys from environment variables...');

    // Delete any previous Env keys or placeholder keys to prevent pollution
    await db.delete(schema.apiKeys).where(
      or(
        like(schema.apiKeys.label, '%(Env)%'),
        like(schema.apiKeys.keyPreview, 'plac%'),
        like(schema.apiKeys.label, 'Gemini Key%'),
        like(schema.apiKeys.label, 'Groq Key%')
      )
    );

    const geminiKeysEnv = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter((k) => k && !k.toLowerCase().includes('placeholder'))
      : [];
    const groqKeysEnv = process.env.GROQ_API_KEYS
      ? process.env.GROQ_API_KEYS.split(',').map((k) => k.trim()).filter((k) => k && !k.toLowerCase().includes('placeholder'))
      : [];

    const geminiProvider = await db.select().from(schema.aiProviders).where(eq(schema.aiProviders.name, 'gemini')).limit(1);
    const groqProvider = await db.select().from(schema.aiProviders).where(eq(schema.aiProviders.name, 'groq')).limit(1);

    if (geminiProvider.length > 0 && geminiKeysEnv.length > 0) {
      console.log(`Syncing ${geminiKeysEnv.length} Gemini API keys...`);
      for (let i = 0; i < geminiKeysEnv.length; i++) {
        const key = geminiKeysEnv[i];
        const preview = maskKey(key);
        const encrypted = encrypt(key);
        const label = `Gemini Key ${i + 1} (Env)`;

        const existingKey = await db
          .select()
          .from(schema.apiKeys)
          .where(and(eq(schema.apiKeys.providerId, geminiProvider[0].id), eq(schema.apiKeys.keyPreview, preview)))
          .limit(1);

        if (existingKey.length === 0) {
          await db.insert(schema.apiKeys).values({
            id: crypto.randomUUID(),
            providerId: geminiProvider[0].id,
            label,
            keyEncrypted: encrypted,
            keyPreview: preview,
            isActive: true,
            priority: i + 1,
          });
        }
      }
    }

    if (groqProvider.length > 0 && groqKeysEnv.length > 0) {
      console.log(`Syncing ${groqKeysEnv.length} Groq API keys...`);
      for (let i = 0; i < groqKeysEnv.length; i++) {
        const key = groqKeysEnv[i];
        const preview = maskKey(key);
        const encrypted = encrypt(key);
        const label = `Groq Key ${i + 1} (Env)`;

        const existingKey = await db
          .select()
          .from(schema.apiKeys)
          .where(and(eq(schema.apiKeys.providerId, groqProvider[0].id), eq(schema.apiKeys.keyPreview, preview)))
          .limit(1);

        if (existingKey.length === 0) {
          await db.insert(schema.apiKeys).values({
            id: crypto.randomUUID(),
            providerId: groqProvider[0].id,
            label,
            keyEncrypted: encrypted,
            keyPreview: preview,
            isActive: true,
            priority: i + 1,
          });
        }
      }
    }

    console.log('Seeding prompt templates...');
    for (const t of promptTemplatesData) {
      const existing = await db
        .select()
        .from(schema.promptTemplates)
        .where(
          and(
            eq(schema.promptTemplates.generateType, t.generateType),
            eq(schema.promptTemplates.isDefault, true),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(schema.promptTemplates)
          .set({
            systemPrompt: t.systemPrompt,
            userPrompt: t.userPrompt,
            name: t.name,
          })
          .where(eq(schema.promptTemplates.id, existing[0].id));
      } else {
        await db.insert(schema.promptTemplates).values(t);
      }
    }
    console.log(`Seeded ${promptTemplatesData.length} prompt templates`);

    console.log('Seeding users...');
    const usersData = [
      { email: 'admin@app.com', name: 'Admin Utama', role: 'admin' as const, isActive: true },
      { email: 'user@app.com', name: 'Rafi Pratama', role: 'user' as const, isActive: true },
    ];
    for (const u of usersData) {
      const existing = await db.select().from(schema.users).where(eq(schema.users.email, u.email)).limit(1);
      if (existing.length === 0) {
        await db.insert(schema.users).values({
          id: crypto.randomUUID(),
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          passwordHash: 'seeded-password-hash',
        });
      }
    }
    console.log('Users seeded');

    console.log('Seeding rotation config...');
    const existingConfig = await db.select().from(schema.rotationConfig).limit(1);
    if (existingConfig.length === 0) {
      await db.insert(schema.rotationConfig).values(rotationConfigData);
      console.log('Rotation config seeded');
    } else {
      console.log('Rotation config already exists, skipping');
    }

    console.log('Seeding project templates...');
    for (const t of projectTemplatesData) {
      await db.insert(schema.projectTemplates).values(t).onConflictDoNothing();
    }
    console.log(`Seeded ${projectTemplatesData.length} project templates`);

    console.log('Seeding app settings...');
    for (const s of appSettingsData) {
      await db.insert(schema.appSettings).values(s).onConflictDoNothing();
    }
    console.log(`Seeded ${appSettingsData.length} app settings`);

    console.log('\nDatabase seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
