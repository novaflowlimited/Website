import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { articleCategories, articleAuthors, articles } from '@novaflow/database';
import { eq, asc, sql } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkSlugUniqueness, slugify } from '../lib/validation';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  order: z.number().int().default(0),
});

const authorSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  role: z.string().max(255).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  photoMediaId: z.string().uuid().optional().nullable(),
});

app.get('/article-categories', async (c) => {
  const items = await db.select().from(articleCategories).orderBy(asc(articleCategories.order), asc(articleCategories.name));
  return c.json({ items });
});

app.post('/article-categories', requireAuth, async (c) => {
  const user = c.get('user')!;
  const result = categorySchema.safeParse(await c.req.json());
  if (!result.success) return c.json({ error: 'Invalid category data.', issues: result.error.flatten() }, 400);
  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.name);
  const unique = await checkSlugUniqueness(articleCategories, slug);
  if (!unique) return c.json({ error: 'A category with this slug already exists.' }, 409);
  const [item] = await db.insert(articleCategories).values({ name: result.data.name, slug, order: result.data.order ?? 0 }).returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'article_category', entityId: item.id, entityName: item.name });
  return c.json(item, 201);
});

app.patch('/article-categories/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const result = categorySchema.partial().safeParse(await c.req.json());
  if (!result.success) return c.json({ error: 'Invalid category data.', issues: result.error.flatten() }, 400);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.order !== undefined) updateData.order = result.data.order;
  if (result.data.slug) {
    const slug = slugify(result.data.slug);
    const unique = await checkSlugUniqueness(articleCategories, slug, id);
    if (!unique) return c.json({ error: 'A category with this slug already exists.' }, 409);
    updateData.slug = slug;
  }
  const [updated] = await db.update(articleCategories).set(updateData).where(eq(articleCategories.id, id)).returning();
  if (!updated) return c.json({ error: 'Category not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'article_category', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.delete('/article-categories/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(eq(articles.categoryId, id));
  if (count > 0) return c.json({ error: 'Cannot delete a category that is still used by articles.' }, 409);
  const [deleted] = await db.delete(articleCategories).where(eq(articleCategories.id, id)).returning();
  if (!deleted) return c.json({ error: 'Category not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'article_category', entityId: deleted.id, entityName: deleted.name });
  return c.json({ ok: true });
});

app.get('/article-authors', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const items = await db.select().from(articleAuthors).orderBy(asc(articleAuthors.name));
  return c.json({ items });
});

app.post('/article-authors', requireAuth, async (c) => {
  const user = c.get('user')!;
  const result = authorSchema.safeParse(await c.req.json());
  if (!result.success) return c.json({ error: 'Invalid author data.', issues: result.error.flatten() }, 400);
  const slug = result.data.slug ? slugify(result.data.slug) : slugify(result.data.name);
  const unique = await checkSlugUniqueness(articleAuthors, slug);
  if (!unique) return c.json({ error: 'An author with this slug already exists.' }, 409);
  const [item] = await db
    .insert(articleAuthors)
    .values({
      name: result.data.name,
      slug,
      role: result.data.role ?? null,
      bio: result.data.bio ?? null,
      photoMediaId: result.data.photoMediaId ?? null,
    })
    .returning();
  await logActivity({ actorId: user.id, action: 'created', entityType: 'article_author', entityId: item.id, entityName: item.name });
  return c.json(item, 201);
});

app.patch('/article-authors/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const result = authorSchema.partial().safeParse(await c.req.json());
  if (!result.success) return c.json({ error: 'Invalid author data.', issues: result.error.flatten() }, 400);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.role !== undefined) updateData.role = result.data.role;
  if (result.data.bio !== undefined) updateData.bio = result.data.bio;
  if (result.data.photoMediaId !== undefined) updateData.photoMediaId = result.data.photoMediaId;
  if (result.data.slug) {
    const slug = slugify(result.data.slug);
    const unique = await checkSlugUniqueness(articleAuthors, slug, id);
    if (!unique) return c.json({ error: 'An author with this slug already exists.' }, 409);
    updateData.slug = slug;
  }
  const [updated] = await db.update(articleAuthors).set(updateData).where(eq(articleAuthors.id, id)).returning();
  if (!updated) return c.json({ error: 'Author not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'article_author', entityId: updated.id, entityName: updated.name });
  return c.json(updated);
});

app.delete('/article-authors/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  await db.update(articles).set({ authorId: null, updatedAt: new Date() }).where(eq(articles.authorId, id));
  const [deleted] = await db.delete(articleAuthors).where(eq(articleAuthors.id, id)).returning();
  if (!deleted) return c.json({ error: 'Author not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'article_author', entityId: deleted.id, entityName: deleted.name });
  return c.json({ ok: true });
});

export default app;
