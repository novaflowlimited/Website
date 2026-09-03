import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { articles, articleCategories } from '@novaflow/database';
import { eq, ilike, desc, asc, sql, and, or } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, slugify, validateArticlePublish } from '../lib/validation';
import { enrichArticle, toArticleListItem } from '../lib/article-detail';
import { articleDocumentSchema, sanitizeArticleDocument } from '@novaflow/validation';
import type { SessionUser } from '../lib/auth';
import { safeEqualString } from '../lib/env';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const articleCreateSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  excerpt: z.string().max(2000).optional().nullable(),
  content: articleDocumentSchema.optional(),
  heroMediaId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).default([]),
  authorId: z.string().uuid().optional().nullable(),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImageMediaId: z.string().uuid().optional().nullable(),
  relatedProductIds: z.array(z.string().uuid()).max(6).default([]),
  relatedIndustryIds: z.array(z.string().uuid()).max(8).default([]),
  publishedAt: z.string().datetime().optional().nullable(),
});

const articleUpdateSchema = articleCreateSchema.partial();

function newPreviewToken() {
  return randomBytes(24).toString('hex');
}

function parseTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

app.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const category = c.req.query('category');
  const featured = c.req.query('featured');
  const sort = c.req.query('sort') ?? 'published';
  const order = c.req.query('order') ?? 'desc';
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (!user) {
    conditions.push(eq(articles.status, 'published'));
  } else if (status && status !== 'all') {
    conditions.push(eq(articles.status, status as 'draft' | 'published' | 'archived'));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(articles.title, pattern),
        ilike(articles.excerpt, pattern),
        sql`${articles.tags}::text ilike ${pattern}`,
      )!,
    );
  }

  if (category && category !== 'all') {
    const [cat] = await db
      .select({ id: articleCategories.id })
      .from(articleCategories)
      .where(or(eq(articleCategories.slug, category), eq(articleCategories.id, category)))
      .limit(1);
    if (cat) conditions.push(eq(articles.categoryId, cat.id));
    else conditions.push(sql`false`);
  }

  if (featured === 'true') conditions.push(eq(articles.featured, true));
  if (featured === 'false') conditions.push(eq(articles.featured, false));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClause =
    sort === 'title'
      ? order === 'asc'
        ? asc(articles.title)
        : desc(articles.title)
      : sort === 'updated'
        ? order === 'asc'
          ? asc(articles.updatedAt)
          : desc(articles.updatedAt)
        : sort === 'featured'
          ? order === 'asc'
            ? asc(articles.order)
            : desc(articles.order)
          : order === 'asc'
            ? asc(articles.publishedAt)
            : desc(articles.publishedAt);

  const rows = await db.select().from(articles).where(where).orderBy(orderClause, desc(articles.createdAt)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(where);

  const items = await Promise.all(rows.map((row) => toArticleListItem(row)));

  let featuredItem = null;
  const unfilteredPublic = !user && featured !== 'true' && !search && (!category || category === 'all') && offset === 0;
  if (unfilteredPublic) {
    const [featuredRow] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.status, 'published'), eq(articles.featured, true)))
      .orderBy(asc(articles.order), desc(articles.publishedAt))
      .limit(1);
    if (featuredRow) featuredItem = await toArticleListItem(featuredRow);
  }

  return c.json({ items, total, featured: featuredItem });
});

app.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const user = c.get('user');
  const previewToken = c.req.query('preview');
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (!article) return c.json({ error: 'Article not found.' }, 404);

  const previewOk = Boolean(
    previewToken &&
      article.previewToken &&
      safeEqualString(previewToken, article.previewToken),
  );
  if (article.status !== 'published' && !user && !previewOk) {
    return c.json({ error: 'Article not found.' }, 404);
  }

  const detail = await enrichArticle(article, { includeDrafts: Boolean(user || previewOk) });
  return c.json({ ...detail, preview: article.status !== 'published' });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) return c.json({ error: 'Article not found.' }, 404);
  if (article.status !== 'published' && !user) return c.json({ error: 'Article not found.' }, 404);

  if (user) {
    const detail = await enrichArticle(article, { includeDrafts: true });
    return c.json({ ...detail, previewToken: article.previewToken });
  }

  const detail = await enrichArticle(article, { includeDrafts: false });
  return c.json(detail);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = articleCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid article data.', issues: result.error.flatten() }, 400);

  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.title);
  if (!slug) return c.json({ error: 'A valid slug is required.' }, 400);
  const isUnique = await checkSlugUniqueness(articles, slug);
  if (!isUnique) return c.json({ error: 'An article with this slug already exists.' }, 409);

  const content = sanitizeArticleDocument(result.data.content ?? { blocks: [] });
  const publishedAt = result.data.publishedAt ? new Date(result.data.publishedAt) : null;

  const [article] = await db
    .insert(articles)
    .values({
      title: result.data.title,
      slug,
      excerpt: result.data.excerpt ?? null,
      content,
      heroMediaId: result.data.heroMediaId ?? null,
      categoryId: result.data.categoryId ?? null,
      tags: parseTags(result.data.tags),
      authorId: result.data.authorId ?? null,
      featured: result.data.featured ?? false,
      order: result.data.order ?? 0,
      status: 'draft',
      seoTitle: result.data.seoTitle ?? null,
      seoDescription: result.data.seoDescription ?? null,
      ogImageMediaId: result.data.ogImageMediaId ?? null,
      relatedProductIds: result.data.relatedProductIds ?? [],
      relatedIndustryIds: result.data.relatedIndustryIds ?? [],
      previewToken: newPreviewToken(),
      createdBy: user.id,
      updatedBy: user.id,
      publishedAt,
    })
    .returning();

  await logActivity({ actorId: user.id, action: 'created', entityType: 'article', entityId: article.id, entityName: article.title });
  return c.json(article, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = articleUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid article data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Article not found.' }, 404);

  const updateData: Record<string, unknown> = { updatedBy: user.id, updatedAt: new Date() };
  if (result.data.title !== undefined) updateData.title = result.data.title;
  if (result.data.excerpt !== undefined) updateData.excerpt = result.data.excerpt;
  if (result.data.heroMediaId !== undefined) updateData.heroMediaId = result.data.heroMediaId;
  if (result.data.categoryId !== undefined) updateData.categoryId = result.data.categoryId;
  if (result.data.tags !== undefined) updateData.tags = parseTags(result.data.tags);
  if (result.data.authorId !== undefined) updateData.authorId = result.data.authorId;
  if (result.data.featured !== undefined) updateData.featured = result.data.featured;
  if (result.data.order !== undefined) updateData.order = result.data.order;
  if (result.data.seoTitle !== undefined) updateData.seoTitle = result.data.seoTitle;
  if (result.data.seoDescription !== undefined) updateData.seoDescription = result.data.seoDescription;
  if (result.data.ogImageMediaId !== undefined) updateData.ogImageMediaId = result.data.ogImageMediaId;
  if (result.data.relatedProductIds !== undefined) updateData.relatedProductIds = result.data.relatedProductIds;
  if (result.data.relatedIndustryIds !== undefined) updateData.relatedIndustryIds = result.data.relatedIndustryIds;
  if (result.data.content !== undefined) updateData.content = sanitizeArticleDocument(result.data.content);
  if (result.data.publishedAt !== undefined) {
    updateData.publishedAt = result.data.publishedAt ? new Date(result.data.publishedAt) : null;
  }
  if (result.data.slug) {
    const newSlug = slugify(result.data.slug);
    const isUnique = await checkSlugUniqueness(articles, newSlug, id);
    if (!isUnique) return c.json({ error: 'An article with this slug already exists.' }, 409);
    updateData.slug = newSlug;
  }
  if (!existing.previewToken) updateData.previewToken = newPreviewToken();

  const [updated] = await db.update(articles).set(updateData).where(eq(articles.id, id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'article', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const validation = await validateArticlePublish(id);
  if (!validation.valid) return c.json({ error: 'Cannot publish: ' + validation.errors.join(' ') }, 400);

  const [existing] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Article not found.' }, 404);

  const [updated] = await db
    .update(articles)
    .set({
      status: 'published',
      publishedBy: user.id,
      publishedAt: existing.publishedAt ?? new Date(),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))
    .returning();

  await logActivity({ actorId: user.id, action: 'published', entityType: 'article', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db
    .update(articles)
    .set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Article not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'unpublished', entityType: 'article', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/archive', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db
    .update(articles)
    .set({ status: 'archived', updatedBy: user.id, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Article not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'archived', entityType: 'article', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(articles).where(eq(articles.id, id)).returning();
  if (!deleted) return c.json({ error: 'Article not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'article', entityId: deleted.id, entityName: deleted.title });
  return c.json({ ok: true });
});

export default app;
