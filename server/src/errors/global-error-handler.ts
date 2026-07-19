import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { logError } from '../logger/logger';

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? '';

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
      error: { code: 'VALIDATION_ERROR', details },
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logError({ requestId }, 'Non-operational error', err);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
      error: { code: err.code, details: err.details },
    });
    return;
  }

  logError({ requestId }, 'Unhandled error', err);

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    data: null,
    timestamp: new Date().toISOString(),
    requestId,
    error: { code: 'INTERNAL_ERROR' },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? '';
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    data: null,
    timestamp: new Date().toISOString(),
    requestId,
    error: { code: 'ROUTE_NOT_FOUND' },
  });
}
