import { db } from '../../database/connection';
import { projects, projectTechnologies, interviewAnswers, canvasStructures, generatedDocuments } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { PaginationParams } from '../../shared/types/api-response.types';
import { calcOffset } from '../../shared/utils/pagination.util';
import { sql } from 'drizzle-orm';

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectTechnology = typeof projectTechnologies.$inferSelect;
export type NewProjectTechnology = typeof projectTechnologies.$inferInsert;
export type InterviewAnswer = typeof interviewAnswers.$inferSelect;
export type NewInterviewAnswer = typeof interviewAnswers.$inferInsert;
export type CanvasStructure = typeof canvasStructures.$inferSelect;
export type NewCanvasStructure = typeof canvasStructures.$inferInsert;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

export class ProjectRepository {
  async findById(id: string): Promise<Project | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row;
  }

  async findAll(params: PaginationParams): Promise<{ items: Project[]; total: number }> {
    const offset = calcOffset(params.page, params.limit);
    const [items, [{ count }]] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.createdAt)).limit(params.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(projects),
    ]);
    return { items, total: Number(count) };
  }

  async create(data: NewProject): Promise<Project> {
    const [row] = await db.insert(projects).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewProject>): Promise<Project | undefined> {
    const [row] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async saveTechnologies(projectId: string, techs: NewProjectTechnology[]): Promise<ProjectTechnology[]> {
    await db.delete(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
    if (techs.length === 0) return [];
    return db.insert(projectTechnologies).values(techs).returning();
  }

  async findTechnologies(projectId: string): Promise<ProjectTechnology[]> {
    return db.select().from(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
  }

  async upsertAnswer(data: NewInterviewAnswer): Promise<InterviewAnswer> {
    const existing = await db
      .select()
      .from(interviewAnswers)
      .where(and(eq(interviewAnswers.projectId, data.projectId!), eq(interviewAnswers.questionId, data.questionId!)))
      .limit(1);

    if (existing.length > 0) {
      const [row] = await db
        .update(interviewAnswers)
        .set({ answer: data.answer, updatedAt: new Date() })
        .where(eq(interviewAnswers.id, existing[0].id))
        .returning();
      return row;
    }

    const [row] = await db.insert(interviewAnswers).values(data).returning();
    return row;
  }

  async findAnswers(projectId: string): Promise<InterviewAnswer[]> {
    return db.select().from(interviewAnswers).where(eq(interviewAnswers.projectId, projectId));
  }

  async saveCanvas(data: NewCanvasStructure): Promise<CanvasStructure> {
    const existing = await db
      .select()
      .from(canvasStructures)
      .where(eq(canvasStructures.projectId, data.projectId!))
      .limit(1);

    if (existing.length > 0) {
      const [row] = await db
        .update(canvasStructures)
        .set({ features: data.features, isAiGenerated: data.isAiGenerated, updatedAt: new Date() })
        .where(eq(canvasStructures.projectId, data.projectId!))
        .returning();
      return row;
    }

    const [row] = await db.insert(canvasStructures).values(data).returning();
    return row;
  }

  async findCanvas(projectId: string): Promise<CanvasStructure | undefined> {
    const [row] = await db.select().from(canvasStructures).where(eq(canvasStructures.projectId, projectId)).limit(1);
    return row;
  }

  async findDocuments(projectId: string): Promise<GeneratedDocument[]> {
    return db.select().from(generatedDocuments).where(eq(generatedDocuments.projectId, projectId)).orderBy(desc(generatedDocuments.createdAt));
  }

  async findCurrentDocument(projectId: string, type: string): Promise<GeneratedDocument | undefined> {
    const [row] = await db
      .select()
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.projectId, projectId),
        eq(generatedDocuments.type, type as typeof generatedDocuments.$inferSelect.type),
        eq(generatedDocuments.isCurrent, true),
      ))
      .limit(1);
    return row;
  }

  async findDocumentHistory(projectId: string, type: string): Promise<GeneratedDocument[]> {
    return db
      .select()
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.projectId, projectId),
        eq(generatedDocuments.type, type as typeof generatedDocuments.$inferSelect.type),
      ))
      .orderBy(desc(generatedDocuments.version));
  }

  async saveDocument(data: typeof generatedDocuments.$inferInsert): Promise<GeneratedDocument> {
    await db
      .update(generatedDocuments)
      .set({ isCurrent: false })
      .where(and(
        eq(generatedDocuments.projectId, data.projectId!),
        eq(generatedDocuments.type, data.type!),
      ));

    const [lastVersion] = await db
      .select({ version: generatedDocuments.version })
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.projectId, data.projectId!),
        eq(generatedDocuments.type, data.type!),
      ))
      .orderBy(desc(generatedDocuments.version))
      .limit(1);

    const version = (lastVersion?.version ?? 0) + 1;
    const [row] = await db.insert(generatedDocuments).values({ ...data, version, isCurrent: true }).returning();
    return row;
  }

  async deleteDocuments(projectId: string): Promise<void> {
    await db.delete(generatedDocuments).where(eq(generatedDocuments.projectId, projectId));
  }
}
