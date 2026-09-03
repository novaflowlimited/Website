import { Hono } from 'hono';
import { db } from '@novaflow/database';
import { products, industries, caseStudies, capabilities, media, leads, activityLog, users, articles } from '@novaflow/database';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

app.get('/stats', requireAuth, async (c) => {
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const [industryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(industries);
  const [caseStudyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(caseStudies);
  const [capabilityCount] = await db.select({ count: sql<number>`count(*)::int` }).from(capabilities);
  const [mediaCount] = await db.select({ count: sql<number>`count(*)::int` }).from(media);
  const [articleCount] = await db.select({ count: sql<number>`count(*)::int` }).from(articles);
  const [draftCount] = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(eq(articles.status, 'draft'));
  const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(eq(articles.status, 'published'));
  const [productDraftCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'draft'));
  const [productPublishedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'published'));
  const [newLeadsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(leads).where(eq(leads.status, 'new'));

  return c.json({
    products: productCount.count,
    industries: industryCount.count,
    caseStudies: caseStudyCount.count,
    capabilities: capabilityCount.count,
    articles: articleCount.count,
    media: mediaCount.count,
    drafts: draftCount.count + productDraftCount.count,
    published: publishedCount.count + productPublishedCount.count,
    newEnquiries: newLeadsCount.count,
  });
});

app.get('/recent-activity', requireAuth, async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 10), 50);
  const items = await db
    .select({
      id: activityLog.id,
      actorId: activityLog.actorId,
      actorName: users.name,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      entityName: activityLog.entityName,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.actorId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return c.json({ items });
});

export default app;
