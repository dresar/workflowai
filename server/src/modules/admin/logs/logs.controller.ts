import { db } from '../../../database/connection';
import { activityLogs, requestLogs } from '../../../database/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/utils/response.util';
import { parsePagination, calcOffset, calcTotalPages } from '../../../shared/utils/pagination.util';

export async function getActivityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const offset = calcOffset(pagination.page, pagination.limit);
    const level = typeof req.query.level === 'string' ? req.query.level : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const condition = level
      ? eq(activityLogs.level, level as typeof activityLogs.$inferSelect.level)
      : category
      ? eq(activityLogs.category, category as typeof activityLogs.$inferSelect.category)
      : undefined;

    const [items, [{ count }]] = await Promise.all([
      db.select().from(activityLogs).where(condition).orderBy(desc(activityLogs.createdAt)).limit(pagination.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(condition),
    ]);

    sendSuccess(res, items, 'Activity logs retrieved', 200, {
      page: pagination.page, limit: pagination.limit, total: Number(count), totalPages: calcTotalPages(Number(count), pagination.limit),
    });
  } catch (err) { next(err); }
}

export async function getRequestLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const offset = calcOffset(pagination.page, pagination.limit);

    const [items, [{ count }]] = await Promise.all([
      db.select().from(requestLogs).orderBy(desc(requestLogs.createdAt)).limit(pagination.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(requestLogs),
    ]);

    sendSuccess(res, items, 'Request logs retrieved', 200, {
      page: pagination.page, limit: pagination.limit, total: Number(count), totalPages: calcTotalPages(Number(count), pagination.limit),
    });
  } catch (err) { next(err); }
}

export async function getMonitoringRealtime(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const since1m = new Date(Date.now() - 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [requestsPerMin, avgLatency, successRate, allReqs] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(requestLogs).where(gte(requestLogs.createdAt, since1m)),
      db.select({ avg: sql<number>`avg(latency_ms)` }).from(requestLogs).where(gte(requestLogs.createdAt, since24h)),
      db.select({ total: sql<number>`count(*)`, success: sql<number>`sum(case when success then 1 else 0 end)` }).from(requestLogs).where(gte(requestLogs.createdAt, since24h)),
      db.select({ count: sql<number>`count(*)` }).from(requestLogs),
    ]);

    const successRateVal = successRate[0].total > 0
      ? ((successRate[0].success / successRate[0].total) * 100).toFixed(1)
      : '100.0';

    sendSuccess(res, {
      requestsPerMinute: Number(requestsPerMin[0].count),
      avgLatencyMs: Math.round(Number(avgLatency[0].avg ?? 0)),
      successRate: `${successRateVal}%`,
      totalRequests: Number(allReqs[0].count),
    });
  } catch (err) { next(err); }
}

export async function getAreaChart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        hour: sql<string>`TO_CHAR(DATE_TRUNC('hour', ${requestLogs.createdAt}), 'HH24:00')`,
        requests: sql<number>`count(*)`,
        avgLatency: sql<number>`avg(latency_ms)`,
      })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, since))
      .groupBy(sql`DATE_TRUNC('hour', ${requestLogs.createdAt})`)
      .orderBy(sql`DATE_TRUNC('hour', ${requestLogs.createdAt})`);

    sendSuccess(res, rows);
  } catch (err) { next(err); }
}
