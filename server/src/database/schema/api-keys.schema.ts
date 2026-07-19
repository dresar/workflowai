import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { aiProviders } from './ai-providers.schema';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  keyEncrypted: text('key_encrypted').notNull(),
  keyPreview: varchar('key_preview', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(99),
  totalRequests: integer('total_requests').notNull().default(0),
  failedRequests: integer('failed_requests').notNull().default(0),
  quotaLimit: integer('quota_limit'),
  quotaUsed: integer('quota_used').notNull().default(0),
  cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
