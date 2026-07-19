import { pgTable, uuid, text, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { projects } from './projects.schema';

export const documentTypeEnum = pgEnum('document_type', [
  'prd',
  'architecture',
  'database',
  'api',
  'tasks',
  'prompt',
  'canvas',
]);

export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull().default(1),
  providerUsed: varchar('provider_used', { length: 100 }),
  modelUsed: varchar('model_used', { length: 255 }),
  tokensUsed: integer('tokens_used'),
  generationTimeMs: integer('generation_time_ms'),
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
