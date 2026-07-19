import { pgTable, uuid, text, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';

export const questionTypeEnum = pgEnum('question_type', [
  'textarea',
  'chips',
  'radio',
  'checkbox',
  'select',
  'switch',
]);

export const interviewQuestions = pgTable('interview_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: jsonb('options').$type<string[]>(),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
