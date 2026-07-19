import type { Request, Response, NextFunction } from 'express';

export function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next();
}
