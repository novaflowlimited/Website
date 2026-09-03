import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'reviewing',
  'contacted',
  'qualified',
  'closed',
  'in_progress',
]);

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 100 }),
  projectType: varchar('project_type', { length: 255 }),
  budgetRange: varchar('budget_range', { length: 100 }),
  timeline: varchar('timeline', { length: 100 }),
  message: text('message').notNull(),
  source: varchar('source', { length: 255 }),
  internalNotes: text('internal_notes'),
  status: leadStatusEnum('status').default('new').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
