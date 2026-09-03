import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '@novaflow/database';
import { users } from '@novaflow/database';
import { eq } from 'drizzle-orm';
import {
  signSession,
  verifySession,
  getSessionCookieName,
  getTokenTtl,
  type SessionUser,
} from '../lib/auth';
import { cookieSecure } from '../lib/env';
import { checkLoginRateLimit } from '../lib/rate-limit';
import { logActivity } from '../lib/activity';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

/** Dummy hash so missing-user paths still perform argon2 work (timing). */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$RPaiAoyrvIo/+1FyPAhkNQ$2v2WpfdqRnMOUfI82kiWc+Fp+syTAz0Tsi0dgX/cMGk';

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: 'Invalid request body.' }, 400);
  }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Please provide a valid email and password.' }, 400);
  }

  const clientKey =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    (c.req.header('x-forwarded-for') ?? '').split(',')[0]?.trim() ||
    'unknown';
  const rateKey = `${clientKey}:${result.data.email.toLowerCase()}`;
  const rate = checkLoginRateLimit(rateKey);
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfterSec));
    return c.json({ error: 'Too many login attempts. Please try again shortly.' }, 429);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, result.data.email.toLowerCase()))
    .limit(1);

  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await argon2.verify(hash, result.data.password).catch(() => false);

  if (!user || !valid) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'editor',
  };

  const token = await signSession(sessionUser);

  setCookie(c, getSessionCookieName(), token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'Lax',
    path: '/',
    maxAge: getTokenTtl(),
  });

  await logActivity({
    actorId: user.id,
    action: 'login',
    entityType: 'user',
    entityId: user.id,
    entityName: user.email,
  }).catch(() => undefined);

  return c.json({ user: sessionUser });
});

app.post('/logout', async (c) => {
  const token = getCookie(c, getSessionCookieName());
  if (token) {
    const user = await verifySession(token);
    if (user) {
      await logActivity({
        actorId: user.id,
        action: 'logout',
        entityType: 'user',
        entityId: user.id,
        entityName: user.email,
      }).catch(() => undefined);
    }
  }
  deleteCookie(c, getSessionCookieName(), { path: '/' });
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const token = getCookie(c, getSessionCookieName());
  if (!token) {
    return c.json({ error: 'Not authenticated.' }, 401);
  }
  const session = await verifySession(token);
  if (!session) {
    return c.json({ error: 'Not authenticated.' }, 401);
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!user) {
    return c.json({ error: 'Not authenticated.' }, 401);
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'editor',
    },
  });
});

export default app;
