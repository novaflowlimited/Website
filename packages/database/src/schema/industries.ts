import { pgTable, text, timestamp, uuid, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { contentStatusEnum, seoMetadata } from './seo-metadata';
import { media } from './media';
import { users } from './users';

export const industries = pgTable('industries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  businessContext: text('business_context'),
  challengeHeadline: text('challenge_headline'),
  challenge: text('challenge'),
  systemDescription: text('system_description'),
  systemItems: jsonb('system_items').$type<string[]>().default([]).notNull(),
  visualMediaId: uuid('visual_media_id').references(() => media.id),
  mobileVisualMediaId: uuid('mobile_visual_media_id').references(() => media.id),
  relatedProducts: jsonb('related_products').$type<string[]>().default([]).notNull(), // array of product IDs
  relatedCapabilities: jsonb('related_capabilities').$type<string[]>().default([]).notNull(), // array of capability IDs
  order: integer('order').default(0).notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  seoId: uuid('seo_id').references(() => seoMetadata.id),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

export type Industry = typeof industries.$inferSelect;
export type NewIndustry = typeof industries.$inferInsert;
