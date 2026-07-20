import { db } from '../../../database/connection';
import { promptTemplates } from '../../../database/schema';
import { eq, and } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNoContent } from '../../../shared/utils/response.util';
import { NotFoundError } from '../../../errors/domain-errors';

import { RotationEngine } from '../../../ai/rotation/rotation-engine';
import { getProvider } from '../../../ai/providers/provider.registry';

export async function listPromptTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await db.select().from(promptTemplates);
    sendSuccess(res, items);
  } catch (err) { next(err); }
}

export async function getPromptTemplateByType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await db.select().from(promptTemplates)
      .where(eq(promptTemplates.generateType, (req.params.type as string) as typeof promptTemplates.$inferSelect.generateType));
    sendSuccess(res, items);
  } catch (err) { next(err); }
}

export async function updatePromptTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [item] = await db.update(promptTemplates).set({ ...req.body, updatedAt: new Date() }).where(eq(promptTemplates.id, req.params.id as string)).returning();
    if (!item) throw new NotFoundError('Prompt template');
    sendSuccess(res, item, 'Template updated');
  } catch (err) { next(err); }
}

export async function publishPromptTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [current] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, req.params.id as string)).limit(1);
    if (!current) throw new NotFoundError('Prompt template');

    await db.update(promptTemplates).set({ isDefault: false }).where(eq(promptTemplates.generateType, current.generateType));
    const [item] = await db.update(promptTemplates).set({ isDefault: true }).where(eq(promptTemplates.id, req.params.id as string)).returning();

    sendSuccess(res, item, 'Template published as default');
  } catch (err) { next(err); }
}

export async function optimizePrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { promptText, instructions, generateType, role } = req.body;
    if (!promptText) {
      throw new Error('promptText is required');
    }

    const rotationEngine = new RotationEngine();
    const selectedKey = await rotationEngine.selectKey();
    const providerInstance = getProvider(selectedKey.providerName);

    const systemPrompt = `You are an expert Prompt Engineer. Your task is to rewrite and optimize prompt templates for a software architect generator. Keep all templating variables (e.g. {{context}}, {{language}}, {{tech_stack}}, {{existing_prd}}, etc.) intact. Output ONLY the optimized prompt text without any explanations or markdown blocks.`;
    const userPrompt = `Optimize this prompt template to be highly detailed, comprehensive, and structured, so that the AI model will generate a very long, robust, and professional output for the target "${generateType}" (${role} prompt).

Additional instructions/customizations: ${instructions || 'None'}

Current template text:
"""
${promptText}
"""

Return ONLY the optimized prompt text. Do not wrap the response in markdown blocks.`;

    const result = await providerInstance.call({
      apiKey: selectedKey.apiKey,
      model: selectedKey.model,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.9,
    });

    let content = result.content || '';
    if (content.startsWith('```')) {
      content = content.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
    }

    sendSuccess(res, { optimizedText: content.trim() });
  } catch (err) {
    next(err);
  }
}
