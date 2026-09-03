import { Hono } from 'hono';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@novaflow/database';
import { leads } from '@novaflow/database';
import { eq, desc, asc, sql, and, or, ilike } from 'drizzle-orm';
import { requireRole } from '../auth/middleware';
import { logActivity } from '../lib/activity';
import { checkEnquiryRateLimit, isDuplicateEnquiry, stripControlAndHtml } from '../lib/enquiry-guard';
import { notifyNewEnquiry } from '../lib/enquiry-notify';
import type { SessionUser } from '../lib/auth';

const app = new Hono<{ Variables: { user: SessionUser | null } }>();

const PROJECT_TYPES = [
  'Business software',
  'POS / Retail',
  'ISP / Connectivity',
  'Aviation',
  'Pharmacy',
  'Automation',
  'Custom system',
  'Other',
] as const;

const BUDGET_RANGES = [
  'Not sure yet',
  'Under KES 100K',
  'KES 100K–500K',
  'KES 500K–1M',
  'KES 1M+',
  'Prefer to discuss',
] as const;

const TIMELINES = ['ASAP', '1–3 months', '3–6 months', '6+ months', 'Not sure'] as const;

const LEAD_STATUSES = ['new', 'reviewing', 'contacted', 'qualified', 'closed', 'in_progress'] as const;

const leadSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  projectType: z.string().trim().max(255).optional().nullable(),
  budgetRange: z.string().trim().max(80).optional().nullable(),
  timeline: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().min(12).max(2000),
  source: z.string().trim().max(255).optional().nullable(),
  honeypot: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
});

const leadStatusUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

const leadNotesUpdateSchema = z.object({
  internalNotes: z.string().max(5000).optional().nullable(),
});

const MAX_BODY_BYTES = 12_000;

function clientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return c.req.header('x-real-ip') || c.req.header('cf-connecting-ip') || 'unknown';
}

function emptyToNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Public endpoint — no auth required
app.post('/', async (c) => {
  const contentLength = Number(c.req.header('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return c.json({ error: 'Submission is too large.' }, 413);
  }

  const rate = checkEnquiryRateLimit(clientKey(c));
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfterSec));
    return c.json({ error: 'Too many enquiries. Please try again shortly.' }, 429);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid request body.' }, 400);
  }

  const raw = body as Record<string, unknown>;
  const honeypotValue =
    (typeof raw.honeypot === 'string' ? raw.honeypot : '') ||
    (typeof raw.website === 'string' ? raw.website : '');
  if (honeypotValue.trim()) {
    // Silent success for bots — do not reveal detection.
    return c.json({ ok: true });
  }

  const sanitized = {
    name: typeof raw.name === 'string' ? stripControlAndHtml(raw.name) : '',
    email: typeof raw.email === 'string' ? stripControlAndHtml(raw.email).toLowerCase() : '',
    company: typeof raw.company === 'string' ? stripControlAndHtml(raw.company) : null,
    phone: typeof raw.phone === 'string' ? stripControlAndHtml(raw.phone) : null,
    projectType: typeof raw.projectType === 'string' ? stripControlAndHtml(raw.projectType) : null,
    budgetRange: typeof raw.budgetRange === 'string' ? stripControlAndHtml(raw.budgetRange) : null,
    timeline: typeof raw.timeline === 'string' ? stripControlAndHtml(raw.timeline) : null,
    message: typeof raw.message === 'string' ? stripControlAndHtml(raw.message) : '',
    source: typeof raw.source === 'string' ? stripControlAndHtml(raw.source).slice(0, 255) : null,
  };

  const result = leadSubmissionSchema.safeParse(sanitized);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    if (fieldErrors.email) {
      return c.json({ error: 'Enter a valid email address.', fields: fieldErrors }, 400);
    }
    if (fieldErrors.name) {
      return c.json({ error: 'Enter your name.', fields: fieldErrors }, 400);
    }
    if (fieldErrors.message) {
      return c.json({ error: 'Tell us a bit more about what you need the system to do.', fields: fieldErrors }, 400);
    }
    return c.json({ error: 'Please complete the required fields and try again.', fields: fieldErrors }, 400);
  }

  const dedupeHash = createHash('sha256')
    .update(`${result.data.email}|${result.data.message}|${result.data.projectType ?? ''}`)
    .digest('hex');

  if (isDuplicateEnquiry(dedupeHash)) {
    return c.json({ ok: true, duplicate: true });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      id: randomUUID(),
      name: result.data.name,
      email: result.data.email,
      company: emptyToNull(result.data.company),
      phone: emptyToNull(result.data.phone),
      projectType: emptyToNull(result.data.projectType),
      budgetRange: emptyToNull(result.data.budgetRange),
      timeline: emptyToNull(result.data.timeline),
      message: result.data.message,
      source: emptyToNull(result.data.source) ?? 'contact',
      status: 'new',
    })
    .returning();

  void notifyNewEnquiry({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    projectType: lead.projectType,
    message: lead.message,
    source: lead.source,
    createdAt: lead.createdAt,
  });

  return c.json({ ok: true });
});

// Admin-only list — never public
app.get('/', requireRole('admin'), async (c) => {
  const status = c.req.query('status');
  const search = c.req.query('search');
  const sort = c.req.query('sort') ?? 'newest';
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const conditions = [];
  if (status && status !== 'all') {
    conditions.push(eq(leads.status, status as (typeof LEAD_STATUSES)[number]));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(ilike(leads.name, pattern), ilike(leads.email, pattern), ilike(leads.company, pattern), ilike(leads.projectType, pattern))!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderClause = sort === 'oldest' ? asc(leads.createdAt) : desc(leads.createdAt);
  const items = await db.select().from(leads).where(where).orderBy(orderClause).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where);
  return c.json({ items, total });
});

app.get('/meta/options', requireRole('admin'), async (c) => {
  return c.json({
    projectTypes: PROJECT_TYPES,
    budgetRanges: BUDGET_RANGES,
    timelines: TIMELINES,
    statuses: ['new', 'reviewing', 'contacted', 'qualified', 'closed'],
  });
});

app.get('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')!;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) return c.json({ error: 'Enquiry not found.' }, 404);
  return c.json(lead);
});

app.patch('/:id/status', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = leadStatusUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid status.', issues: result.error.flatten() }, 400);

  const [updated] = await db
    .update(leads)
    .set({ status: result.data.status, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Enquiry not found.' }, 404);
  await logActivity({
    actorId: user.id,
    action: 'updated',
    entityType: 'lead',
    entityId: updated.id,
    entityName: updated.name,
    metadata: { status: updated.status },
  });
  return c.json(updated);
});

app.patch('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const result = leadNotesUpdateSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid enquiry update.', issues: result.error.flatten() }, 400);

  const notes = result.data.internalNotes === undefined ? undefined : emptyToNull(result.data.internalNotes);
  const [updated] = await db
    .update(leads)
    .set({
      ...(notes !== undefined ? { internalNotes: notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Enquiry not found.' }, 404);
  await logActivity({
    actorId: user.id,
    action: 'updated',
    entityType: 'lead',
    entityId: updated.id,
    entityName: updated.name,
  });
  return c.json(updated);
});

export default app;
export { PROJECT_TYPES, BUDGET_RANGES, TIMELINES };
