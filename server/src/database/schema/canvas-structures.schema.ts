import { pgTable, uuid, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';

export const canvasStructures = pgTable('canvas_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().unique().references(() => projects.id, { onDelete: 'cascade' }),
  features: jsonb('features').notNull().default([]),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
