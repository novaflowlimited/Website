import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { db } from '@novaflow/database';
import { sql } from 'drizzle-orm';
import { optionalAuth } from './auth/middleware';
import authRoutes from './auth/routes';
import productRoutes from './routes/products';
import industryRoutes from './routes/industries';
import capabilityRoutes from './routes/capabilities';
import caseStudyRoutes from './routes/case-studies';
import articleRoutes from './routes/articles';
import insightsMetaRoutes from './routes/insights-meta';
import mediaRoutes from './routes/media';
import navigationRoutes from './routes/navigation';
import siteSettingsRoutes from './routes/site-settings';
import homepageRoutes from './routes/homepage';
import seoRoutes from './routes/seo';
import leadRoutes from './routes/leads';
import activityRoutes from './routes/activity';
import searchRoutes from './routes/search';
import dashboardRoutes from './routes/dashboard';
import siteRoutes from './routes/site';
import type { SessionUser } from './lib/auth';
import { assertDatabaseUrl, getCorsOrigins, getJwtSecret, isProductionRuntime } from './lib/env';

// Validate critical env before serving traffic.
assertDatabaseUrl();
getCorsOrigins();
getJwtSecret();

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

app.onError((err, c) => {
  console.error('[api]', err instanceof Error ? err.message : 'Unknown error');
  if (!isProductionRuntime() && err instanceof Error) {
    return c.json({ error: 'Internal server error.', detail: err.message }, 500);
  }
  return c.json({ error: 'Internal server error.' }, 500);
});

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.use('*', logger());
app.use(
  '*',
  secureHeaders({
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    ...(isProductionRuntime()
      ? { strictTransportSecurity: 'max-age=31536000; includeSubDomains' }
      : {}),
  }),
);
app.use(
  '*',
  cors({
    origin: getCorsOrigins(),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

app.use('*', optionalAuth);

app.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({
      status: 'ok',
      service: 'novaflow-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return c.json(
      {
        status: 'degraded',
        service: 'novaflow-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      503,
    );
  }
});

app.get('/ready', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: 'ready' });
  } catch {
    return c.json({ status: 'not_ready' }, 503);
  }
});

app.get('/', (c) => c.json({ message: 'Novaflow API', health: '/health' }));

app.route('/auth', authRoutes);
app.route('/products', productRoutes);
app.route('/industries', industryRoutes);
app.route('/capabilities', capabilityRoutes);
app.route('/case-studies', caseStudyRoutes);
app.route('/articles', articleRoutes);
app.route('/', insightsMetaRoutes);
app.route('/media', mediaRoutes);
app.route('/navigation', navigationRoutes);
app.route('/site-settings', siteSettingsRoutes);
app.route('/homepage', homepageRoutes);
app.route('/seo', seoRoutes);
app.route('/leads', leadRoutes);
app.route('/contact-enquiries', leadRoutes);
app.route('/activity', activityRoutes);
app.route('/search', searchRoutes);
app.route('/dashboard', dashboardRoutes);
app.route('/site', siteRoutes);

const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  },
);

export default app;
