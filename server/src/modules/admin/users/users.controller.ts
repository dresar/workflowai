import { db } from '../../../database/connection';
import { users } from '../../../database/schema';
import { eq, asc } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../../shared/utils/response.util';
import { NotFoundError } from '../../../errors/domain-errors';
import crypto from 'crypto';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await db.select().from(users).orderBy(asc(users.createdAt));
    sendSuccess(res, items);
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, role, password, isActive } = req.body;
    const [item] = await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      passwordHash: password || 'default-password-hash',
    }).returning();
    sendCreated(res, item);
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, role, password, isActive } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (password !== undefined && password.trim() !== '') updates.passwordHash = password;
    if (isActive !== undefined) updates.isActive = isActive;
    updates.updatedAt = new Date();

    const [item] = await db.update(users).set(updates).where(eq(users.id, req.params.id as string)).returning();
    if (!item) throw new NotFoundError('User');
    sendSuccess(res, item, 'User updated');
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await db.delete(users).where(eq(users.id, req.params.id as string));
    if ((result.rowCount ?? 0) === 0) throw new NotFoundError('User');
    sendNoContent(res);
  } catch (err) { next(err); }
}
