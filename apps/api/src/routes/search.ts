import { Hono } from 'hono';
import { db } from '@novaflow/database';
import { products, industries, caseStudies, capabilities, media, articles } from '@novaflow/database';
import { ilike, or, sql } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

app.get('/', requireAuth, async (c) => {
  const q = c.req.query('q') ?? '';
  if (!q.trim()) return c.json({ results: [] });

  const pattern = `%${q}%`;

  const [productResults, industryResults, capabilityResults, caseStudyResults, mediaResults, articleResults] = await Promise.all([
    db.select({ id: products.id, name: products.name, type: sql<string>`'product'`.as('type'), slug: products.slug }).from(products).where(or(ilike(products.name, pattern), ilike(products.category, pattern))!).limit(5),
    db.select({ id: industries.id, name: industries.name, type: sql<string>`'industry'`.as('type'), slug: industries.slug }).from(industries).where(ilike(industries.name, pattern)).limit(5),
    db.select({ id: capabilities.id, name: capabilities.name, type: sql<string>`'capability'`.as('type'), slug: capabilities.slug }).from(capabilities).where(ilike(capabilities.name, pattern)).limit(5),
    db.select({ id: caseStudies.id, name: caseStudies.title, type: sql<string>`'case_study'`.as('type'), slug: caseStudies.slug }).from(caseStudies).where(ilike(caseStudies.title, pattern)).limit(5),
    db.select({ id: media.id, name: media.filename, type: sql<string>`'media'`.as('type'), slug: sql<string>`''`.as('slug') }).from(media).where(ilike(media.filename, pattern)).limit(5),
    db.select({ id: articles.id, name: articles.title, type: sql<string>`'article'`.as('type'), slug: articles.slug }).from(articles).where(or(ilike(articles.title, pattern), ilike(articles.excerpt, pattern))!).limit(5),
  ]);

  const results = [
    ...productResults,
    ...industryResults,
    ...capabilityResults,
    ...caseStudyResults,
    ...mediaResults,
    ...articleResults,
  ];

  return c.json({ results });
});

export default app;
