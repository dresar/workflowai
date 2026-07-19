import type { Response } from 'express';
import type { ApiResponse, ApiError, ApiMetadata } from '../types/api-response.types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  metadata?: ApiMetadata,
): void {
  const requestId = (res.req as Express.Request & { requestId?: string }).requestId ?? '';
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    metadata,
    timestamp: new Date().toISOString(),
    requestId,
  };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  error?: ApiError,
): void {
  const requestId = (res.req as Express.Request & { requestId?: string }).requestId ?? '';
  const response: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
    requestId,
    error,
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
