import { pgTable, uuid, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';

export const rotationStrategyEnum = pgEnum('rotation_strategy', [
  'round_robin',
  'priority',
  'random',
  'fallback',
]);

export const rotationConfig = pgTable('rotation_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  strategy: rotationStrategyEnum('strategy').notNull().default('round_robin'),
  autoRotation: boolean('auto_rotation').notNull().default(true),
  autoRetry: boolean('auto_retry').notNull().default(true),
  maxRetries: integer('max_retries').notNull().default(3),
  timeoutSeconds: integer('timeout_seconds').notNull().default(60),
  cooldownMinutes: integer('cooldown_minutes').notNull().default(5),
  providerOrder: jsonb('provider_order').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
