import { getSiteBase } from '../lib/site';

export const GET = async () => {
  const baseUrl = getSiteBase();
  const apiUrl = process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:8787';

  let productSlugs = ['bytepesa', 'techlane', 'apinai-air'];
  let industrySlugs = ['retail', 'pharmacy', 'isp', 'aviation', 'hospitality', 'professional-services'];
  let articleSlugs: string[] = [];
  let caseStudySlugs: string[] = [];

  try {
    const [productsRes, industriesRes, articlesRes, caseStudiesRes] = await Promise.all([
      fetch(`${apiUrl}/products?limit=100`),
      fetch(`${apiUrl}/industries?limit=100`),
      fetch(`${apiUrl}/articles?limit=100`),
      fetch(`${apiUrl}/case-studies?limit=100`),
    ]);
    if (productsRes.ok) {
      const data = (await productsRes.json()) as { items: Array<{ slug: string; status: string }> };
      const published = data.items.filter((p) => p.status === 'published').map((p) => p.slug);
      if (published.length > 0) productSlugs = published;
    }
    if (industriesRes.ok) {
      const data = (await industriesRes.json()) as { items: Array<{ slug: string; status: string }> };
      const published = data.items.filter((i) => i.status === 'published').map((i) => i.slug);
      if (published.length > 0) industrySlugs = published;
    }
    if (articlesRes.ok) {
      const data = (await articlesRes.json()) as { items: Array<{ slug: string; status: string }> };
      articleSlugs = data.items.filter((article) => article.status === 'published').map((article) => article.slug);
    }
    if (caseStudiesRes.ok) {
      const data = (await caseStudiesRes.json()) as { items: Array<{ slug: string; status: string }> };
      caseStudySlugs = data.items.filter((item) => item.status === 'published').map((item) => item.slug);
    }
  } catch {
    // use fallback slugs
  }

  const routes = [
    '/',
    '/products',
    '/industries',
    '/case-studies',
    '/insights',
    '/about',
    '/contact',
    ...productSlugs.map((slug) => `/products/${slug}`),
    ...industrySlugs.map((slug) => `/industries/${slug}`),
    ...articleSlugs.map((slug) => `/insights/${slug}`),
    ...caseStudySlugs.map((slug) => `/case-studies/${slug}`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${baseUrl}${route === '/' ? '' : route}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
