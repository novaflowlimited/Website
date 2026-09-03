import { db } from '@novaflow/database';
import {
  media,
  capabilities,
  industries,
  caseStudies,
  seoMetadata,
  type Product,
} from '@novaflow/database';
import { eq, inArray, and, sql } from 'drizzle-orm';

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

export interface ResolvedIndustry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
}

export interface ResolvedCaseStudy {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
}

export interface ResolvedSeo {
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
}

export interface ProductDetailResponse {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  features: string[];
  workflow: string[];
  status: string;
  order: number;
  hero: ResolvedMedia | null;
  logo: ResolvedMedia | null;
  screenshots: Array<ResolvedMedia & { screenTitle?: string | null; caption?: string | null; order: number }>;
  capabilityItems: ResolvedCapability[];
  industryItems: ResolvedIndustry[];
  relatedCaseStudies: ResolvedCaseStudy[];
  seo: ResolvedSeo | null;
}

async function resolveMedia(ids: string[]): Promise<Map<string, ResolvedMedia>> {
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

export async function enrichProduct(product: Product): Promise<ProductDetailResponse> {
  const screenshotMediaIds = (product.screenshots ?? []).map((s) => s.mediaId);
  const mediaIds = new Set<string>([
    ...(product.heroMediaId ? [product.heroMediaId] : []),
    ...(product.logoMediaId ? [product.logoMediaId] : []),
    ...screenshotMediaIds,
  ]);

  let seo: ResolvedSeo | null = null;
  let seoOgImageId: string | null = null;
  if (product.seoId) {
    const [seoRow] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, product.seoId)).limit(1);
    if (seoRow) {
      if (seoRow.ogImageMediaId) {
        mediaIds.add(seoRow.ogImageMediaId);
        seoOgImageId = seoRow.ogImageMediaId;
      }
      seo = {
        title: seoRow.title,
        description: seoRow.description,
        ogTitle: seoRow.ogTitle,
        ogDescription: seoRow.ogDescription,
        ogImageUrl: null,
        canonicalUrl: seoRow.canonicalUrl,
      };
    }
  }

  const mediaMap = await resolveMedia([...mediaIds]);

  if (seo && seoOgImageId) {
    seo.ogImageUrl = mediaMap.get(seoOgImageId)?.url ?? null;
  }

  const capabilityItems: ResolvedCapability[] =
    product.capabilities.length > 0
      ? await db
          .select({
            id: capabilities.id,
            name: capabilities.name,
            slug: capabilities.slug,
            shortDescription: capabilities.shortDescription,
          })
          .from(capabilities)
          .where(inArray(capabilities.id, product.capabilities))
      : [];

  const industryItems: ResolvedIndustry[] =
    product.industries.length > 0
      ? await db
          .select({
            id: industries.id,
            name: industries.name,
            slug: industries.slug,
            shortDescription: industries.shortDescription,
          })
          .from(industries)
          .where(inArray(industries.id, product.industries))
      : [];

  const relatedCaseStudies = await db
    .select({
      id: caseStudies.id,
      title: caseStudies.title,
      slug: caseStudies.slug,
      client: caseStudies.client,
      industry: caseStudies.industry,
      summary: caseStudies.summary,
    })
    .from(caseStudies)
    .where(
      and(
        eq(caseStudies.status, 'published'),
        sql`${caseStudies.products} @> ${JSON.stringify([product.id])}::jsonb`,
      ),
    )
    .orderBy(caseStudies.order);

  const sortedScreenshots = [...(product.screenshots ?? [])].sort((a, b) => a.order - b.order);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    description: product.description,
    problem: product.problem,
    solution: product.solution,
    features: product.features ?? [],
    workflow: product.workflow ?? [],
    status: product.status,
    order: product.order,
    hero: product.heroMediaId ? mediaMap.get(product.heroMediaId) ?? null : null,
    logo: product.logoMediaId ? mediaMap.get(product.logoMediaId) ?? null : null,
    screenshots: sortedScreenshots
      .map((shot) => {
        const resolved = mediaMap.get(shot.mediaId);
        if (!resolved) return null;
        return { ...resolved, screenTitle: shot.title, caption: shot.caption, order: shot.order };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null),
    capabilityItems,
    industryItems,
    relatedCaseStudies,
    seo,
  };
}
