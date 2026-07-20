import { db } from '../../database/connection';
import { technologies } from '../../database/schema';
import { and, eq, like, asc, sql } from 'drizzle-orm';
import type { PaginationParams } from '../../shared/types/api-response.types';
import { calcOffset } from '../../shared/utils/pagination.util';

export type NewTechnology = typeof technologies.$inferInsert;
export type Technology = typeof technologies.$inferSelect;

export class TechnologyRepository {
  async findAll(params: PaginationParams & { category?: string; search?: string; activeOnly?: boolean }) {
    const { page, limit, category, search, activeOnly } = params;
    const offset = calcOffset(page, limit);

    const conditions: any[] = [];

    if (activeOnly) conditions.push(eq(technologies.isActive, true));
    if (category && category !== 'all') conditions.push(eq(technologies.category, category));
    if (search && search.trim()) conditions.push(like(technologies.name, `%${search.trim()}%`));

    const query = db
      .select()
      .from(technologies)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(technologies.sortOrder), asc(technologies.name))
      .limit(limit)
      .offset(offset);

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(technologies);

    const [items, [{ count }]] = await Promise.all([query, countQuery]);

    return { items, total: Number(count) };
  }

  async findById(id: string): Promise<Technology | undefined> {
    const [row] = await db.select().from(technologies).where(eq(technologies.id, id)).limit(1);
    return row;
  }

  async findActive(): Promise<Technology[]> {
    return db.select().from(technologies).where(eq(technologies.isActive, true)).orderBy(asc(technologies.sortOrder));
  }

  async findCategories(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ category: technologies.category })
      .from(technologies)
      .orderBy(asc(technologies.category));
    return rows.map((r) => r.category);
  }

  async create(data: NewTechnology): Promise<Technology> {
    const [row] = await db.insert(technologies).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewTechnology>): Promise<Technology | undefined> {
    const [row] = await db
      .update(technologies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(technologies.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(technologies).where(eq(technologies.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async toggleActive(id: string, isActive: boolean): Promise<Technology | undefined> {
    return this.update(id, { isActive });
  }
}
