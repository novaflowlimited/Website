import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { db, users } from '@novaflow/database';
import { verifySession, getSessionCookieName, type SessionUser } from '../lib/auth';

type Vars = { user: SessionUser | null };

async function loadSessionUser(token: string): Promise<SessionUser | null> {
  const session = await verifySession(token);
  if (!session) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!row) return null;
  if (row.role !== 'admin' && row.role !== 'editor') return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as 'admin' | 'editor',
  };
}

export async function requireAuth(c: Context<{ Variables: Vars }>, next: Next) {
  const token = getCookie(c, getSessionCookieName());
  if (!token) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const user = await loadSessionUser(token);
  if (!user) {
    return c.json({ error: 'Invalid or expired session.' }, 401);
  }
  c.set('user', user);
  await next();
}

export function requireRole(role: 'admin' | 'editor') {
  return async (c: Context<{ Variables: Vars }>, next: Next) => {
    const token = getCookie(c, getSessionCookieName());
    if (!token) {
      return c.json({ error: 'Authentication required.' }, 401);
    }
    const user = await loadSessionUser(token);
    if (!user) {
      return c.json({ error: 'Invalid or expired session.' }, 401);
    }
    c.set('user', user);
    if (role === 'admin' && user.role !== 'admin') {
      return c.json({ error: 'Admin access required.' }, 403);
    }
    await next();
  };
}

export async function optionalAuth(c: Context<{ Variables: Vars }>, next: Next) {
  const token = getCookie(c, getSessionCookieName());
  if (token) {
    const user = await loadSessionUser(token);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
}
