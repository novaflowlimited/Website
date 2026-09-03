import { getInsightsIndex } from '../../lib/api';
import { getSiteBase } from '../../lib/site';

export const GET = async () => {
  const siteBase = getSiteBase();
  const { items, featured } = await getInsightsIndex({ limit: 50, offset: 0 });
  const articles = [...(featured ? [featured] : []), ...items.filter((item) => item.id !== featured?.id)];
  const unique = articles.filter((item, index, all) => all.findIndex((entry) => entry.id === item.id) === index);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Novaflow Insights</title>
    <link>${siteBase}/insights</link>
    <description>Thinking about systems, technology and automation.</description>
    ${unique
      .map(
        (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <description>${escapeXml(article.excerpt ?? '')}</description>
      <link>${siteBase}/insights/${article.slug}</link>
      <guid>${siteBase}/insights/${article.slug}</guid>
      ${article.publishedAt ? `<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>` : ''}
    </item>`,
      )
      .join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
