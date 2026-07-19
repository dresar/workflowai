import { AppError } from './app-error';

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class AIError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 503, 'AI_ERROR', details);
    this.name = 'AIError';
  }
}

export class AITimeoutError extends AppError {
  constructor(provider: string, timeoutMs: number) {
    super(`AI provider ${provider} timed out after ${timeoutMs}ms`, 504, 'AI_TIMEOUT');
    this.name = 'AITimeoutError';
  }
}

export class AIRateLimitError extends AppError {
  constructor(provider: string) {
    super(`AI provider ${provider} rate limit reached`, 429, 'AI_RATE_LIMIT');
    this.name = 'AIRateLimitError';
  }
}

export class AllProvidersExhaustedError extends AppError {
  constructor() {
    super('All AI providers are currently unavailable', 503, 'ALL_PROVIDERS_EXHAUSTED');
    this.name = 'AllProvidersExhaustedError';
  }
}
