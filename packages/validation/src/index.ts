import { z } from 'zod';

export const seoMetadataSchema = z.object({
  id: z.string().uuid(),
  page_id: z.string().uuid().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
  canonical_url: z.string().nullable().optional(),
  og_title: z.string().nullable().optional(),
  og_description: z.string().nullable().optional(),
  og_image_url: z.string().nullable().optional(),
  twitter_card: z.string().nullable().optional(),
});

export const pageBlockSchema = z.object({
  id: z.string().uuid(),
  page_id: z.string().uuid(),
  type: z.string(),
  position: z.number().int().nonnegative(),
  data: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const pageSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  template: z.string().nullable().optional(),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  published_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const solutionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const productSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const industrySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const caseStudySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const blogPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  published_at: z.string().nullable().optional(),
  seo_metadata_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const leadSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  company: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const formSubmissionSchema = z.object({
  id: z.string().uuid(),
  form_id: z.string().uuid(),
  payload: z.record(z.unknown()),
  submitted_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export * from './article';

export const { Page, PageBlock, Solution, Product, Industry, CaseStudy, BlogPost, Lead, FormSubmission } = {
  Page: pageSchema,
  PageBlock: pageBlockSchema,
  Solution: solutionSchema,
  Product: productSchema,
  Industry: industrySchema,
  CaseStudy: caseStudySchema,
  BlogPost: blogPostSchema,
  Lead: leadSchema,
  FormSubmission: formSubmissionSchema,
};
