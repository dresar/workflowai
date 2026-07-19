import type { Request, Response, NextFunction } from 'express';
import { DashboardRepository } from './dashboard.repository';
import { sendSuccess } from '../../../shared/utils/response.util';

const repo = new DashboardRepository();

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await repo.getStats();
    sendSuccess(res, stats, 'Dashboard stats retrieved');
  } catch (err) { next(err); }
}

export async function getAIUsageChart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = parseInt(String(req.query.days ?? '14'), 10);
    const data = await repo.getAIUsageChart(days);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

export async function getProviderDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await repo.getProviderDistribution();
    sendSuccess(res, data);
  } catch (err) { next(err); }
}
