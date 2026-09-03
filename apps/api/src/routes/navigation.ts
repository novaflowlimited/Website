import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { navigationItems } from '@novaflow/database';
import { eq, asc, and } from 'drizzle-orm';
import { requireRole } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const navCreateSchema = z.object({
  label: z.string().min(1).max(255),
  url: z.string().min(1).max(500),
  order: z.number().int().default(0),
  visibility: z.enum(['visible', 'hidden']).default('visible'),
  location: z.enum(['main', 'footer']).default('main'),
});

const navUpdateSchema = navCreateSchema.partial();

app.get('/', async (c) => {
  const user = c.get('user');
  const location = c.req.query('location');

  const conditions = [];
  if (!user) {
    conditions.push(eq(navigationItems.visibility, 'visible'));
  }
  if (location && (location === 'main' || location === 'footer')) {
    conditions.push(eq(navigationItems.location, location));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await db.select().from(navigationItems).where(where).orderBy(asc(navigationItems.order));
  return c.json({ items });
});

app.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = navCreateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid navigation item.', issues: result.error.flatten() }, 400);

  const [item] = await db.insert(navigationItems).values({ ...result.data, createdBy: user.id, updatedBy: user.id }).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'navigation', entityId: item.id, entityName: item.label });
  return c.json(item, 201);
});

app.patch('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = navUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid navigation item.', issues: result.error.flatten() }, 400);

  const [updated] = await db.update(navigationItems).set({ ...result.data, updatedBy: user.id, updatedAt: new Date() }).where(eq(navigationItems.id, id)).returning();
  if (!updated) return c.json({ error: 'Navigation item not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'navigation', entityId: updated.id, entityName: updated.label });
  return c.json(updated);
});

app.delete('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [deleted] = await db.delete(navigationItems).where(eq(navigationItems.id, id)).returning();
  if (!deleted) return c.json({ error: 'Navigation item not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'navigation', entityId: deleted.id, entityName: deleted.label });
  return c.json({ ok: true });
});

export default app;
