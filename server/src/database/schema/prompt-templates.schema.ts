import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const generateTypeEnum = pgEnum('generate_type', [
  'prd',
  'architecture',
  'database',
  'api',
  'tasks',
  'prompt',
  'canvas',
  'workflow',
]);

export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  generateType: generateTypeEnum('generate_type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  developerPrompt: text('developer_prompt'),
  userPrompt: text('user_prompt').notNull(),
  model: varchar('model', { length: 255 }),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.7'),
  maxTokens: integer('max_tokens').default(8192),
  topP: decimal('top_p', { precision: 3, scale: 2 }).default('0.9'),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
