import { db } from '@novaflow/database';
import {
  media,
  capabilities,
  products,
  industries,
  seoMetadata,
  type HomepageContent,
} from '@novaflow/database';
import { eq, inArray, and } from 'drizzle-orm';

export interface ResolvedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  title: string;
  width: number | null;
  height: number | null;
}

export interface ResolvedCapability {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
}

export interface ResolvedHomeProduct {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  hero: ResolvedMedia | null;
}

export interface ResolvedHomeIndustry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  visual: ResolvedMedia | null;
}

export interface ResolvedHomeCaseStudy {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  summary: string | null;
  hero: ResolvedMedia | null;
}

export interface ResolvedSeo {
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
}

export interface HomepageResponse {
  status: string;
  hero: HomepageContent['hero'] & {
    heroVisual: ResolvedMedia | null;
    mobileHeroVisual: ResolvedMedia | null;
  };
  whatWeBuild: HomepageContent['whatWeBuild'] & {
    capabilities: ResolvedCapability[];
    desktopVisual: ResolvedMedia | null;
    mobileVisual: ResolvedMedia | null;
  };
  products: HomepageContent['products'] & {
    items: ResolvedHomeProduct[];
  };
  forBusiness: HomepageContent['forBusiness'] & {
    items: ResolvedHomeIndustry[];
  };
  work: HomepageContent['work'] & {
    items: ResolvedHomeCaseStudy[];
  };
  about: HomepageContent['about'] & {
    visual: ResolvedMedia | null;
  };
  contact: HomepageContent['contact'];
  seo: ResolvedSeo | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

async function resolveMediaMap(ids: string[]): Promise<Map<string, ResolvedMedia>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, ids));
  const map = new Map<string, ResolvedMedia>();
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      url: row.r2Url,
      thumbnailUrl: row.thumbnailUrl,
      altText: row.decorative ? null : row.altText,
      title: row.title,
      width: row.width,
      height: row.height,
    });
  }
  return map;
}

function resolveMediaRef(map: Map<string, ResolvedMedia>, id: string | null): ResolvedMedia | null {
  if (!id) return null;
  return map.get(id) ?? null;
}

export async function enrichHomepageContent(
  content: HomepageContent,
  meta: { status: string; seoId: string | null; updatedAt: Date | null; publishedAt: Date | null },
): Promise<HomepageResponse> {
  const mediaIds = new Set<string>();
  const add = (id: string | null | undefined) => {
    if (id) mediaIds.add(id);
  };

  add(content.hero.heroVisualMediaId);
  add(content.hero.mobileHeroVisualMediaId);
  add(content.whatWeBuild.desktopVisualMediaId);
  add(content.whatWeBuild.mobileVisualMediaId);
  add(content.about.visualMediaId);

  let seo: ResolvedSeo | null = null;
  if (meta.seoId) {
    const [seoRow] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, meta.seoId)).limit(1);
    if (seoRow) {
      add(seoRow.ogImageMediaId);
      seo = {
        title: seoRow.title,
        description: seoRow.description,
        ogImageUrl: null,
        canonicalUrl: seoRow.canonicalUrl,
      };
    }
  }

  const capabilityRows =
    content.whatWeBuild.capabilityIds.length > 0
      ? await db
          .select({
            id: capabilities.id,
            name: capabilities.name,
            slug: capabilities.slug,
            shortDescription: capabilities.shortDescription,
          })
          .from(capabilities)
          .where(
            and(
              inArray(capabilities.id, content.whatWeBuild.capabilityIds),
              eq(capabilities.status, 'published'),
            ),
          )
      : [];

  const capabilityMap = new Map(capabilityRows.map((c) => [c.id, c]));
  const orderedCapabilities = content.whatWeBuild.capabilityIds
    .map((id) => capabilityMap.get(id))
    .filter((c): c is ResolvedCapability => c !== undefined);

  const productRows =
    content.products.featuredProductIds.length > 0
      ? await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            category: products.category,
            shortDescription: products.shortDescription,
            heroMediaId: products.heroMediaId,
          })
          .from(products)
          .where(
            and(inArray(products.id, content.products.featuredProductIds), eq(products.status, 'published')),
          )
      : [];

  for (const p of productRows) add(p.heroMediaId);

  const industryRows =
    content.forBusiness.featuredIndustryIds.length > 0
      ? await db
          .select({
            id: industries.id,
            name: industries.name,
            slug: industries.slug,
            shortDescription: industries.shortDescription,
            visualMediaId: industries.visualMediaId,
          })
          .from(industries)
          .where(
            and(inArray(industries.id, content.forBusiness.featuredIndustryIds), eq(industries.status, 'published')),
          )
      : [];

  for (const i of industryRows) add(i.visualMediaId);

  const mediaMap = await resolveMediaMap([...mediaIds]);

  if (seo && meta.seoId) {
    const [seoRow] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, meta.seoId)).limit(1);
    if (seoRow?.ogImageMediaId) {
      seo.ogImageUrl = mediaMap.get(seoRow.ogImageMediaId)?.url ?? null;
    }
  }

  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const industryMap = new Map(industryRows.map((i) => [i.id, i]));

  return {
    status: meta.status,
    hero: {
      ...content.hero,
      heroVisual: resolveMediaRef(mediaMap, content.hero.heroVisualMediaId),
      mobileHeroVisual: resolveMediaRef(mediaMap, content.hero.mobileHeroVisualMediaId),
    },
    whatWeBuild: {
      ...content.whatWeBuild,
      capabilities: orderedCapabilities,
      desktopVisual: resolveMediaRef(mediaMap, content.whatWeBuild.desktopVisualMediaId),
      mobileVisual: resolveMediaRef(mediaMap, content.whatWeBuild.mobileVisualMediaId),
    },
    products: {
      ...content.products,
      items: content.products.featuredProductIds
        .map((id) => productMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          shortDescription: p.shortDescription,
          hero: resolveMediaRef(mediaMap, p.heroMediaId),
        })),
    },
    forBusiness: {
      ...content.forBusiness,
      items: content.forBusiness.featuredIndustryIds
        .map((id) => industryMap.get(id))
        .filter((i): i is NonNullable<typeof i> => i !== undefined)
        .map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          shortDescription: i.shortDescription,
          visual: resolveMediaRef(mediaMap, i.visualMediaId),
        })),
    },
    work: {
      ...content.work,
      items: [],
    },
    about: {
      ...content.about,
      visual: resolveMediaRef(mediaMap, content.about.visualMediaId),
    },
    contact: content.contact,
    seo,
    updatedAt: meta.updatedAt?.toISOString() ?? null,
    publishedAt: meta.publishedAt?.toISOString() ?? null,
  };
}

export function countHomepageChanges(draft: HomepageContent, published: HomepageContent | null): number {
  if (!published) return 1;
  return JSON.stringify(draft) === JSON.stringify(published) ? 0 : 1;
}

export function summarizeHomepageChanges(
  draft: HomepageContent,
  published: HomepageContent | null,
): string[] {
  if (!published) return ['All sections'];
  const changed: string[] = [];
  if (JSON.stringify(draft.hero) !== JSON.stringify(published.hero)) changed.push('Hero');
  if (JSON.stringify(draft.whatWeBuild) !== JSON.stringify(published.whatWeBuild)) changed.push('What We Build');
  if (JSON.stringify(draft.products) !== JSON.stringify(published.products)) changed.push('Products');
  if (JSON.stringify(draft.forBusiness) !== JSON.stringify(published.forBusiness)) changed.push('For Business');
  if (JSON.stringify(draft.work) !== JSON.stringify(published.work)) changed.push('Work');
  if (JSON.stringify(draft.about) !== JSON.stringify(published.about)) changed.push('About');
  if (JSON.stringify(draft.contact) !== JSON.stringify(published.contact)) changed.push('Contact');
  return changed;
}
