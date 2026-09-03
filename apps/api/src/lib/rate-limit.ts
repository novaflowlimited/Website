/** Simple in-memory rate limiter for sensitive public endpoints. */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { windowMs: number; max: number },
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= options.max) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function checkEnquiryRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  return checkRateLimit(`enquiry:${key}`, { windowMs: 15 * 60 * 1000, max: 5 });
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  return checkRateLimit(`login:${key}`, { windowMs: 15 * 60 * 1000, max: 10 });
}

/** Deduplicate accidental double-submits within a short window. */
const recentHashes = new Map<string, number>();
const DEDUPE_MS = 45_000;

export function isDuplicateEnquiry(hash: string): boolean {
  const now = Date.now();
  for (const [key, expires] of recentHashes) {
    if (expires <= now) recentHashes.delete(key);
  }
  if (recentHashes.has(hash)) return true;
  recentHashes.set(hash, now + DEDUPE_MS);
  return false;
}

export function stripControlAndHtml(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex -- intentional control-char sanitization
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}
