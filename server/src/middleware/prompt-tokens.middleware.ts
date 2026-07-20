import type { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import { ForbiddenError } from '../errors/domain-errors';

export async function checkPromptTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).user?.id;
  if (!userId) return next();

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return next();
    }

    if (user.promptTokens <= 0 && user.role !== 'admin') {
      return next(new ForbiddenError('PROMPT_LIMIT_EXCEEDED'));
    }

    // Decrement promptTokens by 1 if user is not an admin
    if (user.role !== 'admin') {
      await db.update(users)
        .set({ promptTokens: user.promptTokens - 1 })
        .where(eq(users.id, userId));
    }
    next();
  } catch (err) {
    next(err);
  }
}
