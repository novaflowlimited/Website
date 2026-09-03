import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { seoMetadata } from './seo-metadata';
import { media } from './media';
import { users } from './users';

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  logoMediaId: uuid('logo_media_id').references(() => media.id),
  faviconMediaId: uuid('favicon_media_id').references(() => media.id),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 100 }),
  address: text('address'),
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),
  defaultSeoId: uuid('default_seo_id').references(() => seoMetadata.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;
