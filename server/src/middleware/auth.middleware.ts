import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { UnauthorizedError } from '../errors/domain-errors';
import { db } from '../database/connection';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    if (env.NODE_ENV === 'development') {
      // Dev bypass mode: Fallback to the seeded demo user if in local development
      try {
        const [devUser] = await db.select().from(users).where(eq(users.email, 'user@app.com')).limit(1);
        if (devUser) {
          (req as any).user = { id: devUser.id, email: devUser.email, role: devUser.role };
          return next();
        }
      } catch (err) {
        // Continue to unauthorized error if db is not connected yet
      }
    }
    return next(new UnauthorizedError('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: 'user' | 'admin' };
    (req as any).user = decoded;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
