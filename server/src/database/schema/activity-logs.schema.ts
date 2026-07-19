import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';

export const logLevelEnum = pgEnum('log_level', ['debug', 'info', 'warn', 'error']);

export const logCategoryEnum = pgEnum('log_category', [
  'request',
  'ai',
  'rotation',
  'database',
  'auth',
  'system',
]);

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: varchar('request_id', { length: 36 }),
  level: logLevelEnum('level').notNull().default('info'),
  category: logCategoryEnum('category').notNull().default('system'),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
