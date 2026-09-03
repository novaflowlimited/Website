import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@novaflow/database';
import { homepage, type HomepageContent } from '@novaflow/database';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { enrichHomepageContent, summarizeHomepageChanges } from '../lib/homepage-detail';
import { validateHomepagePublish } from '../lib/homepage-validation';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const sectionVisibility = z.object({
  visible: z.boolean(),
  eyebrow: z.string().optional(),
});

const heroSchema = sectionVisibility.extend({
  headlineLine1: z.string(),
  headlineLine2: z.string(),
  supportingText: z.string(),
  primaryCtaLabel: z.string(),
  primaryCtaUrl: z.string(),
  heroVisualMediaId: z.string().uuid().nullable().optional(),
  mobileHeroVisualMediaId: z.string().uuid().nullable().optional(),
});

const whatWeBuildSchema = sectionVisibility.extend({
  headline: z.string(),
  capabilityIds: z.array(z.string()).max(8),
  desktopVisualMediaId: z.string().uuid().nullable().optional(),
  mobileVisualMediaId: z.string().uuid().nullable().optional(),
});

const productsSchema = sectionVisibility.extend({
  headline: z.string(),
  featuredProductIds: z.array(z.string()).max(4),
});

const forBusinessSchema = sectionVisibility.extend({
  headline: z.string(),
  featuredIndustryIds: z.array(z.string()).max(6),
});

const workSchema = sectionVisibility.extend({
  headline: z.string(),
  featuredCaseStudyIds: z.array(z.string()).max(4),
});

const aboutSchema = sectionVisibility.extend({
  headlineLines: z.array(z.string()).max(6),
  shortDescription: z.string(),
  metaLine: z.string(),
  visualMediaId: z.string().uuid().nullable().optional(),
  linkLabel: z.string(),
  linkUrl: z.string(),
});

const contactSchema = sectionVisibility.extend({
  headline: z.string(),
  supportingText: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
});

const homepageContentSchema = z.object({
  hero: heroSchema,
  whatWeBuild: whatWeBuildSchema,
  products: productsSchema,
  forBusiness: forBusinessSchema,
  work: workSchema,
  about: aboutSchema,
  contact: contactSchema,
});

async function getHomepageRow() {
  const [row] = await db.select().from(homepage).limit(1);
  return row ?? null;
}

app.get('/', async (c) => {
  const user = c.get('user');
  const row = await getHomepageRow();
  if (!row) return c.json({ error: 'Homepage not configured.' }, 404);

  const content = user
    ? row.draftContent
    : row.publishedContent;

  if (!user) {
    if (!content || row.status !== 'published') {
      return c.json({ error: 'Homepage not published.' }, 404);
    }
  }

  if (!content) {
    return c.json({ error: 'Homepage not configured.' }, 404);
  }

  const enriched = await enrichHomepageContent(content, {
    status: row.status,
    seoId: row.seoId,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });

  return c.json(enriched);
});

app.get('/editor', requireAuth, async (c) => {
  const row = await getHomepageRow();
  if (!row) return c.json({ error: 'Homepage not configured.' }, 404);

  const draft = await enrichHomepageContent(row.draftContent, {
    status: row.status,
    seoId: row.seoId,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });

  const changedSections = summarizeHomepageChanges(row.draftContent, row.publishedContent);
  const hasUnpublishedChanges = changedSections.length > 0;

  return c.json({
    id: row.id,
    status: row.status,
    draftContent: row.draftContent,
    publishedContent: row.publishedContent,
    draft: draft,
    hasUnpublishedChanges,
    changedSections,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });
});

app.patch('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const result = homepageContentSchema.safeParse(body.draftContent ?? body);
  if (!result.success) {
    return c.json({ error: 'Invalid homepage content.', issues: result.error.flatten() }, 400);
  }

  let row = await getHomepageRow();
  if (!row) {
    const [created] = await db
      .insert(homepage)
      .values({
        draftContent: result.data as HomepageContent,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    row = created;
  } else {
    const [updated] = await db
      .update(homepage)
      .set({
        draftContent: result.data as HomepageContent,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(homepage.id, row.id))
      .returning();
    row = updated;
  }

  await logActivity({
    actorId: user.id,
    action: 'updated',
    entityType: 'homepage',
    entityId: row.id,
    entityName: 'Homepage',
  });

  const changedSections = summarizeHomepageChanges(row.draftContent, row.publishedContent);
  return c.json({
    id: row.id,
    status: row.status,
    draftContent: row.draftContent,
    hasUnpublishedChanges: changedSections.length > 0,
    changedSections,
  });
});

app.post('/publish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const row = await getHomepageRow();
  if (!row) return c.json({ error: 'Homepage not configured.' }, 404);

  const validation = validateHomepagePublish(row.draftContent);
  if (!validation.valid) {
    return c.json({ error: 'Cannot publish: ' + validation.errors.join(' ') }, 400);
  }

  const [updated] = await db
    .update(homepage)
    .set({
      publishedContent: row.draftContent,
      status: 'published',
      publishedBy: user.id,
      publishedAt: new Date(),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(homepage.id, row.id))
    .returning();

  await logActivity({
    actorId: user.id,
    action: 'published',
    entityType: 'homepage',
    entityId: updated.id,
    entityName: 'Homepage',
  });

  const enriched = await enrichHomepageContent(updated.publishedContent!, {
    status: updated.status,
    seoId: updated.seoId,
    updatedAt: updated.updatedAt,
    publishedAt: updated.publishedAt,
  });

  return c.json(enriched);
});

app.post('/unpublish', requireAuth, async (c) => {
  const user = c.get('user')!;
  const row = await getHomepageRow();
  if (!row) return c.json({ error: 'Homepage not configured.' }, 404);

  const [updated] = await db
    .update(homepage)
    .set({ status: 'draft', updatedBy: user.id, updatedAt: new Date() })
    .where(eq(homepage.id, row.id))
    .returning();

  await logActivity({
    actorId: user.id,
    action: 'unpublished',
    entityType: 'homepage',
    entityId: updated.id,
    entityName: 'Homepage',
  });

  return c.json({ status: updated.status });
});

export default app;
