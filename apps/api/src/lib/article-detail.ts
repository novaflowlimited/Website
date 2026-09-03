import { db } from '@novaflow/database';
import {
  articles,
  articleCategories,
  articleAuthors,
  media,
  products,
  industries,
  type Article,
} from '@novaflow/database';
import { eq, inArray, and, desc, ne } from 'drizzle-orm';
import {
  articlePlainText,
  collectArticleMediaIds,
  readingTimeMinutes,
  sanitizeArticleDocument,
} from '@novaflow/validation';

export interface ResolvedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  title: string;
  width: number | null;
  height: number | null;
}

export interface ResolvedCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ResolvedAuthor {
  name: string;
  role: string | null;
  slug: string | null;
  bio: string | null;
  photo: ResolvedMedia | null;
}

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  readingTime: number;
}

export interface RelatedProductRef {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

export interface RelatedIndustryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleSeo {
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  featured: boolean;
  order: number;
  status: string;
  category: ResolvedCategory | null;
  hero: ResolvedMedia | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
}

export interface ArticleDetailResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
    content: ReturnType<typeof sanitizeArticleDocument> & {
      blocks: Array<ReturnType<typeof sanitizeArticleDocument>['blocks'][number] & Record<string, unknown>>;
    };
  tags: string[];
  featured: boolean;
  order: number;
  status: string;
  category: ResolvedCategory | null;
  author: ResolvedAuthor;
  hero: ResolvedMedia | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
  related: RelatedArticle[];
  relatedProducts: RelatedProductRef[];
  relatedIndustries: RelatedIndustryRef[];
  seo: ArticleSeo;
}

async function resolveMediaMap(ids: string[]): Promise<Map<string, ResolvedMedia>> {
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

export function articleReadingTime(article: Pick<Article, 'title' | 'excerpt' | 'content'>): number {
  const body = articlePlainText(article.content);
  return readingTimeMinutes([article.title, article.excerpt ?? '', body].join(' '));
}

export async function toArticleListItem(article: Article): Promise<ArticleListItem> {
  const mediaIds = article.heroMediaId ? [article.heroMediaId] : [];
  const mediaMap = await resolveMediaMap(mediaIds);
  let category: ResolvedCategory | null = null;
  if (article.categoryId) {
    const [row] = await db.select().from(articleCategories).where(eq(articleCategories.id, article.categoryId)).limit(1);
    if (row) category = { id: row.id, name: row.name, slug: row.slug };
  }
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    tags: article.tags ?? [],
    featured: article.featured,
    order: article.order,
    status: article.status,
    category,
    hero: article.heroMediaId ? mediaMap.get(article.heroMediaId) ?? null : null,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    readingTime: articleReadingTime(article),
  };
}

export async function enrichArticle(article: Article, options?: { includeDrafts?: boolean }): Promise<ArticleDetailResponse> {
  const content = sanitizeArticleDocument(article.content);
  const inlineMediaIds = collectArticleMediaIds(content);
  const mediaIds = [
    ...(article.heroMediaId ? [article.heroMediaId] : []),
    ...(article.ogImageMediaId ? [article.ogImageMediaId] : []),
    ...inlineMediaIds,
  ];

  const mediaMap = await resolveMediaMap(mediaIds);

  let category: ResolvedCategory | null = null;
  if (article.categoryId) {
    const [row] = await db.select().from(articleCategories).where(eq(articleCategories.id, article.categoryId)).limit(1);
    if (row) category = { id: row.id, name: row.name, slug: row.slug };
  }

  let author: ResolvedAuthor = {
    name: 'Novaflow',
    role: null,
    slug: null,
    bio: null,
    photo: null,
  };
  if (article.authorId) {
    const [row] = await db.select().from(articleAuthors).where(eq(articleAuthors.id, article.authorId)).limit(1);
    if (row) {
      const photo = row.photoMediaId ? mediaMap.get(row.photoMediaId) ?? (await resolveMediaMap([row.photoMediaId])).get(row.photoMediaId) ?? null : null;
      author = {
        name: row.name,
        role: row.role,
        slug: row.slug,
        bio: row.bio,
        photo,
      };
    }
  }

  const related = await findRelatedArticles(article, options?.includeDrafts ?? false);
  const relatedProducts = await resolveProducts(article.relatedProductIds ?? []);
  const relatedIndustries = await resolveIndustries(article.relatedIndustryIds ?? []);

  const ogImage = article.ogImageMediaId
    ? mediaMap.get(article.ogImageMediaId)?.url ?? null
    : article.heroMediaId
      ? mediaMap.get(article.heroMediaId)?.url ?? null
      : null;

  const resolvedContent = {
    blocks: content.blocks.map((block) => {
      if (block.type !== 'image') return block;
      const resolved = mediaMap.get(block.mediaId);
      return {
        ...block,
        url: resolved?.url ?? null,
        altText: resolved?.altText ?? resolved?.title ?? '',
        width: resolved?.width ?? null,
        height: resolved?.height ?? null,
      };
    }),
  };

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: resolvedContent,
    tags: article.tags ?? [],
    featured: article.featured,
    order: article.order,
    status: article.status,
    category,
    author,
    hero: article.heroMediaId ? mediaMap.get(article.heroMediaId) ?? null : null,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    readingTime: articleReadingTime({ ...article, content }),
    related,
    relatedProducts,
    relatedIndustries,
    seo: {
      title: article.seoTitle,
      description: article.seoDescription,
      ogImageUrl: ogImage,
      canonicalUrl: null,
    },
  };
}

async function findRelatedArticles(article: Article, includeDrafts: boolean): Promise<RelatedArticle[]> {
  const candidates = await db
    .select()
    .from(articles)
    .where(
      includeDrafts
        ? ne(articles.id, article.id)
        : and(ne(articles.id, article.id), eq(articles.status, 'published')),
    )
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt))
    .limit(24);

  const scored = candidates
    .map((candidate) => {
      let score = 0;
      if (article.categoryId && candidate.categoryId === article.categoryId) score += 5;
      const tags = new Set((article.tags ?? []).map((tag) => tag.toLowerCase()));
      for (const tag of candidate.tags ?? []) {
        if (tags.has(tag.toLowerCase())) score += 2;
      }
      return { candidate, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.candidate);

  const items: RelatedArticle[] = [];
  for (const related of scored) {
    let categoryName: string | null = null;
    let categorySlug: string | null = null;
    if (related.categoryId) {
      const [cat] = await db.select().from(articleCategories).where(eq(articleCategories.id, related.categoryId)).limit(1);
      categoryName = cat?.name ?? null;
      categorySlug = cat?.slug ?? null;
    }
    items.push({
      id: related.id,
      title: related.title,
      slug: related.slug,
      excerpt: related.excerpt,
      categoryName,
      categorySlug,
      publishedAt: related.publishedAt?.toISOString() ?? null,
      readingTime: articleReadingTime(related),
    });
  }
  return items;
}

async function resolveProducts(ids: string[]): Promise<RelatedProductRef[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await db
    .select({ id: products.id, name: products.name, slug: products.slug, category: products.category, status: products.status })
    .from(products)
    .where(and(inArray(products.id, unique), eq(products.status, 'published')));
  return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, category: row.category }));
}

async function resolveIndustries(ids: string[]): Promise<RelatedIndustryRef[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await db
    .select({ id: industries.id, name: industries.name, slug: industries.slug, status: industries.status })
    .from(industries)
    .where(and(inArray(industries.id, unique), eq(industries.status, 'published')));
  return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}
