import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'interview',
  'canvas',
  'prd',
  'architecture',
  'database',
  'api',
  'tasks',
  'prompt',
  'complete',
]);

export const techSelectionModeEnum = pgEnum('tech_selection_mode', ['auto', 'manual']);

export const projectLanguageEnum = pgEnum('project_language', ['id', 'en']);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  idea: text('idea').notNull(),
  description: text('description'),
  language: projectLanguageEnum('language').notNull().default('id'),
  preferredAiTarget: varchar('preferred_ai_target', { length: 100 }).default('Cursor'),
  techSelectionMode: techSelectionModeEnum('tech_selection_mode').notNull().default('manual'),
  status: projectStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
