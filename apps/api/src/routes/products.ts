import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { products } from '@novaflow/database';
import { eq, ilike, desc, asc, sql, and, or } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, validateProductPublish, slugify } from '../lib/validation';
import { enrichProduct } from '../lib/product-detail';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const screenshotSchema = z.object({
  mediaId: z.string().uuid(),
  title: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  order: z.number().int().default(0),
});

const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  category: z.string().max(255).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  features: z.array(z.string()).default([]),
  workflow: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  logoMediaId: z.string().uuid().optional().nullable(),
  heroMediaId: z.string().uuid().optional().nullable(),
  screenshots: z.array(screenshotSchema).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  order: z.number().int().default(0),
  seoId: z.string().uuid().optional().nullable(),
});

const productUpdateSchema = productCreateSchema.partial();

app.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const category = c.req.query('category');
  const sort = c.req.query('sort') ?? 'order';
  const order = c.req.query('order') ?? 'asc';
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (!user) {
    conditions.push(eq(products.status, 'published'));
  } else if (status && status !== 'all') {
    conditions.push(eq(products.status, status as 'draft' | 'published' | 'archived'));
  }
  if (search) {
    conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.category, `%${search}%`))!);
  }
  if (category && category !== 'all') {
    conditions.push(eq(products.category, category));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderClause =
    sort === 'updated'
      ? order === 'desc'
        ? desc(products.updatedAt)
        : asc(products.updatedAt)
      : order === 'desc'
        ? desc(products.order)
        : asc(products.order);

  const items = await db.select().from(products).where(where).orderBy(orderClause).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);

  return c.json({ items, total });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return c.json({ error: 'Product not found.' }, 404);
  if (product.status !== 'published' && !user) return c.json({ error: 'Product not found.' }, 404);
  return c.json(product);
});

app.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const user = c.get('user');
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return c.json({ error: 'Product not found.' }, 404);
  if (product.status !== 'published' && !user) return c.json({ error: 'Product not found.' }, 404);
  const detail = await enrichProduct(product);
  return c.json(detail);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = productCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid product data.', issues: result.error.flatten() }, 400);

  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.name);
  const isUnique = await checkSlugUniqueness(products, slug);
  if (!isUnique) return c.json({ error: 'A product with this slug already exists.' }, 409);

  const createData = { ...result.data };
  delete (createData as { status?: unknown }).status;
  const [product] = await db.insert(products).values({
    ...createData,
    slug,
    status: 'draft',
    capabilities: result.data.capabilities,
    industries: result.data.industries,
    screenshots: result.data.screenshots,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();

  await logActivity({ actorId: user.id, action: 'created', entityType: 'product', entityId: product.id, entityName: product.name });
  return c.json(product, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = productUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid product data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Product not found.' }, 404);

  const patchData = { ...result.data };
  delete (patchData as { status?: unknown }).status;
  const updateData: Record<string, unknown> = { ...patchData, updatedBy: user.id, updatedAt: new Date() };
  if (result.data.slug) {
    const newSlug = slugify(result.data.slug);
    const isUnique = await checkSlugUniqueness(products, newSlug, id);
    if (!isUnique) return c.json({ error: 'A product with this slug already exists.' }, 409);
    updateData.slug = newSlug;
  }

  const [updated] = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'product', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;

  const validation = await validateProductPublish(id);
  if (!validation.valid) return c.json({ error: 'Cannot publish: ' + validation.errors.join(' ') }, 400);

  const [updated] = await db.update(products).set({ status: 'published', publishedBy: user.id, publishedAt: new Date(), updatedBy: user.id, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (!updated) return c.json({ error: 'Product not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'published', entityType: 'product', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(products).set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (!updated) return c.json({ error: 'Product not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'unpublished', entityType: 'product', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/archive', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(products).set({ status: 'archived', updatedBy: user.id, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (!updated) return c.json({ error: 'Product not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'archived', entityType: 'product', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
  if (!deleted) return c.json({ error: 'Product not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'product', entityId: deleted.id, entityName: deleted.name });
  return c.json({ ok: true });
});

export default app;
