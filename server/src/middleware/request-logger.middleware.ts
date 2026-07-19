import type { Request, Response, NextFunction } from 'express';
import { logRequest } from '../logger/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req as Request & { requestId?: string }).requestId ?? '';

  logRequest({ requestId }, `→ ${req.method} ${req.path}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(
      { requestId, statusCode: res.statusCode, duration },
      `← ${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
    );
  });

  next();
}
