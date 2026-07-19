import { db } from '../../database/connection';
import {
  projects,
  projectTechnologies,
  interviewAnswers,
  interviewQuestions,
  canvasStructures,
  generatedDocuments,
} from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '../../errors/domain-errors';
import type { ProjectContext } from './context.types';
import type { GenerateType } from '../../shared/constants/app.constants';

export class ContextBuilder {
  async build(projectId: string, generateType: GenerateType): Promise<ProjectContext> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError('Project');

    const [
      techs,
      answers,
      canvas,
      allDocuments,
    ] = await Promise.all([
      db.select().from(projectTechnologies).where(eq(projectTechnologies.projectId, projectId)),
      db
        .select({
          id: interviewAnswers.id,
          questionId: interviewAnswers.questionId,
          answer: interviewAnswers.answer,
          question: interviewQuestions.question,
        })
        .from(interviewAnswers)
        .leftJoin(interviewQuestions, eq(interviewAnswers.questionId, interviewQuestions.id))
        .where(eq(interviewAnswers.projectId, projectId)),
      db.select().from(canvasStructures).where(eq(canvasStructures.projectId, projectId)).limit(1),
      db.select().from(generatedDocuments).where(
        and(eq(generatedDocuments.projectId, projectId), eq(generatedDocuments.isCurrent, true)),
      ),
    ]);

    let parsedAnswers: any[] = [];
    if (project.description) {
      try {
        const parsed = JSON.parse(project.description);
        if (Array.isArray(parsed)) {
          parsedAnswers = parsed.map((a: any) => ({
            questionId: a.questionId,
            question: a.question || a.questionId,
            answer: a.answer,
          }));
        }
      } catch {}
    }

    const finalAnswers = parsedAnswers.length > 0 ? parsedAnswers : answers.map((a) => ({
      questionId: a.questionId,
      question: a.question ?? undefined,
      answer: a.answer,
    }));

    const existingDocuments: Partial<Record<string, string>> = {};
    for (const doc of allDocuments) {
      existingDocuments[doc.type] = doc.content;
    }

    const recentGenerations = await db
      .select({
        type: generatedDocuments.type,
        version: generatedDocuments.version,
        createdAt: generatedDocuments.createdAt,
      })
      .from(generatedDocuments)
      .where(eq(generatedDocuments.projectId, projectId))
      .orderBy(desc(generatedDocuments.createdAt))
      .limit(10);

    const canvasFeatures = canvas[0]
      ? (canvas[0].features as Array<{ name: string; phase: string; subs: string[] }>)
      : [];

    return {
      project: {
        id: project.id,
        name: project.name,
        idea: project.idea,
        description: project.description,
        language: project.language,
        preferredAiTarget: project.preferredAiTarget ?? null,
        techSelectionMode: project.techSelectionMode,
        status: project.status,
      },
      technologies: techs.map((t) => ({
        category: t.category,
        technologyName: t.technologyName,
        isAiSelected: t.isAiSelected,
      })),
      interviewAnswers: finalAnswers,
      canvasFeatures,
      existingDocuments,
      recentGenerations: recentGenerations.map((r) => ({
        type: r.type,
        version: r.version,
        createdAt: r.createdAt,
      })),
    };
  }

  serializeToText(context: ProjectContext): string {
    const lines: string[] = [];

    lines.push(`# Project: ${context.project.name}`);
    lines.push(`Idea: ${context.project.idea}`);
    if (context.project.description) lines.push(`Description: ${context.project.description}`);
    lines.push(`Language: ${context.project.language}`);
    lines.push(`AI Target Tools: ${context.project.preferredAiTarget ?? 'Not specified'}`);
    lines.push(`Status: ${context.project.status}`);
    lines.push('');

    if (context.technologies.length > 0) {
      lines.push('## Technology Stack');
      for (const t of context.technologies) {
        lines.push(`- ${t.category}: ${t.technologyName}${t.isAiSelected ? ' (AI selected)' : ''}`);
      }
      lines.push('');
    }

    if (context.interviewAnswers.length > 0) {
      lines.push('## Interview Answers');
      for (const a of context.interviewAnswers) {
        lines.push(`Q: ${a.question ?? a.questionId}`);
        lines.push(`A: ${JSON.stringify(a.answer)}`);
      }
      lines.push('');
    }

    if (context.canvasFeatures.length > 0) {
      lines.push('## Feature Canvas');
      for (const f of context.canvasFeatures) {
        lines.push(`- ${f.name} [${f.phase}]: ${f.subs.join(', ')}`);
      }
      lines.push('');
    }

    const docTypes = ['prd', 'architecture', 'database', 'api', 'tasks'] as const;
    for (const type of docTypes) {
      if (context.existingDocuments[type]) {
        lines.push(`## Existing ${type.toUpperCase()}`);
        lines.push(context.existingDocuments[type]!.slice(0, 2000));
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
