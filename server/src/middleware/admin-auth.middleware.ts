import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { UnauthorizedError, ForbiddenError } from '../errors/domain-errors';
import { db } from '../database/connection';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

export async function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    if (env.NODE_ENV === 'development') {
      // Dev bypass: fallback to admin account in local development
      try {
        const [devAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        if (devAdmin) {
          (req as any).user = { id: devAdmin.id, email: devAdmin.email, role: devAdmin.role };
          return next();
        }
      } catch (err) {
        // Continue to error if DB query fails
      }
    }
    return next(new UnauthorizedError('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: 'user' | 'admin' };
    if (decoded.role !== 'admin') {
      return next(new ForbiddenError('Admin privileges required'));
    }
    (req as any).user = decoded;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
