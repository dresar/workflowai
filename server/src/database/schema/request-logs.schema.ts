import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';
import { apiKeys } from './api-keys.schema';

export const requestLogs = pgTable('request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: varchar('request_id', { length: 36 }).notNull(),
  projectId: uuid('project_id'),
  generateType: varchar('generate_type', { length: 100 }),
  providerName: varchar('provider_name', { length: 100 }),
  model: varchar('model', { length: 255 }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  latencyMs: integer('latency_ms'),
  success: boolean('success').notNull().default(false),
  errorMessage: text('error_message'),
  rotationEvents: jsonb('rotation_events').$type<unknown[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
