import { siteSettings } from '@novaflow/database';
import { db } from '@novaflow/database';

export interface EnquiryNotificationPayload {
  id: string;
  name: string;
  email: string;
  company: string | null;
  projectType: string | null;
  message: string;
  source: string | null;
  createdAt: Date;
}

/**
 * Fire-and-forget internal notification for new enquiries.
 * Uses ENQUIRY_NOTIFY_WEBHOOK when set; never hardcodes personal emails.
 */
export async function notifyNewEnquiry(lead: EnquiryNotificationPayload): Promise<void> {
  const webhook = process.env.ENQUIRY_NOTIFY_WEBHOOK?.trim();
  if (!webhook) return;

  const cmsBase = (process.env.CMS_URL ?? process.env.PUBLIC_CMS_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const dashboardLink = `${cmsBase}/contact-enquiries`;
  const notifyEmail =
    process.env.ENQUIRY_NOTIFY_EMAIL?.trim() ||
    (await db.select({ contactEmail: siteSettings.contactEmail }).from(siteSettings).limit(1).then((rows) => rows[0]?.contactEmail ?? null));

  const excerpt = lead.message.length > 240 ? `${lead.message.slice(0, 237)}…` : lead.message;

  const body = {
    subject: 'New project enquiry received',
    title: 'New project enquiry received',
    name: lead.name,
    email: lead.email,
    company: lead.company,
    projectType: lead.projectType,
    source: lead.source,
    description: excerpt,
    dashboardLink,
    enquiryId: lead.id,
    notifyEmail,
    createdAt: lead.createdAt.toISOString(),
  };

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.ENQUIRY_NOTIFY_WEBHOOK_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;

    await fetch(webhook, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Notification failures must never break enquiry capture.
  }
}
