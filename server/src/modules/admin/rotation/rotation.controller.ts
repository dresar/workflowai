import { db } from '../../../database/connection';
import { rotationConfig } from '../../../database/schema';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/utils/response.util';

export async function getRotationConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [config] = await db.select().from(rotationConfig).limit(1);
    sendSuccess(res, config ?? null);
  } catch (err) { next(err); }
}

export async function updateRotationConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [existing] = await db.select().from(rotationConfig).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(rotationConfig).set({ ...req.body, updatedAt: new Date() }).where(db.select().from(rotationConfig).limit(1) as never).returning();
      [result] = await db.update(rotationConfig).set({ ...req.body, updatedAt: new Date() }).returning();
    } else {
      [result] = await db.insert(rotationConfig).values(req.body).returning();
    }
    sendSuccess(res, result, 'Rotation config updated');
  } catch (err) { next(err); }
}
