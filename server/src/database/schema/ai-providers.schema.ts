import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  baseUrl: text('base_url'),
  defaultModel: varchar('default_model', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(99),
  timeoutMs: integer('timeout_ms').notNull().default(60000),
  maxRetries: integer('max_retries').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
