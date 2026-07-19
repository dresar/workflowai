import { z } from 'zod';

export const createTechnologySchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  version: z.string().max(50).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateTechnologySchema = createTechnologySchema.partial();

export const technologyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export type CreateTechnologyDto = z.infer<typeof createTechnologySchema>;
export type UpdateTechnologyDto = z.infer<typeof updateTechnologySchema>;
