import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  idea: z.string().min(10, 'Idea must be at least 10 characters'),
  language: z.enum(['id', 'en']).default('id'),
  preferredAiTarget: z.string().max(100).optional(),
  techSelectionMode: z.enum(['auto', 'manual']).default('manual'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'interview', 'canvas', 'prd', 'architecture', 'database', 'api', 'tasks', 'prompt', 'complete']).optional(),
  preferredAiTarget: z.string().max(100).optional(),
});

export const saveTechnologiesSchema = z.object({
  technologies: z.array(z.object({
    category: z.string().min(1).max(100),
    technologyId: z.string().uuid().optional(),
    technologyName: z.string().min(1).max(255),
    isAiSelected: z.boolean().default(false),
  })).min(1),
});

export const saveAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    question: z.string().optional(),
    answer: z.union([z.string(), z.array(z.string()), z.boolean()]),
  })).min(1),
});

export const saveCanvasSchema = z.object({
  features: z.array(z.object({
    name: z.string(),
    phase: z.string(),
    icon: z.string().optional(),
    iconName: z.string().optional(),
    subs: z.array(z.string()),
    tasks: z.array(z.string()).optional(),
  })),
  isAiGenerated: z.boolean().default(false),
});

export const projectIdParamSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
});

export const documentTypeParamSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['prd', 'architecture', 'database', 'api', 'tasks', 'prompt', 'canvas']),
});

export const saveDocumentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type SaveTechnologiesDto = z.infer<typeof saveTechnologiesSchema>;
export type SaveAnswersDto = z.infer<typeof saveAnswersSchema>;
export type SaveCanvasDto = z.infer<typeof saveCanvasSchema>;
export type SaveDocumentDto = z.infer<typeof saveDocumentSchema>;

