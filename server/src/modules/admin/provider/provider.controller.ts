import type { Request, Response, NextFunction } from 'express';
import { ProviderRepository, ApiKeyRepository } from './provider.repository';
import { sendSuccess, sendCreated, sendNoContent } from '../../../shared/utils/response.util';
import { NotFoundError } from '../../../errors/domain-errors';
import { parsePagination, calcTotalPages } from '../../../shared/utils/pagination.util';

const providerRepo = new ProviderRepository();
const apiKeyRepo = new ApiKeyRepository();

export async function listProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await providerRepo.findAll();
    sendSuccess(res, items);
  } catch (err) { next(err); }
}

export async function createProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await providerRepo.create(req.body);
    sendCreated(res, item);
  } catch (err) { next(err); }
}

export async function updateProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await providerRepo.update(req.params.id as string, req.body);
    if (!item) throw new NotFoundError('Provider');
    sendSuccess(res, item, 'Provider updated');
  } catch (err) { next(err); }
}

export async function deleteProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await providerRepo.delete(req.params.id as string);
    if (!deleted) throw new NotFoundError('Provider');
    sendNoContent(res);
  } catch (err) { next(err); }
}

export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
    const { items, total } = await apiKeyRepo.findAll({ ...pagination, providerId });
    sendSuccess(res, items, 'API keys retrieved', 200, {
      page: pagination.page, limit: pagination.limit, total, totalPages: calcTotalPages(total, pagination.limit),
    });
  } catch (err) { next(err); }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await apiKeyRepo.create(req.body);
    sendCreated(res, item);
  } catch (err) { next(err); }
}

export async function updateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await apiKeyRepo.update(req.params.id as string, req.body);
    if (!item) throw new NotFoundError('API Key');
    sendSuccess(res, item, 'API key updated');
  } catch (err) { next(err); }
}

export async function deleteApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await apiKeyRepo.delete(req.params.id as string);
    if (!deleted) throw new NotFoundError('API Key');
    sendNoContent(res);
  } catch (err) { next(err); }
}

export async function resetApiKeyQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await apiKeyRepo.resetQuota(req.params.id as string);
    if (!item) throw new NotFoundError('API Key');
    sendSuccess(res, item, 'Quota reset');
  } catch (err) { next(err); }
}
