import { ContextBuilder } from '../context/context-builder';
import { PromptBuilder } from '../prompt/prompt-builder';
import { RotationEngine } from '../rotation/rotation-engine';
import { getProvider } from '../providers/provider.registry';
import { db } from '../../database/connection';
import { apiKeys, requestLogs } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { rotationConfig } from '../../database/schema';
import { AllProvidersExhaustedError, AIError } from '../../errors/domain-errors';
import { logAI, logRotation, logError } from '../../logger/logger';
import { env } from '../../config/env.config';
import { aiMemory } from '../memory/ai-memory';
import type { AIResponse, BuiltPrompt } from '../providers/ai-provider.interface';
import type { GenerateType } from '../../shared/constants/app.constants';

export interface OrchestratorResult extends AIResponse {
  rotationEvents: unknown[];
}

export class AIOrchestrator {
  private contextBuilder = new ContextBuilder();
  private promptBuilder = new PromptBuilder();

  async execute(
    projectId: string,
    generateType: GenerateType,
    preferredProvider?: string,
    revisionInstructions?: string,
  ): Promise<OrchestratorResult> {
    const config = await this.getRotationConfig();
    const maxRetries = config?.maxRetries ?? env.AI_MAX_RETRIES;
    const cooldownMinutes = config?.cooldownMinutes ?? env.AI_COOLDOWN_MINUTES;

    const context = await this.contextBuilder.build(projectId, generateType);
    const prompt = await this.promptBuilder.build(generateType, context);

    if (revisionInstructions) {
      prompt.userPrompt += `\n\nREVISION INSTRUCTIONS / REVISI DARI USER (PENTING! Harap ikuti revisi ini dan sesuaikan hasil sebelumnya):\n${revisionInstructions}`;
    }

    logAI({ projectId, generateType }, 'AI orchestration started');

    const rotationEngine = new RotationEngine();
    let lastError: unknown;

    // Check if we have a memory context from a previous failed attempt
    const existingMemory = aiMemory.get(projectId, generateType);
    if (existingMemory) {
      logAI({ projectId, generateType }, `Resuming from memory (attempt #${existingMemory.attempts + 1}, primary was ${existingMemory.primaryProvider})`);
      const memoryContext = aiMemory.buildContextInjection(existingMemory);
      prompt.userPrompt = `${memoryContext}\n\n---\n\nORIGINAL REQUEST:\n${prompt.userPrompt}`;
      aiMemory.incrementAttempts(projectId, generateType);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let selectedKey;

      try {
        selectedKey = await rotationEngine.selectKey(preferredProvider);
      } catch (err) {
        if (err instanceof AllProvidersExhaustedError) {
          logError({ projectId, generateType }, 'All providers exhausted', err);
          throw err;
        }
        throw err;
      }

      const provider = getProvider(selectedKey.providerName);
      if (!provider) {
        logRotation({ provider: selectedKey.providerName }, 'Provider not registered, skipping');
        continue;
      }

      try {
        logAI(
          { projectId, generateType, provider: selectedKey.providerName, attempt },
          'Attempting generation',
        );

        const result = await provider.generate(prompt, {
          apiKey: selectedKey.apiKey,
          model: selectedKey.model,
          timeoutMs: selectedKey.timeoutMs,
          temperature: prompt.config.temperature,
          maxTokens: prompt.config.maxTokens,
          topP: prompt.config.topP,
        });

        await rotationEngine.markKeySuccess(selectedKey.id);

        logAI(
          { projectId, generateType, provider: selectedKey.providerName, latencyMs: result.latencyMs },
          'Primary generation completed successfully',
        );

        // Save primary draft to memory in case collaboration fails
        aiMemory.save({
          projectId,
          generateType,
          primaryProvider: selectedKey.providerName,
          primaryDraft: result.content,
          primaryDraftTokens: result.totalTokens ?? 0,
          attempts: existingMemory?.attempts ?? 0,
        });

        // Collaborative refinement
        const finalResult = await this.collaborateAndRefine(
          projectId,
          generateType,
          result,
          prompt,
          rotationEngine,
          cooldownMinutes,
        );

        finalResult.content = this.formatOutputAsJson(generateType, finalResult.content);

        // Clear memory after successful completion
        aiMemory.clear(projectId, generateType);

        await this.saveRequestLog(projectId, generateType, selectedKey.id, finalResult, true, rotationEngine.getEvents());

        return { ...finalResult, rotationEvents: rotationEngine.getEvents() };
      } catch (err) {
        lastError = err;
        logError(
          { projectId, generateType, provider: selectedKey.providerName, attempt },
          'Generation attempt failed — saving to memory for handoff',
          err,
        );

        // Save whatever we know to memory so next AI can continue
        aiMemory.save({
          projectId,
          generateType,
          primaryProvider: selectedKey.providerName,
          primaryDraft: existingMemory?.primaryDraft ?? '',
          primaryDraftTokens: 0,
          attempts: (existingMemory?.attempts ?? 0) + attempt,
          contextSummary: err instanceof Error ? err.message : 'Unknown error',
        });

        await rotationEngine.markKeyFailed(selectedKey.id, cooldownMinutes);
        await this.saveRequestLog(projectId, generateType, selectedKey.id, null, false, rotationEngine.getEvents(), err);
      }
    }

    throw lastError ?? new AIError('All generation attempts failed');
  }

  private async collaborateAndRefine(
    projectId: string,
    generateType: GenerateType,
    primaryResult: AIResponse,
    originalPrompt: BuiltPrompt,
    rotationEngine: RotationEngine,
    cooldownMinutes: number,
  ): Promise<AIResponse> {
    const primaryProvider = primaryResult.provider;
    const collaboratorProviderName = primaryProvider === 'gemini' ? 'groq' : 'gemini';

    logAI({ projectId, generateType, primaryProvider, collaboratorProviderName }, 'Attempting collaborative refinement');

    let selectedKey;
    try {
      selectedKey = await rotationEngine.selectKey(collaboratorProviderName);
    } catch (err) {
      logAI({ projectId, generateType }, `No collaborator key found for ${collaboratorProviderName}, returning primary result`);
      return primaryResult;
    }

    const collaboratorProvider = getProvider(selectedKey.providerName);
    if (!collaboratorProvider) {
      logAI({ projectId, generateType }, `Collaborator provider ${selectedKey.providerName} not found, returning primary result`);
      return primaryResult;
    }

    try {
      const languageText = originalPrompt.userPrompt.includes('Indonesian') || originalPrompt.userPrompt.includes('bahasa') ? 'Indonesian' : 'English';

      let refinementSystemPrompt = '';
      let refinementUserPrompt = '';

      if (generateType === 'canvas') {
        refinementSystemPrompt = `You are a Senior Software Architect and AI Systems Designer. Your task is to take the initial feature canvas generated by another AI and make it extremely comprehensive and complete. Output ONLY a valid JSON array of features, with no explanations and no markdown code blocks. The JSON must be parseable by JSON.parse().`;
        refinementUserPrompt = `A primary model (${primaryProvider}) generated this initial feature canvas JSON:\n\n${primaryResult.content}\n\nYour job is to significantly EXPAND and ENRICH this canvas. Requirements:\n1. Ensure there are AT LEAST 12-15 feature objects covering: Auth, Dashboard, User Management, Products/Services (if applicable), Payments (if applicable), Notifications, Reports/Analytics, Settings, Admin Panel, API Management, and any domain-specific features.\n2. Each feature object MUST have: { "name": "string", "iconName": "lucide-icon-name", "phase": "Fase N: Description", "subs": [...], "sqlSchema": [...], "tasks": [...] }.\n3. "subs" must have 5-8 detailed sub-features per feature.\n4. "sqlSchema" must have 2-4 complete CREATE TABLE statements with UUID PKs, foreign keys with ON DELETE CASCADE, TIMESTAMPTZ columns, and relevant indexes. Each CREATE TABLE must be a complete, valid SQL statement.\n5. "tasks" must have 4-6 detailed, actionable coding tasks for AI agents (Antigravity, Cursor, Trae) starting with environment setup, then database migrations, then backend API, then frontend components.\n6. Organize features by phases: Fase 1 (Core Infrastructure), Fase 2 (Core Features), Fase 3 (Advanced Features), Fase 4 (Polish & Scale).\n7. Output ONLY the final complete valid JSON array.`;
      } else if (generateType === 'prompt') {
        refinementSystemPrompt = `You are a Senior Software Architect and expert AI Prompt Engineer. You are the SECOND AI in a collaborative pipeline. Your task is to take the initial prompt draft from the primary AI and expand it into an ULTRA-COMPREHENSIVE "Ultra Prompt Fusion" — a single massive prompt (targeting 50,000 characters) that any AI coding tool (Cursor, Antigravity, Trae) can use to build the entire application from scratch without needing any other documentation. Output ONLY a valid JSON object with keys: "documentType" (string), "collaborative" (true), "content" (string with the full prompt text).`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial prompt draft:\n\n${primaryResult.content}\n\nNow MASSIVELY EXPAND this into an Ultra Prompt Fusion. Structure the content field with these 4 EXACT sections using === dividers, NO markdown hash (#) or asterisks (**):\n\nSection 1 - === UI/UX AND FRONTEND SPECIFICATIONS ===\nStart with: "You are a senior frontend developer and UI/UX expert. Create the complete frontend for this application."\nInclude: Every page name with full layout description, color palette (exact hex codes), typography (font family, sizes, weights), button variants (primary/secondary/danger/ghost), input field styles, card styles, spacing system, animation/transition specs, responsive breakpoints, and navigation structure. Be extremely verbose — describe every component in detail.\n\nSection 2 - === BACKEND SYSTEM FLOW AND API ARCHITECTURE ===\nStart with: "You are a senior backend engineer. Build the complete server-side API and business logic."\nInclude: Folder structure (tree format), every API endpoint (method, path, request body, response schema), authentication middleware flow, database connection setup, error handling strategy, environment variables list, business logic descriptions, ERD relations (which table references which with FK), and deployment considerations.\n\nSection 3 - === DATABASE SQL COMPLETE SCHEMAS ===\nStart with: "Execute these SQL statements to create the complete database schema."\nInclude: Complete CREATE TABLE statements for EVERY table in the application, with UUID PKs, proper FKs with ON DELETE behavior, TIMESTAMPTZ timestamps, relevant indexes (CREATE INDEX statements), and seed data INSERT statements for roles/categories/defaults.\n\nSection 4 - === AI AGENT STEP BY STEP DEVELOPMENT TASKS ===\nStart with: "You are Cursor/Antigravity/Trae. Execute these tasks in order to build the complete application."\nInclude: At least 20-30 numbered tasks in exact order, starting from 1. Initialize project structure, going through 2. Setup database, 3. Configure auth, etc. Each task must include the exact prompt/command to use, which files to create, and what the expected output should be.\n\nThe total content MUST be close to 50,000 characters. Be as verbose and detailed as possible for every section. Output ONLY the JSON wrapper object.`;
      } else if (generateType === 'prd') {
        refinementSystemPrompt = `You are a Senior Product Manager and Technical Writer. Your task is to take the initial PRD draft from another AI model and produce a FINAL, COMPLETE, PROFESSIONAL Product Requirement Document.

CRITICAL FORMATTING RULES — MUST FOLLOW:
1. Use standard Markdown headings (#, ##, ###) — these will be rendered as beautiful HTML, so USE THEM freely.
2. For bullet points use "- " (dash + space). NEVER use bare asterisks (*) as bullet markers.
3. For bold text use **text** syntax.
4. NEVER output raw "***" or "* " as standalone bullet symbols.
5. Write in ${languageText} language throughout.
6. The document MUST be extremely comprehensive — minimum 3000 words.`;

        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial PRD draft:

${primaryResult.content}

Now produce the FINAL complete PRD. Structure it with these exact sections:

# Product Requirement Document (PRD)

## 1. Executive Summary
Brief description of the product, its purpose, and business value.

## 2. Problem Statement
What problem does this solve? Who has this problem?

## 3. Goals & Success Metrics
Business goals and measurable KPIs.

## 4. Target Users & Personas
Detailed user personas with roles and needs.

## 5. Feature Requirements
For EVERY feature from the canvas, include a dedicated subsection:
### 5.1 [Feature Name]
**Description:** What it does.
**User Stories:** As a [role], I want to [action] so that [benefit].
**Acceptance Criteria:** Specific testable requirements.
**Priority:** High / Medium / Low

## 6. Non-Functional Requirements
Performance, security, scalability, accessibility requirements.

## 7. User Journey & Flow
Step-by-step user flows for the core use cases.

## 8. Technical Architecture Overview
Frontend, backend, database, third-party integrations.

## 9. API Overview
Key endpoints grouped by module.

## 10. Data Model Overview
Key entities and their relationships.

## 11. Security Requirements
Auth, authorization, data protection.

## 12. Milestones & Timeline
Phased development plan with rough estimates.

## 13. Risks & Mitigations
Known risks and how to handle them.

## 14. Open Questions
Any decisions still pending.

IMPORTANT: Cover ALL features from the canvas. Output ONLY clean Markdown — no JSON wrapper needed for PRD.`;
      } else if (generateType === 'tasks') {
        refinementSystemPrompt = `You are a Lead AI Developer. Your task is to take the initial Task Breakdown and refine it into an actionable "Vibe Coding" task list for AI agents (like Cursor, Trae, or Antigravity).
        
CRITICAL RULES:
1. NEVER include time estimates, hours, days, or story points. This is for AI agents, not humans.
2. Structure tasks logically: Setup -> Database -> Backend -> Frontend -> Integration.
3. Make tasks highly actionable (e.g., "Write the schema in \`src/db/schema.ts\`", "Create the POST endpoint in \`src/api/routes.ts\`").
4. Write in ${languageText}.`;

        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial task list:

${primaryResult.content}

Now produce the FINAL Task Breakdown document. Ensure there are absolutely NO time estimates. Focus strictly on technical execution flow for AI coding agents. Output clean Markdown.`;
      } else {
        refinementSystemPrompt = `You are an expert Co-pilot AI. Your task is to collaborate with another AI model to refine, correct, and optimize the generated document for: ${generateType}.\nOutput in clean Markdown format.`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial draft for ${generateType}:\n\n${primaryResult.content}\n\nReview this draft, improve it, fill in any missing details (such as database SQL queries or specific AI prompting strategies if relevant), and output the final complete version.`;
      }

      const refinementPrompt: BuiltPrompt = {
        systemPrompt: refinementSystemPrompt,
        userPrompt: refinementUserPrompt,
        config: {
          ...originalPrompt.config,
          model: selectedKey.model,
        },
      };

      logAI(
        { projectId, generateType, provider: selectedKey.providerName },
        'Collaborator model refining content',
      );

      const refinedResult = await collaboratorProvider.generate(refinementPrompt, {
        apiKey: selectedKey.apiKey,
        model: selectedKey.model,
        timeoutMs: selectedKey.timeoutMs,
        temperature: originalPrompt.config.temperature,
        maxTokens: originalPrompt.config.maxTokens,
        topP: originalPrompt.config.topP,
      });

      await rotationEngine.markKeySuccess(selectedKey.id);

      logAI(
        { projectId, generateType, provider: selectedKey.providerName, latencyMs: refinedResult.latencyMs },
        'Collaborative refinement completed successfully',
      );

      return {
        provider: `${primaryResult.provider} + ${refinedResult.provider}`,
        model: `${primaryResult.model} + ${refinedResult.model}`,
        content: refinedResult.content,
        promptTokens: (primaryResult.promptTokens ?? 0) + (refinedResult.promptTokens ?? 0),
        completionTokens: (primaryResult.completionTokens ?? 0) + (refinedResult.completionTokens ?? 0),
        totalTokens: (primaryResult.totalTokens ?? 0) + (refinedResult.totalTokens ?? 0),
        latencyMs: primaryResult.latencyMs + refinedResult.latencyMs,
      };
    } catch (err) {
      logError(
        { projectId, generateType, provider: selectedKey.providerName },
        'Collaborative refinement failed, falling back to primary draft',
        err,
      );
      await rotationEngine.markKeyFailed(selectedKey.id, cooldownMinutes);
      return primaryResult;
    }
  }

  private async getRotationConfig() {
    const [config] = await db.select().from(rotationConfig).limit(1);
    return config;
  }

  private async saveRequestLog(
    projectId: string,
    generateType: string,
    apiKeyId: string,
    result: AIResponse | null,
    success: boolean,
    rotationEvents: unknown[],
    error?: unknown,
  ): Promise<void> {
    try {
      const [key] = await db.select({ providerId: apiKeys.providerId }).from(apiKeys).where(eq(apiKeys.id, apiKeyId)).limit(1);

      await db.insert(requestLogs).values({
        requestId: crypto.randomUUID(),
        projectId,
        generateType,
        providerName: result?.provider,
        model: result?.model,
        apiKeyId,
        promptTokens: result?.promptTokens,
        completionTokens: result?.completionTokens,
        totalTokens: result?.totalTokens,
        latencyMs: result?.latencyMs,
        success,
        errorMessage: error instanceof Error ? error.message : undefined,
        rotationEvents,
      });
    } catch (logErr) {
      logError({}, 'Failed to save request log', logErr);
    }
  }
  private formatOutputAsJson(generateType: string, content: string): string {
    if (generateType === 'canvas') {
      try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleaned);
        return cleaned;
      } catch {
        return content;
      }
    }

    try {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object' && 'content' in parsed) {
        return JSON.stringify(parsed);
      }
    } catch {
      // Ignored
    }

    return JSON.stringify({
      documentType: generateType,
      collaborative: true,
      content: content
    });
  }
}
