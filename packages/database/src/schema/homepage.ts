import { pgTable, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { contentStatusEnum, seoMetadata } from './seo-metadata';
import { users } from './users';

export interface HomepageHeroContent {
  visible: boolean;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  supportingText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  heroVisualMediaId: string | null;
  mobileHeroVisualMediaId: string | null;
}

export interface HomepageWhatWeBuildContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  capabilityIds: string[];
  desktopVisualMediaId: string | null;
  mobileVisualMediaId: string | null;
}

export interface HomepageProductsContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredProductIds: string[];
}

export interface HomepageForBusinessContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredIndustryIds: string[];
}

export interface HomepageWorkContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredCaseStudyIds: string[];
}

export interface HomepageAboutContent {
  visible: boolean;
  eyebrow: string;
  headlineLines: string[];
  shortDescription: string;
  metaLine: string;
  visualMediaId: string | null;
  linkLabel: string;
  linkUrl: string;
}

export interface HomepageContactContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  supportingText: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface HomepageContent {
  hero: HomepageHeroContent;
  whatWeBuild: HomepageWhatWeBuildContent;
  products: HomepageProductsContent;
  forBusiness: HomepageForBusinessContent;
  work: HomepageWorkContent;
  about: HomepageAboutContent;
  contact: HomepageContactContent;
}

export const homepage = pgTable('homepage', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftContent: jsonb('draft_content').$type<HomepageContent>().notNull(),
  publishedContent: jsonb('published_content').$type<HomepageContent>(),
  status: contentStatusEnum('status').default('draft').notNull(),
  seoId: uuid('seo_id').references(() => seoMetadata.id),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

export type Homepage = typeof homepage.$inferSelect;
export type NewHomepage = typeof homepage.$inferInsert;
