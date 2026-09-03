import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { seoMetadata } from '@novaflow/database';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const seoCreateSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid().optional().nullable(),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  ogTitle: z.string().max(255).optional(),
  ogDescription: z.string().optional(),
  ogImageMediaId: z.string().uuid().optional().nullable(),
  canonicalUrl: z.string().optional(),
  twitterCard: z.string().max(50).optional(),
});

const seoUpdateSchema = seoCreateSchema.partial();

app.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const items = await db.select().from(seoMetadata).orderBy(asc(seoMetadata.entityType));
  return c.json({ items });
});

app.get('/default', async (c) => {
  const [item] = await db.select().from(seoMetadata).where(eq(seoMetadata.entityType, 'default')).limit(1);
  return c.json(item ?? null);
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id')!;
  const [item] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, id)).limit(1);
  if (!item) return c.json({ error: 'SEO entry not found.' }, 404);
  return c.json(item);
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = seoCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid SEO data.', issues: result.error.flatten() }, 400);

  const [item] = await db.insert(seoMetadata).values(result.data).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'seo', entityId: item.id, entityName: `SEO: ${item.entityType}` });
  return c.json(item, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = seoUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid SEO data.', issues: result.error.flatten() }, 400);

  const [updated] = await db.update(seoMetadata).set({ ...result.data, updatedAt: new Date() }).where(eq(seoMetadata.id, id)).returning();
  if (!updated) return c.json({ error: 'SEO entry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'seo', entityId: updated.id, entityName: `SEO: ${updated.entityType}` });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(seoMetadata).where(eq(seoMetadata.id, id)).returning();
  if (!deleted) return c.json({ error: 'SEO entry not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'seo', entityId: deleted.id, entityName: `SEO: ${deleted.entityType}` });
  return c.json({ ok: true });
});

export default app;
