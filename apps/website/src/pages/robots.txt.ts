import { getSiteBase } from '../lib/site';

export const GET = () => {
  const siteBase = getSiteBase();
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /cms',
    'Disallow: /admin',
    'Disallow: /design-system',
    'Disallow: /*?*preview=',
    '',
    `Sitemap: ${siteBase}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
