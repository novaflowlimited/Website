import { db } from '@novaflow/database';
import {
  media,
  capabilities,
  products,
  caseStudies,
  seoMetadata,
  type CaseStudy,
  type CaseStudyGalleryItem,
  type Product,
} from '@novaflow/database';
import { eq, inArray, and, ne, asc } from 'drizzle-orm';
import type { ResolvedCapability, ResolvedMedia, ResolvedSeo } from './product-detail';

export type CaseStudyTreatment = 'full' | 'detail' | 'pair';
export type CaseStudyDirection = 'bytepesa' | 'techlane' | 'apinai' | 'default';

export interface RelatedCaseStudyCard {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
  hero: ResolvedMedia | null;
}

export interface CaseStudyGalleryShot extends ResolvedMedia {
  caption: string | null;
  treatment: CaseStudyTreatment;
  order: number;
}

export interface CaseStudyProductRef {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  workflow: string[];
  hero: ResolvedMedia | null;
  screenshots: Array<ResolvedMedia & { caption: string | null; screenTitle: string | null; order: number }>;
}

export interface CaseStudyDetailResponse {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
  challenge: string | null;
  approach: string | null;
  solution: string | null;
  result: string | null;
  featured: boolean;
  status: string;
  order: number;
  direction: CaseStudyDirection;
  hero: ResolvedMedia | null;
  visual: ResolvedMedia | null;
  gallery: CaseStudyGalleryShot[];
  evidence: CaseStudyGalleryShot[];
  systemFlow: string[];
  relatedProducts: CaseStudyProductRef[];
  capabilityItems: ResolvedCapability[];
  related: RelatedCaseStudyCard[];
  previous: RelatedCaseStudyCard | null;
  next: RelatedCaseStudyCard | null;
  seo: ResolvedSeo | null;
}

export interface CaseStudyCardResponse {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
  featured: boolean;
  status: string;
  order: number;
  direction: CaseStudyDirection;
  hero: ResolvedMedia | null;
  visual: ResolvedMedia | null;
}

export function normalizeGallery(
  gallery: Array<string | Partial<CaseStudyGalleryItem> & { mediaId: string }> | undefined | null,
): CaseStudyGalleryItem[] {
  if (!gallery || !Array.isArray(gallery)) return [];
  return gallery
    .map((item, index) => {
      if (typeof item === 'string') {
        return { mediaId: item, caption: null, treatment: 'full' as const, order: index };
      }
      return {
        mediaId: item.mediaId,
        caption: item.caption ?? null,
        treatment: item.treatment ?? 'full',
        order: typeof item.order === 'number' ? item.order : index,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function artDirectionFromSlug(slug: string | null | undefined): CaseStudyDirection {
  if (!slug) return 'default';
  if (slug.includes('bytepesa')) return 'bytepesa';
  if (slug.includes('techlane')) return 'techlane';
  if (slug.includes('apinai')) return 'apinai';
  return 'default';
}

async function resolveMedia(ids: string[]): Promise<Map<string, ResolvedMedia>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, unique));
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

function toCard(row: CaseStudy, visual: ResolvedMedia | null): RelatedCaseStudyCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    client: row.client,
    industry: row.industry,
    summary: row.summary,
    hero: visual,
  };
}

function visualFromProduct(product: Product, mediaMap: Map<string, ResolvedMedia>): ResolvedMedia | null {
  if (product.heroMediaId && mediaMap.has(product.heroMediaId)) {
    return mediaMap.get(product.heroMediaId) ?? null;
  }
  const firstShot = [...(product.screenshots ?? [])].sort((a, b) => a.order - b.order)[0];
  if (firstShot) return mediaMap.get(firstShot.mediaId) ?? null;
  return null;
}

export async function enrichCaseStudyCards(rows: CaseStudy[]): Promise<CaseStudyCardResponse[]> {
  if (rows.length === 0) return [];

  const productIds = [...new Set(rows.flatMap((row) => row.products ?? []))];
  const relatedProducts =
    productIds.length > 0 ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const productById = new Map(relatedProducts.map((p) => [p.id, p]));

  const mediaIds: string[] = [];
  for (const row of rows) {
    if (row.heroMediaId) mediaIds.push(row.heroMediaId);
    const gallery = normalizeGallery(row.gallery);
    if (gallery[0]) mediaIds.push(gallery[0].mediaId);
  }
  for (const product of relatedProducts) {
    if (product.heroMediaId) mediaIds.push(product.heroMediaId);
    const shot = [...(product.screenshots ?? [])].sort((a, b) => a.order - b.order)[0];
    if (shot) mediaIds.push(shot.mediaId);
  }

  const mediaMap = await resolveMedia(mediaIds);

  return rows.map((row) => {
    const gallery = normalizeGallery(row.gallery);
    const primaryProduct = (row.products ?? []).map((id) => productById.get(id)).find(Boolean) ?? null;
    const ownVisual =
      (row.heroMediaId ? mediaMap.get(row.heroMediaId) : null) ??
      (gallery[0] ? mediaMap.get(gallery[0].mediaId) ?? null : null);
    const visual = ownVisual ?? (primaryProduct ? visualFromProduct(primaryProduct, mediaMap) : null);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      client: row.client,
      industry: row.industry,
      summary: row.summary,
      featured: row.featured,
      status: row.status,
      order: row.order,
      direction: artDirectionFromSlug(primaryProduct?.slug ?? row.slug ?? row.title),
      hero: row.heroMediaId ? mediaMap.get(row.heroMediaId) ?? null : null,
      visual,
    };
  });
}

export async function enrichCaseStudy(study: CaseStudy): Promise<CaseStudyDetailResponse> {
  const galleryItems = normalizeGallery(study.gallery);
  const productIds = study.products ?? [];

  const relatedProductRows =
    productIds.length > 0 ? await db.select().from(products).where(inArray(products.id, productIds)) : [];

  const mediaIds = new Set<string>([
    ...(study.heroMediaId ? [study.heroMediaId] : []),
    ...galleryItems.map((item) => item.mediaId),
  ]);

  for (const product of relatedProductRows) {
    if (product.heroMediaId) mediaIds.add(product.heroMediaId);
    for (const shot of product.screenshots ?? []) mediaIds.add(shot.mediaId);
  }

  let seo: ResolvedSeo | null = null;
  let seoOgImageId: string | null = null;
  if (study.seoId) {
    const [seoRow] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, study.seoId)).limit(1);
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

  const publishedSiblings = await db
    .select()
    .from(caseStudies)
    .where(and(eq(caseStudies.status, 'published'), ne(caseStudies.id, study.id)))
    .orderBy(asc(caseStudies.order), asc(caseStudies.title));

  const allPublished = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.status, 'published'))
    .orderBy(asc(caseStudies.order), asc(caseStudies.title));

  for (const sibling of publishedSiblings) {
    if (sibling.heroMediaId) mediaIds.add(sibling.heroMediaId);
    const first = normalizeGallery(sibling.gallery)[0];
    if (first) mediaIds.add(first.mediaId);
  }

  const mediaMap = await resolveMedia([...mediaIds]);
  if (seo && seoOgImageId) {
    seo.ogImageUrl = mediaMap.get(seoOgImageId)?.url ?? null;
  }

  const capabilityItems: ResolvedCapability[] =
    study.capabilities.length > 0
      ? await db
          .select({
            id: capabilities.id,
            name: capabilities.name,
            slug: capabilities.slug,
            shortDescription: capabilities.shortDescription,
          })
          .from(capabilities)
          .where(inArray(capabilities.id, study.capabilities))
      : [];

  const relatedProducts: CaseStudyProductRef[] = relatedProductRows.map((product) => {
    const shots = [...(product.screenshots ?? [])].sort((a, b) => a.order - b.order);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      shortDescription: product.shortDescription,
      workflow: product.workflow ?? [],
      hero: product.heroMediaId ? mediaMap.get(product.heroMediaId) ?? null : null,
      screenshots: shots
        .map((shot) => {
          const resolved = mediaMap.get(shot.mediaId);
          if (!resolved) return null;
          return {
            ...resolved,
            caption: shot.caption ?? null,
            screenTitle: shot.title ?? null,
            order: shot.order,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    };
  });

  const primaryProduct = relatedProducts[0] ?? null;
  const direction = artDirectionFromSlug(primaryProduct?.slug ?? study.slug ?? study.title);

  const gallery: CaseStudyGalleryShot[] = galleryItems
    .map((item) => {
      const resolved = mediaMap.get(item.mediaId);
      if (!resolved) return null;
      return {
        ...resolved,
        caption: item.caption ?? null,
        treatment: (item.treatment ?? 'full') as CaseStudyTreatment,
        order: item.order,
      };
    })
    .filter((s): s is CaseStudyGalleryShot => s !== null);

  const inheritedEvidence: CaseStudyGalleryShot[] =
    gallery.length > 0
      ? []
      : (primaryProduct?.screenshots ?? []).map((shot, index) => ({
          ...shot,
          caption: shot.caption ?? shot.screenTitle,
          treatment: index === 0 ? 'full' : index % 2 === 0 ? 'detail' : 'pair',
          order: index,
        }));

  const ownHero = study.heroMediaId ? mediaMap.get(study.heroMediaId) ?? null : null;
  const visual =
    ownHero ??
    gallery[0] ??
    primaryProduct?.hero ??
    primaryProduct?.screenshots[0] ??
    null;

  const productFlow = primaryProduct?.workflow?.filter(Boolean) ?? [];
  const systemFlow =
    productFlow.length > 0 ? productFlow : capabilityItems.map((item) => item.name);

  const scored = publishedSiblings
    .map((sibling) => {
      const sharedProducts = (sibling.products ?? []).filter((id) => productIds.includes(id)).length;
      const sameIndustry =
        study.industry && sibling.industry && study.industry.toLowerCase() === sibling.industry.toLowerCase() ? 1 : 0;
      return { sibling, score: sharedProducts * 2 + sameIndustry };
    })
    .sort((a, b) => b.score - a.score || a.sibling.order - b.sibling.order)
    .slice(0, 3);

  const related: RelatedCaseStudyCard[] = scored.map(({ sibling }) => {
    const first = normalizeGallery(sibling.gallery)[0];
    const siblingVisual =
      (sibling.heroMediaId ? mediaMap.get(sibling.heroMediaId) : null) ??
      (first ? mediaMap.get(first.mediaId) ?? null : null);
    return toCard(sibling, siblingVisual);
  });

  const currentIndex = allPublished.findIndex((item) => item.id === study.id);
  const prevRow = currentIndex > 0 ? allPublished[currentIndex - 1] : null;
  const nextRow = currentIndex >= 0 && currentIndex < allPublished.length - 1 ? allPublished[currentIndex + 1] : null;

  const navVisual = (row: CaseStudy | null) => {
    if (!row) return null;
    const first = normalizeGallery(row.gallery)[0];
    return (row.heroMediaId ? mediaMap.get(row.heroMediaId) : null) ?? (first ? mediaMap.get(first.mediaId) ?? null : null);
  };

  return {
    id: study.id,
    title: study.title,
    slug: study.slug,
    client: study.client,
    industry: study.industry,
    summary: study.summary,
    challenge: study.challenge,
    approach: study.approach ?? null,
    solution: study.solution,
    result: study.result,
    featured: study.featured,
    status: study.status,
    order: study.order,
    direction,
    hero: ownHero,
    visual,
    gallery,
    evidence: gallery.length > 0 ? gallery : inheritedEvidence,
    systemFlow,
    relatedProducts,
    capabilityItems,
    related,
    previous: prevRow ? toCard(prevRow, navVisual(prevRow)) : null,
    next: nextRow ? toCard(nextRow, navVisual(nextRow)) : null,
    seo,
  };
}
