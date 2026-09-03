import { db } from '@novaflow/database';
import {
  media,
  products,
  capabilities,
  caseStudies,
  seoMetadata,
  type Industry,
} from '@novaflow/database';
import { eq, inArray, and, or, ilike, asc } from 'drizzle-orm';

export interface ResolvedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  title: string;
  width: number | null;
  height: number | null;
}

export interface ResolvedProductRef {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  hero: ResolvedMedia | null;
}

export interface ResolvedCapability {
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

export interface IndustryDetailResponse {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  businessContext: string | null;
  challengeHeadline: string | null;
  challenge: string | null;
  systemDescription: string | null;
  systemItems: string[];
  status: string;
  order: number;
  visual: ResolvedMedia | null;
  mobileVisual: ResolvedMedia | null;
  relatedProductItems: ResolvedProductRef[];
  capabilityItems: ResolvedCapability[];
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

export async function enrichIndustry(industry: Industry): Promise<IndustryDetailResponse> {
  const mediaIds = new Set<string>([
    ...(industry.visualMediaId ? [industry.visualMediaId] : []),
    ...(industry.mobileVisualMediaId ? [industry.mobileVisualMediaId] : []),
  ]);

  let seo: ResolvedSeo | null = null;
  let seoOgImageId: string | null = null;
  if (industry.seoId) {
    const [seoRow] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, industry.seoId)).limit(1);
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

  const relatedProductRows =
    industry.relatedProducts.length > 0
      ? await db
          .select()
          .from(products)
          .where(and(inArray(products.id, industry.relatedProducts), eq(products.status, 'published')))
      : [];

  for (const product of relatedProductRows) {
    if (product.heroMediaId) mediaIds.add(product.heroMediaId);
  }

  const mediaMap = await resolveMedia([...mediaIds]);

  if (seo && seoOgImageId) {
    seo.ogImageUrl = mediaMap.get(seoOgImageId)?.url ?? null;
  }

  const capabilityItems: ResolvedCapability[] =
    industry.relatedCapabilities.length > 0
      ? await db
          .select({
            id: capabilities.id,
            name: capabilities.name,
            slug: capabilities.slug,
            shortDescription: capabilities.shortDescription,
          })
          .from(capabilities)
          .where(inArray(capabilities.id, industry.relatedCapabilities))
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
        or(
          ilike(caseStudies.industry, industry.name),
          ilike(caseStudies.industry, industry.slug.replace(/-/g, ' ')),
        ),
      ),
    )
    .orderBy(asc(caseStudies.order));

  const relatedProductItems: ResolvedProductRef[] = relatedProductRows.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    hero: product.heroMediaId ? mediaMap.get(product.heroMediaId) ?? null : null,
  }));

  return {
    id: industry.id,
    name: industry.name,
    slug: industry.slug,
    shortDescription: industry.shortDescription,
    businessContext: industry.businessContext,
    challengeHeadline: industry.challengeHeadline,
    challenge: industry.challenge,
    systemDescription: industry.systemDescription,
    systemItems: industry.systemItems ?? [],
    status: industry.status,
    order: industry.order,
    visual: industry.visualMediaId ? mediaMap.get(industry.visualMediaId) ?? null : null,
    mobileVisual: industry.mobileVisualMediaId ? mediaMap.get(industry.mobileVisualMediaId) ?? null : null,
    relatedProductItems,
    capabilityItems,
    relatedCaseStudies,
    seo,
  };
}
