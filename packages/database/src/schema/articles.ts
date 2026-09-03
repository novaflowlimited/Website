import { pgTable, text, timestamp, uuid, varchar, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { contentStatusEnum } from './seo-metadata';
import { media } from './media';
import { users } from './users';

export type ArticleBlockType = 'heading' | 'paragraph' | 'quote' | 'list' | 'code' | 'image' | 'table';

export interface ArticleHeadingBlock {
  id: string;
  type: 'heading';
  level: 2 | 3;
  text: string;
}

export interface ArticleParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
}

export interface ArticleQuoteBlock {
  id: string;
  type: 'quote';
  text: string;
  attribution?: string | null;
}

export interface ArticleListBlock {
  id: string;
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface ArticleCodeBlock {
  id: string;
  type: 'code';
  language?: string | null;
  code: string;
}

export interface ArticleImageBlock {
  id: string;
  type: 'image';
  mediaId: string;
  caption?: string | null;
  layout: 'inline' | 'full';
}

export interface ArticleTableBlock {
  id: string;
  type: 'table';
  headers: string[];
  rows: string[][];
}

export type ArticleBlock =
  | ArticleHeadingBlock
  | ArticleParagraphBlock
  | ArticleQuoteBlock
  | ArticleListBlock
  | ArticleCodeBlock
  | ArticleImageBlock
  | ArticleTableBlock;

export interface ArticleDocument {
  blocks: ArticleBlock[];
}

export const emptyArticleDocument: ArticleDocument = { blocks: [] };

export const articleCategories = pgTable('article_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const articleAuthors = pgTable('article_authors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 255 }),
  bio: text('bio'),
  photoMediaId: uuid('photo_media_id').references(() => media.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: jsonb('content').$type<ArticleDocument>().default({ blocks: [] }).notNull(),
  heroMediaId: uuid('hero_media_id').references(() => media.id),
  categoryId: uuid('category_id').references(() => articleCategories.id),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  authorId: uuid('author_id').references(() => articleAuthors.id),
  featured: boolean('featured').default(false).notNull(),
  order: integer('order').default(0).notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  ogImageMediaId: uuid('og_image_media_id').references(() => media.id),
  relatedProductIds: jsonb('related_product_ids').$type<string[]>().default([]).notNull(),
  relatedIndustryIds: jsonb('related_industry_ids').$type<string[]>().default([]).notNull(),
  previewToken: varchar('preview_token', { length: 64 }),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

export type ArticleCategory = typeof articleCategories.$inferSelect;
export type NewArticleCategory = typeof articleCategories.$inferInsert;
export type ArticleAuthor = typeof articleAuthors.$inferSelect;
export type NewArticleAuthor = typeof articleAuthors.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
