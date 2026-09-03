import { Hono } from 'hono';
import { db } from '@novaflow/database';
import { activityLog, users } from '@novaflow/database';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

app.get('/', requireAuth, async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 50);
  const entityType = c.req.query('entity');

  const conditions = [];
  if (entityType) conditions.push(eq(activityLog.entityType, entityType));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return c.json({ items });
});

export default app;
