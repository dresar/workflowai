import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const settingTypeEnum = pgEnum('setting_type', ['string', 'number', 'boolean', 'json']);

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
  type: settingTypeEnum('type').notNull().default('string'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
