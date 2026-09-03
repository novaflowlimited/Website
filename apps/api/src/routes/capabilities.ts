import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { capabilities } from '@novaflow/database';
import { eq, ilike, asc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, slugify } from '../lib/validation';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const capabilityCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  shortDescription: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  order: z.number().int().default(0),
});

const capabilityUpdateSchema = capabilityCreateSchema.partial();

app.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (!user) {
    conditions.push(eq(capabilities.status, 'published'));
  } else if (status && status !== 'all') {
    conditions.push(eq(capabilities.status, status as 'draft' | 'published' | 'archived'));
  }
  if (search) conditions.push(ilike(capabilities.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await db.select().from(capabilities).where(where).orderBy(asc(capabilities.order)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(capabilities).where(where);
  return c.json({ items, total });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  const [capability] = await db.select().from(capabilities).where(eq(capabilities.id, id)).limit(1);
  if (!capability) return c.json({ error: 'Capability not found.' }, 404);
  if (capability.status !== 'published' && !user) return c.json({ error: 'Capability not found.' }, 404);
  return c.json(capability);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = capabilityCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid capability data.', issues: result.error.flatten() }, 400);

  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.name);
  const isUnique = await checkSlugUniqueness(capabilities, slug);
  if (!isUnique) return c.json({ error: 'A capability with this slug already exists.' }, 409);

  const createData = { ...result.data };
  delete (createData as { status?: unknown }).status;
  const [capability] = await db.insert(capabilities).values({
    ...createData,
    slug,
    status: 'draft',
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'capability', entityId: capability.id, entityName: capability.name });
  return c.json(capability, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = capabilityUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid capability data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(capabilities).where(eq(capabilities.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Capability not found.' }, 404);

  const patchData = { ...result.data };
  delete (patchData as { status?: unknown }).status;
  const updateData: Record<string, unknown> = { ...patchData, updatedBy: user.id, updatedAt: new Date() };
  if (result.data.slug) {
    const newSlug = slugify(result.data.slug);
    const isUnique = await checkSlugUniqueness(capabilities, newSlug, id);
    if (!isUnique) return c.json({ error: 'A capability with this slug already exists.' }, 409);
    updateData.slug = newSlug;
  }

  const [updated] = await db.update(capabilities).set(updateData).where(eq(capabilities.id, id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'capability', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(capabilities).set({ status: 'published', updatedBy: user.id, updatedAt: new Date() }).where(eq(capabilities.id, id)).returning();
  if (!updated) return c.json({ error: 'Capability not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'published', entityType: 'capability', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.post('/:id/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [updated] = await db.update(capabilities).set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() }).where(eq(capabilities.id, id)).returning();
  if (!updated) return c.json({ error: 'Capability not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'unpublished', entityType: 'capability', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(capabilities).where(eq(capabilities.id, id)).returning();
  if (!deleted) return c.json({ error: 'Capability not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'capability', entityId: deleted.id, entityName: deleted.name });
  return c.json({ ok: true });
});

export default app;
