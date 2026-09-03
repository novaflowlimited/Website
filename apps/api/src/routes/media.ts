import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { media } from '@novaflow/database';
import { eq, ilike, asc, desc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { getMediaReferences } from '../lib/validation';
import { r2Client, r2Config, getMediaUrl } from '../lib/r2';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const mediaUpdateSchema = z.object({
  title: z.string().max(255).optional(),
  altText: z.string().optional().nullable(),
  decorative: z.boolean().optional(),
  focalX: z.number().int().min(0).max(100).optional(),
  focalY: z.number().int().min(0).max(100).optional(),
});

app.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);

  const search = c.req.query('search');
  const type = c.req.query('type');
  const sort = c.req.query('sort') ?? 'newest';
  const limit = Math.min(Number(c.req.query('limit') ?? 24), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (search) conditions.push(ilike(media.filename, `%${search}%`));
  if (type && type !== 'all') conditions.push(eq(media.type, type));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderClause = sort === 'oldest' ? asc(media.createdAt) : desc(media.createdAt);
  const items = await db.select().from(media).where(where).orderBy(orderClause).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(media).where(where);
  return c.json({ items, total });
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id')!;
  const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return c.json({ error: 'Media not found.' }, 404);

  const references = await getMediaReferences(id);
  return c.json({ ...item, references });
});

app.get('/:id/references', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id')!;
  const references = await getMediaReferences(id);
  return c.json({ references });
});

app.post('/upload', requireAuth, async (c) => {
  const user = c.get('user')!;
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file provided.' }, 400);

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json({ error: `File type ${file.type} is not allowed. Supported: PNG, JPEG, WebP, SVG, GIF, AVIF.` }, 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File size exceeds the 5MB limit.' }, 400);
  }

  const altText = (formData.get('altText') as string | null) ?? '';
  const title = (formData.get('title') as string | null) ?? file.name;
  const type = (formData.get('type') as string | null) ?? 'image';
  const decorative = formData.get('decorative') === 'true';

  const ext = file.name.split('.').pop() ?? 'png';
  const r2Key = `media/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let r2Url: string;
  if (r2Client && r2Config.isConfigured) {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    r2Url = getMediaUrl(r2Key);
  } else {
    // Dev fallback: store locally in public/media
    r2Url = `/${r2Key}`;
  }

  const [item] = await db.insert(media).values({
    filename: file.name,
    title,
    altText: decorative ? '' : altText,
    decorative,
    type,
    mimeType: file.type,
    sizeBytes: file.size,
    r2Key,
    r2Url,
    createdBy: user.id,
  }).returning();

  await logActivity({ actorId: user.id, action: 'uploaded', entityType: 'media', entityId: item.id, entityName: item.filename });
  return c.json(item, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = mediaUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid media data.', issues: result.error.flatten() }, 400);

  const [updated] = await db.update(media).set({ ...result.data, updatedAt: new Date() }).where(eq(media.id, id)).returning();
  if (!updated) return c.json({ error: 'Media not found.' }, 404);
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'media', entityId: updated.id, entityName: updated.filename });
  return c.json(updated);
});

app.post('/:id/replace', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file provided.' }, 400);
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return c.json({ error: `File type ${file.type} is not allowed.` }, 400);
  if (file.size > MAX_FILE_SIZE) return c.json({ error: 'File size exceeds the 5MB limit.' }, 400);

  const [existing] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Media not found.' }, 404);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (r2Client && r2Config.isConfigured) {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: existing.r2Key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
  }

  const [updated] = await db.update(media).set({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    updatedAt: new Date(),
  }).where(eq(media.id, id)).returning();

  await logActivity({ actorId: user.id, action: 'updated', entityType: 'media', entityId: updated.id, entityName: updated.filename });
  return c.json(updated);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;

  const references = await getMediaReferences(id);
  if (references.length > 0) {
    const names = references.map((r) => r.entityName).join(', ');
    return c.json({
      error: `This image is used by ${references.length} item(s): ${names}. Remove the references before deleting.`,
      references,
    }, 409);
  }

  const [deleted] = await db.delete(media).where(eq(media.id, id)).returning();
  if (!deleted) return c.json({ error: 'Media not found.' }, 404);

  if (r2Client && r2Config.isConfigured) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Config.bucket, Key: deleted.r2Key }));
    } catch (error) {
      console.error('Failed to delete from R2:', error);
    }
  }

  await logActivity({ actorId: user.id, action: 'deleted', entityType: 'media', entityId: deleted.id, entityName: deleted.filename });
  return c.json({ ok: true });
});

export default app;
