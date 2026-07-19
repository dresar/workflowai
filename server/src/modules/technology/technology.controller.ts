import type { Request, Response, NextFunction } from 'express';
import { TechnologyService } from './technology.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.util';

const service = new TechnologyService();

export async function listTechnologies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.list(req.query as Record<string, unknown>);
    sendSuccess(res, result.items, 'Technologies retrieved', 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
}

export async function listActiveForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await service.listActive();
    sendSuccess(res, items, 'Active technologies retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await service.getCategories();
    sendSuccess(res, categories, 'Categories retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getTechnologyById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tech = await service.getById(req.params.id as string);
    sendSuccess(res, tech);
  } catch (err) {
    next(err);
  }
}

export async function createTechnology(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tech = await service.create(req.body);
    sendCreated(res, tech);
  } catch (err) {
    next(err);
  }
}

export async function updateTechnology(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tech = await service.update(req.params.id as string, req.body);
    sendSuccess(res, tech, 'Technology updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteTechnology(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(req.params.id as string);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function toggleTechnology(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isActive } = req.body as { isActive: boolean };
    const tech = await service.toggleActive(req.params.id as string, isActive);
    sendSuccess(res, tech, 'Technology status updated');
  } catch (err) {
    next(err);
  }
}
