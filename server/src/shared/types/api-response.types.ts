export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  metadata?: ApiMetadata;
  timestamp: string;
  requestId: string;
  error?: ApiError;
}

export interface ApiMetadata {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiError {
  code: string;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
