import { pgTable, text, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { contentStatusEnum, seoMetadata } from './seo-metadata';
import { users } from './users';

export const capabilities = pgTable('capabilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  order: integer('order').default(0).notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  seoId: uuid('seo_id').references(() => seoMetadata.id),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Capability = typeof capabilities.$inferSelect;
export type NewCapability = typeof capabilities.$inferInsert;
