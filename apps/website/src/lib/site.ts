/**
 * Central site URL helpers for SEO, sitemap, robots, and social metadata.
 * Production builds must set PUBLIC_SITE_URL (HTTPS origin, no trailing slash).
 */

const LOCAL_FALLBACK = 'http://localhost:4321';

export function getSiteBase(explicit?: string | URL | null): string {
  const fromEnv =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SITE_URL) ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    '';

  const raw = String(explicit ?? (fromEnv || LOCAL_FALLBACK)).trim();
  return raw.replace(/\/$/, '');
}

export function absoluteUrl(pathOrUrl: string, siteBase = getSiteBase()): string {
  const value = (pathOrUrl || '').trim();
  if (!value) return `${siteBase}/images/og-default.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) {
    const protocol = siteBase.startsWith('https') ? 'https:' : 'http:';
    return `${protocol}${value}`;
  }
  return `${siteBase}${value.startsWith('/') ? value : `/${value}`}`;
}

export function canonicalUrl(pathOrUrl: string, siteBase = getSiteBase()): string {
  const absolute = absoluteUrl(pathOrUrl, siteBase);
  if (absolute === siteBase || absolute === `${siteBase}/`) return siteBase;
  return absolute.replace(/\/$/, '');
}

export function pageCanonical(pathname: string, siteBase = getSiteBase()): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path === '/') return siteBase;
  return canonicalUrl(path, siteBase);
}
