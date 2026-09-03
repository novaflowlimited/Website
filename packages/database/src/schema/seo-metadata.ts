import { pgEnum, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);

export const seoMetadata = pgTable('seo_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'page' | 'product' | 'industry' | 'case_study' | 'default'
  entityId: uuid('entity_id'), // null for default SEO
  title: varchar('title', { length: 255 }),
  description: text('description'),
  ogTitle: varchar('og_title', { length: 255 }),
  ogDescription: text('og_description'),
  ogImageMediaId: uuid('og_image_media_id'),
  canonicalUrl: text('canonical_url'),
  twitterCard: varchar('twitter_card', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SeoMetadata = typeof seoMetadata.$inferSelect;
export type NewSeoMetadata = typeof seoMetadata.$inferInsert;
