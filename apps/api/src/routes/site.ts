import { Hono } from 'hono';
import { requireRole } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

app.post('/rebuild', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const rebuildWebhook = process.env.REBUILD_WEBHOOK_URL?.trim();
  const rebuildSecret = process.env.REBUILD_WEBHOOK_SECRET?.trim();

  if (rebuildWebhook) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (rebuildSecret) {
        headers.Authorization = `Bearer ${rebuildSecret}`;
      }
      const response = await fetch(rebuildWebhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'novaflow-cms',
          triggeredBy: user.id,
          triggeredAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        return c.json({ error: 'Rebuild webhook rejected the request.' }, 502);
      }
      await logActivity({ actorId: user.id, action: 'triggered', entityType: 'site', entityName: 'Rebuild' });
      return c.json({ ok: true, message: 'Rebuild triggered.' });
    } catch {
      return c.json({ error: 'Failed to trigger rebuild. Check webhook configuration.' }, 500);
    }
  }

  await logActivity({ actorId: user.id, action: 'triggered', entityType: 'site', entityName: 'Rebuild (manual)' });
  return c.json({
    ok: true,
    message:
      'No REBUILD_WEBHOOK_URL configured. Run "pnpm --filter @novaflow/website build" manually to rebuild the public site.',
  });
});

export default app;
