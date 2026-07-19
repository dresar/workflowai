import { db } from '../../../database/connection';
import { appSettings } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/utils/response.util';

export async function getAllSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await db.select().from(appSettings);
    const settingsMap = items.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    sendSuccess(res, settingsMap);
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updates = req.body as Record<string, string>;
    const promises = Object.entries(updates).map(async ([key, value]) => {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      if (existing.length > 0) {
        return db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
      }
      return db.insert(appSettings).values({ key, value, type: 'string' });
    });
    await Promise.all(promises);
    sendSuccess(res, null, 'Settings updated');
  } catch (err) { next(err); }
}

export async function getSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, req.params.key as string)).limit(1);
    sendSuccess(res, setting ?? null);
  } catch (err) { next(err); }
}

export async function updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { value } = req.body as { value: string };
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, req.params.key as string)).limit(1);
    let result;
    if (existing.length > 0) {
      [result] = await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, req.params.key as string)).returning();
    } else {
      [result] = await db.insert(appSettings).values({ key: req.params.key as string, value, type: 'string' }).returning();
    }
    sendSuccess(res, result, 'Setting updated');
  } catch (err) { next(err); }
}
