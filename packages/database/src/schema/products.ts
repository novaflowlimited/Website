import { pgTable, text, timestamp, uuid, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { contentStatusEnum, seoMetadata } from './seo-metadata';
import { media } from './media';
import { users } from './users';

export interface ProductScreenshot {
  mediaId: string;
  title?: string | null;
  caption?: string | null;
  order: number;
}

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  category: varchar('category', { length: 255 }),
  shortDescription: text('short_description'),
  description: text('description'),
  problem: text('problem'),
  solution: text('solution'),
  features: jsonb('features').$type<string[]>().default([]).notNull(),
  workflow: jsonb('workflow').$type<string[]>().default([]).notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().default([]).notNull(), // array of capability IDs
  industries: jsonb('industries').$type<string[]>().default([]).notNull(), // array of industry IDs
  logoMediaId: uuid('logo_media_id').references(() => media.id),
  heroMediaId: uuid('hero_media_id').references(() => media.id),
  screenshots: jsonb('screenshots').$type<ProductScreenshot[]>().default([]).notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  order: integer('order').default(0).notNull(),
  seoId: uuid('seo_id').references(() => seoMetadata.id),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
