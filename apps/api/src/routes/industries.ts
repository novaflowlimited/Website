import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { industries } from '@novaflow/database';
import { eq, ilike, asc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, validateIndustryPublish, slugify } from '../lib/validation';
import { enrichIndustry } from '../lib/industry-detail';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const industryCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  shortDescription: z.string().optional(),
  businessContext: z.string().optional(),
  challengeHeadline: z.string().optional(),
  challenge: z.string().optional(),
  systemDescription: z.string().optional(),
  systemItems: z.array(z.string()).default([]),
  visualMediaId: z.string().uuid().optional().nullable(),
  mobileVisualMediaId: z.string().uuid().optional().nullable(),
  relatedProducts: z.array(z.string()).default([]),
  relatedCapabilities: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  order: z.number().int().default(0),
  seoId: z.string().uuid().optional().nullable(),
});

const industryUpdateSchema = industryCreateSchema.partial();

app.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (!user) {
    conditions.push(eq(industries.status, 'published'));
  } else if (status && status !== 'all') {
    conditions.push(eq(industries.status, status as 'draft' | 'published' | 'archived'));
  }
  if (search) conditions.push(ilike(industries.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await db.select().from(industries).where(where).orderBy(asc(industries.order)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(industries).where(where);
  return c.json({ items, total });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  const [industry] = await db.select().from(industries).where(eq(industries.id, id)).limit(1);
  if (!industry) return c.json({ error: 'Industry not found.' }, 404);
  if (industry.status !== 'published' && !user) return c.json({ error: 'Industry not found.' }, 404);
  return c.json(industry);
});

app.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const user = c.get('user');
  const [industry] = await db.select().from(industries).where(eq(industries.slug, slug)).limit(1);
  if (!industry) return c.json({ error: 'Industry not found.' }, 404);
  if (industry.status !== 'published' && !user) return c.json({ error: 'Industry not found.' }, 404);
  const detail = await enrichIndustry(industry);
  return c.json(detail);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = industryCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid industry data.', issues: result.error.flatten() }, 400);

  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.name);
  const isUnique = await checkSlugUniqueness(industries, slug);
  if (!isUnique) return c.json({ error: 'An industry with this slug already exists.' }, 409);

  const createData = { ...result.data };
  delete (createData as { status?: unknown }).status;
  const [industry] = await db.insert(industries).values({
    ...createData, slug, status: 'draft', createdBy: user.id, updatedBy: user.id,
  }).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'industry', entityId: industry.id, entityName: industry.name });
  return c.json(industry, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = industryUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid industry data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(industries).where(eq(industries.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Industry not found.' }, 404);

  const patchData = { ...result.data };
  delete (patchData as { status?: unknown }).status;
  const updateData: Record<string, unknown> = { ...patchData, updatedBy: user.id, updatedAt: new Date() };
  if (result.data.slug) {
    const newSlug = slugify(result.data.slug);
    const isUnique = await checkSlugUniqueness(industries, newSlug, id);
    if (!isUnique) return c.json({ error: 'An industry with this slug already exists.' }, 409);
    updateData.slug = newSlug;
  }

  const [updated] = await db.update(industries).set(updateData).where(eq(industries.id, id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'industry', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;

  const validation = await validateIndustryPublish(id);
  if (!validation.valid) return c.json({ error: 'Cannot publish: ' + validation.errors.join(' ') }, 400);

  const [updated] = await db.update(industries).set({ status: 'published', publishedBy: user.id, publishedAt: new Date(), updatedBy: user.id, updatedAt: new Date() }).where(eq(industries.id, id)).returning();
  if (!updated) return c.json({ error: 'Industry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'published', entityType: 'industry', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(industries).set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() }).where(eq(industries.id, id)).returning();
  if (!updated) return c.json({ error: 'Industry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'unpublished', entityType: 'industry', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/archive', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(industries).set({ status: 'archived', updatedBy: user.id, updatedAt: new Date() }).where(eq(industries.id, id)).returning();
  if (!updated) return c.json({ error: 'Industry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'archived', entityType: 'industry', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(industries).where(eq(industries.id, id)).returning();
  if (!deleted) return c.json({ error: 'Industry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'industry', entityId: deleted.id, entityName: deleted.name });
  return c.json({ ok: true });
});

export default app;
