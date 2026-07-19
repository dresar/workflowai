import { db } from '../../../database/connection';
import { aiProviders, apiKeys } from '../../../database/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { encrypt, maskKey, decrypt } from '../../../shared/utils/crypto.util';
import { NotFoundError } from '../../../errors/domain-errors';
import { calcOffset } from '../../../shared/utils/pagination.util';
import type { PaginationParams } from '../../../shared/types/api-response.types';

export class ProviderRepository {
  async findAll() {
    return db.select().from(aiProviders).orderBy(asc(aiProviders.priority));
  }

  async findById(id: string) {
    const [row] = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1);
    return row;
  }

  async create(data: typeof aiProviders.$inferInsert) {
    const [row] = await db.insert(aiProviders).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<typeof aiProviders.$inferInsert>) {
    const [row] = await db.update(aiProviders).set({ ...data, updatedAt: new Date() }).where(eq(aiProviders.id, id)).returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(aiProviders).where(eq(aiProviders.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export class ApiKeyRepository {
  async findAll(params: PaginationParams & { providerId?: string }) {
    const { page, limit, providerId } = params;
    const offset = calcOffset(page, limit);
    const condition = providerId ? eq(apiKeys.providerId, providerId) : undefined;

    const [items, [{ count }]] = await Promise.all([
      db.select().from(apiKeys).where(condition).orderBy(asc(apiKeys.priority)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(apiKeys).where(condition),
    ]);

    return {
      items: items.map((k) => ({ ...k, keyEncrypted: undefined, keyPreview: k.keyPreview })),
      total: Number(count),
    };
  }

  async findById(id: string) {
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    return row;
  }

  async create(data: { providerId: string; label: string; apiKey: string; priority?: number }) {
    const keyEncrypted = encrypt(data.apiKey);
    const keyPreview = maskKey(data.apiKey);
    const [row] = await db.insert(apiKeys).values({
      providerId: data.providerId,
      label: data.label,
      keyEncrypted,
      keyPreview,
      priority: data.priority ?? 99,
    }).returning();
    return { ...row, keyEncrypted: undefined };
  }

  async update(id: string, data: Partial<{ label: string; priority: number; isActive: boolean }>) {
    const [row] = await db.update(apiKeys).set({ ...data, updatedAt: new Date() }).where(eq(apiKeys.id, id)).returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async resetQuota(id: string) {
    const [row] = await db.update(apiKeys).set({ quotaUsed: 0, cooldownUntil: null, updatedAt: new Date() }).where(eq(apiKeys.id, id)).returning();
    return row;
  }

  async getDecryptedKey(id: string): Promise<string | null> {
    const key = await this.findById(id);
    if (!key) return null;
    try { return decrypt(key.keyEncrypted); } catch { return null; }
  }
}
