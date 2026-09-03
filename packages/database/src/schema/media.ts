import { pgTable, text, timestamp, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  altText: text('alt_text'),
  decorative: boolean('decorative').default(false).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'image' | 'logo' | 'screenshot' | 'og-image'
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: integer('size_bytes').notNull(),
  r2Key: text('r2_key').notNull(),
  r2Url: text('r2_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  focalX: integer('focal_x').default(50), // percentage 0-100
  focalY: integer('focal_y').default(50), // percentage 0-100
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
