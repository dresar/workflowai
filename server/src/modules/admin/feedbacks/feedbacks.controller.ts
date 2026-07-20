import { db } from '../../../database/connection';
import { feedbacks, users } from '../../../database/schema';
import { eq, desc } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNoContent } from '../../../shared/utils/response.util';
import { NotFoundError } from '../../../errors/domain-errors';

export async function listFeedbacks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await db.select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      userName: users.name,
      userEmail: users.email,
      type: feedbacks.type,
      content: feedbacks.content,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .orderBy(desc(feedbacks.createdAt));

    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

export async function deleteFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await db.delete(feedbacks).where(eq(feedbacks.id, req.params.id as string));
    if ((result.rowCount ?? 0) === 0) throw new NotFoundError('Feedback');
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
