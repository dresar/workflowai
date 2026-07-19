import { db } from '../../../database/connection';
import { projects, generatedDocuments, requestLogs, aiProviders, apiKeys } from '../../../database/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

export class DashboardRepository {
  async getStats() {
    const [
      [totalProjects],
      [totalDocs],
      [totalRequests],
      [activeKeys],
      [activeProviders],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(projects),
      db.select({ count: sql<number>`count(*)` }).from(generatedDocuments),
      db.select({ count: sql<number>`count(*)` }).from(requestLogs),
      db.select({ count: sql<number>`count(*)` }).from(apiKeys).where(eq(apiKeys.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(aiProviders).where(eq(aiProviders.isActive, true)),
    ]);

    const prdCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(generatedDocuments)
      .where(eq(generatedDocuments.type, 'prd'));

    const promptCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(generatedDocuments)
      .where(eq(generatedDocuments.type, 'prompt'));

    return {
      totalProjects: Number(totalProjects.count),
      totalDocuments: Number(totalDocs.count),
      totalPRD: Number(prdCount[0]?.count ?? 0),
      totalPrompts: Number(promptCount[0]?.count ?? 0),
      totalApiRequests: Number(totalRequests.count),
      activeApiKeys: Number(activeKeys.count),
      activeProviders: Number(activeProviders.count),
    };
  }

  async getAIUsageChart(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        date: sql<string>`DATE(${requestLogs.createdAt})`,
        provider: requestLogs.providerName,
        count: sql<number>`count(*)`,
      })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, since))
      .groupBy(sql`DATE(${requestLogs.createdAt})`, requestLogs.providerName)
      .orderBy(sql`DATE(${requestLogs.createdAt})`);

    return rows;
  }

  async getProviderDistribution() {
    const rows = await db
      .select({
        provider: requestLogs.providerName,
        count: sql<number>`count(*)`,
      })
      .from(requestLogs)
      .where(eq(requestLogs.success, true))
      .groupBy(requestLogs.providerName)
      .orderBy(sql`count(*) DESC`);

    return rows;
  }
}
