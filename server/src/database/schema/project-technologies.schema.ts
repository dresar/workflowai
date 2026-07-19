import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';
import { technologies } from './technologies.schema';

export const projectTechnologies = pgTable('project_technologies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  technologyId: uuid('technology_id').references(() => technologies.id, { onDelete: 'set null' }),
  technologyName: varchar('technology_name', { length: 255 }).notNull(),
  isAiSelected: boolean('is_ai_selected').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
