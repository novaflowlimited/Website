import { eq, and, sql, ne } from 'drizzle-orm';
import { db } from '@novaflow/database';
import {
  products,
  industries,
  caseStudies,
  capabilities,
  articles,
  articleCategories,
  articleAuthors,
} from '@novaflow/database';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function checkSlugUniqueness(
  table:
    | typeof products
    | typeof industries
    | typeof caseStudies
    | typeof capabilities
    | typeof articles
    | typeof articleCategories
    | typeof articleAuthors,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(table.slug, slug)];
  if (excludeId) {
    conditions.push(ne(table.id, excludeId));
  }
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(and(...conditions))
    .limit(1);
  return existing.length === 0;
}

export async function validateProductPublish(
  productId: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { valid: false, errors: ['Product not found.'] };
  }

  if (!product.name?.trim()) {
    errors.push('Product name is required.');
  }
  if (!product.slug?.trim()) {
    errors.push('Slug is required.');
  }
  if (!product.shortDescription?.trim()) {
    errors.push('Short description is required.');
  }
  if (!product.category?.trim()) {
    errors.push('Category is required.');
  }
  if (!product.heroMediaId) {
    errors.push('Hero visual is required.');
  }
  if (!product.description?.trim()) {
    errors.push('Description is required.');
  }

  return { valid: errors.length === 0, errors };
}

export async function validateCaseStudyPublish(
  caseStudyId: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const [caseStudy] = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.id, caseStudyId))
    .limit(1);

  if (!caseStudy) {
    return { valid: false, errors: ['Case study not found.'] };
  }

  if (!caseStudy.title?.trim()) {
    errors.push('Title is required.');
  }
  if (!caseStudy.slug?.trim()) {
    errors.push('Slug is required.');
  }

  return { valid: errors.length === 0, errors };
}

export async function validateIndustryPublish(industryId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const [industry] = await db
    .select()
    .from(industries)
    .where(eq(industries.id, industryId))
    .limit(1);

  if (!industry) {
    return { valid: false, errors: ['Industry not found.'] };
  }

  if (!industry.name?.trim()) {
    errors.push('Industry name is required.');
  }
  if (!industry.slug?.trim()) {
    errors.push('Slug is required.');
  }
  if (!industry.shortDescription?.trim()) {
    errors.push('Short description is required.');
  }

  return { valid: errors.length === 0, errors };
}

export async function validateArticlePublish(articleId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) return { valid: false, errors: ['Article not found.'] };
  if (!article.title?.trim()) errors.push('Title is required.');
  if (!article.slug?.trim()) errors.push('Slug is required.');
  if (!article.excerpt?.trim()) errors.push('Excerpt is required.');
  if (!article.categoryId) errors.push('Category is required.');
  const blockCount = article.content?.blocks?.length ?? 0;
  if (blockCount === 0) errors.push('Article body is required.');
  return { valid: errors.length === 0, errors };
}

export async function getMediaReferences(mediaId: string): Promise<
  Array<{ entityType: string; entityId: string; entityName: string }>
> {
  const references: Array<{ entityType: string; entityId: string; entityName: string }> = [];

  // Check products
  const productsWithMedia = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(
      sql`${products.logoMediaId} = ${mediaId} OR ${products.heroMediaId} = ${mediaId} OR ${products.screenshots} @> ${JSON.stringify([{ mediaId }])}::jsonb`,
    );
  for (const p of productsWithMedia) {
    references.push({ entityType: 'product', entityId: p.id, entityName: p.name });
  }

  // Check industries
  const industriesWithMedia = await db
    .select({ id: industries.id, name: industries.name })
    .from(industries)
    .where(
      sql`${industries.visualMediaId} = ${mediaId} OR ${industries.mobileVisualMediaId} = ${mediaId}`,
    );
  for (const i of industriesWithMedia) {
    references.push({ entityType: 'industry', entityId: i.id, entityName: i.name });
  }

  // Check case studies
  const caseStudiesWithMedia = await db
    .select({ id: caseStudies.id, title: caseStudies.title })
    .from(caseStudies)
    .where(
      sql`${caseStudies.heroMediaId} = ${mediaId} OR ${caseStudies.gallery}::text ilike ${'%' + mediaId + '%'}`,
    );
  for (const cs of caseStudiesWithMedia) {
    references.push({ entityType: 'case_study', entityId: cs.id, entityName: cs.title });
  }

  const articlesWithMedia = await db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(
      sql`${articles.heroMediaId} = ${mediaId} OR ${articles.ogImageMediaId} = ${mediaId} OR ${articles.content}::text ilike ${'%' + mediaId + '%'}`,
    );
  for (const article of articlesWithMedia) {
    references.push({ entityType: 'article', entityId: article.id, entityName: article.title });
  }

  const authorsWithMedia = await db
    .select({ id: articleAuthors.id, name: articleAuthors.name })
    .from(articleAuthors)
    .where(eq(articleAuthors.photoMediaId, mediaId));
  for (const author of authorsWithMedia) {
    references.push({ entityType: 'author', entityId: author.id, entityName: author.name });
  }

  return references;
}
