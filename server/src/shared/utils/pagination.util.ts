import type { PaginationParams } from '../types/api-response.types';

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

export function calcOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function calcTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}
