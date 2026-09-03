import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { siteSettings } from '@novaflow/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const settingsUpdateSchema = z.object({
  companyName: z.string().max(255).optional(),
  logoMediaId: z.string().uuid().optional().nullable(),
  faviconMediaId: z.string().uuid().optional().nullable(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(100).optional(),
  address: z.string().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  defaultSeoId: z.string().uuid().optional().nullable(),
});

app.get('/', async (c) => {
  const [settings] = await db.select().from(siteSettings).limit(1);
  if (!settings) return c.json({ error: 'Site settings not configured.' }, 404);
  const user = c.get('user');
  if (user?.role === 'admin') return c.json(settings);
  return c.json({
    companyName: settings.companyName,
    logoMediaId: settings.logoMediaId,
    faviconMediaId: settings.faviconMediaId,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    socialLinks: settings.socialLinks,
    defaultSeoId: settings.defaultSeoId,
  });
});

app.patch('/', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = settingsUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid settings data.', issues: result.error.flatten() }, 400);

  const [existing] = await db.select().from(siteSettings).limit(1);
  if (!existing) {
    const [created] = await db.insert(siteSettings).values({
      ...result.data,
      companyName: result.data.companyName ?? 'Novaflow',
      contactEmail: result.data.contactEmail ?? 'hello@novaflow.co',
      updatedBy: user.id,
    }).returning();
    await logActivity({ actorId: user.id, action: 'updated', entityType: 'site_settings', entityId: created.id, entityName: 'Site Settings' });
    return c.json(created);
  }

  const [updated] = await db.update(siteSettings).set({ ...result.data, updatedBy: user.id, updatedAt: new Date() }).where(eq(siteSettings.id, existing.id)).returning();
  await logActivity({ actorId: user.id, action: 'updated', entityType: 'site_settings', entityId: updated.id, entityName: 'Site Settings' });
  return c.json(updated);
});

export default app;
