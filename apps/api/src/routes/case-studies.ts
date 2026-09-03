import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { caseStudies } from '@novaflow/database';
import { eq, ilike, asc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, validateCaseStudyPublish, slugify } from '../lib/validation';
import { enrichCaseStudy, enrichCaseStudyCards, normalizeGallery } from '../lib/case-study-detail';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const galleryItemSchema = z.union([
  z.string().uuid(),
  z.object({
    mediaId: z.string().uuid(),
    caption: z.string().optional().nullable(),
    treatment: z.enum(['full', 'detail', 'pair']).optional(),
    order: z.number().int().optional(),
  }),
]);

const caseStudyCreateSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  client: z.string().max(255).optional().nullable(),
  industry: z.string().max(255).optional().nullable(),
  summary: z.string().optional().nullable(),
  challenge: z.string().optional().nullable(),
  approach: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  heroMediaId: z.string().uuid().optional().nullable(),
  gallery: z.array(galleryItemSchema).default([]),
  products: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  testimonial: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  order: z.number().int().default(0),
  seoId: z.string().uuid().optional().nullable(),
});

const caseStudyUpdateSchema = caseStudyCreateSchema.partial();

function galleryPayload(gallery: z.infer<typeof galleryItemSchema>[] | undefined) {
  return normalizeGallery(gallery ?? []);
}

app.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const featured = c.req.query('featured');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (!user) {
    conditions.push(eq(caseStudies.status, 'published'));
  } else if (status && status !== 'all') {
    conditions.push(eq(caseStudies.status, status as 'draft' | 'published' | 'archived'));
  }
  if (search) conditions.push(ilike(caseStudies.title, `%${search}%`));
  if (featured === 'true') conditions.push(eq(caseStudies.featured, true));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await db.select().from(caseStudies).where(where).orderBy(asc(caseStudies.order)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(caseStudies).where(where);

  if (user) {
    return c.json({ items, total });
  }

  const cards = await enrichCaseStudyCards(items);
  return c.json({ items: cards, total });
});

app.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const user = c.get('user');
  const [item] = await db.select().from(caseStudies).where(eq(caseStudies.slug, slug)).limit(1);
  if (!item) return c.json({ error: 'Case study not found.' }, 404);
  if (item.status !== 'published' && !user) return c.json({ error: 'Case study not found.' }, 404);
  return c.json(await enrichCaseStudy(item));
});

app.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  const [item] = await db.select().from(caseStudies).where(eq(caseStudies.id, id)).limit(1);
  if (!item) return c.json({ error: 'Case study not found.' }, 404);
  if (item.status !== 'published' && !user) return c.json({ error: 'Case study not found.' }, 404);
  return c.json(item);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = caseStudyCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid case study data.', issues: result.error.flatten() }, 400);

  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.title);
  const isUnique = await checkSlugUniqueness(caseStudies, slug);
  if (!isUnique) return c.json({ error: 'A case study with this slug already exists.' }, 409);

  const createData = { ...result.data };
  delete (createData as { status?: unknown }).status;
  const [item] = await db.insert(caseStudies).values({
    ...createData,
    slug,
    status: 'draft',
    gallery: galleryPayload(result.data.gallery),
    products: result.data.products,
    capabilities: result.data.capabilities,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'case_study', entityId: item.id, entityName: item.title });
  return c.json(item, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = caseStudyUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid case study data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(caseStudies).where(eq(caseStudies.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Case study not found.' }, 404);

  const patchData = { ...result.data };
  delete (patchData as { status?: unknown }).status;
  const updateData: Record<string, unknown> = { ...patchData, updatedBy: user.id, updatedAt: new Date() };
  if (result.data.gallery) {
    updateData.gallery = galleryPayload(result.data.gallery);
  }
  if (result.data.slug) {
    const newSlug = slugify(result.data.slug);
    const isUnique = await checkSlugUniqueness(caseStudies, newSlug, id);
    if (!isUnique) return c.json({ error: 'A case study with this slug already exists.' }, 409);
    updateData.slug = newSlug;
  }

  const [updated] = await db.update(caseStudies).set(updateData).where(eq(caseStudies.id, id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'case_study', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const validation = await validateCaseStudyPublish(id);
  if (!validation.valid) return c.json({ error: 'Cannot publish: ' + validation.errors.join(' ') }, 400);

  const [updated] = await db.update(caseStudies).set({ status: 'published', publishedBy: user.id, publishedAt: new Date(), updatedBy: user.id, updatedAt: new Date() }).where(eq(caseStudies.id, id)).returning();
  if (!updated) return c.json({ error: 'Case study not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'published', entityType: 'case_study', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(caseStudies).set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() }).where(eq(caseStudies.id, id)).returning();
  if (!updated) return c.json({ error: 'Case study not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'unpublished', entityType: 'case_study', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.post('/:id/archive', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(caseStudies).set({ status: 'archived', updatedBy: user.id, updatedAt: new Date() }).where(eq(caseStudies.id, id)).returning();
  if (!updated) return c.json({ error: 'Case study not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'archived', entityType: 'case_study', entityId: updated.id, entityName: updated.title });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(caseStudies).where(eq(caseStudies.id, id)).returning();
  if (!deleted) return c.json({ error: 'Case study not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'case_study', entityId: deleted.id, entityName: deleted.title });
  return c.json({ ok: true });
});

export default app;
