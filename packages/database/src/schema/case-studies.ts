import { pgTable, text, timestamp, uuid, varchar, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { contentStatusEnum, seoMetadata } from './seo-metadata';
import { media } from './media';
import { users } from './users';

export interface CaseStudyGalleryItem {
  mediaId: string;
  caption?: string | null;
  treatment?: 'full' | 'detail' | 'pair';
  order: number;
}

export const caseStudies = pgTable('case_studies', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  client: varchar('client', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  summary: text('summary'),
  challenge: text('challenge'),
  approach: text('approach'),
  solution: text('solution'),
  result: text('result'),
  heroMediaId: uuid('hero_media_id').references(() => media.id),
  gallery: jsonb('gallery').$type<Array<string | CaseStudyGalleryItem>>().default([]).notNull(),
  products: jsonb('products').$type<string[]>().default([]).notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().default([]).notNull(),
  testimonial: text('testimonial'),
  featured: boolean('featured').default(false).notNull(),
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

export type CaseStudy = typeof caseStudies.$inferSelect;
export type NewCaseStudy = typeof caseStudies.$inferInsert;
