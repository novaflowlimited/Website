import { pgTable, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // 'created' | 'updated' | 'published' | 'unpublished' | 'archived' | 'deleted' | 'uploaded'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'product' | 'industry' | 'capability' | 'case_study' | 'media' | 'navigation' | 'site_settings' | 'seo' | 'lead'
  entityId: uuid('entity_id'),
  entityName: varchar('entity_name', { length: 255 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
