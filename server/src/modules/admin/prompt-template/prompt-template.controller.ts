import { db } from '../../../database/connection';
import { promptTemplates } from '../../../database/schema';
import { eq, and } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNoContent } from '../../../shared/utils/response.util';
import { NotFoundError } from '../../../errors/domain-errors';

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
