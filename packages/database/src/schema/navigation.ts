import { pgEnum, pgTable, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const navigationLocationEnum = pgEnum('navigation_location', ['main', 'footer']);
export const navigationVisibilityEnum = pgEnum('navigation_visibility', ['visible', 'hidden']);

export const navigationItems = pgTable('navigation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  order: integer('order').default(0).notNull(),
  visibility: navigationVisibilityEnum('visibility').default('visible').notNull(),
  location: navigationLocationEnum('location').default('main').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type NavigationItem = typeof navigationItems.$inferSelect;
export type NewNavigationItem = typeof navigationItems.$inferInsert;
