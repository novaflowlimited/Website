// Astro build-time API client — fetches published content from the Novaflow API
// Used in frontmatter (SSG) to populate pages from CMS data.

import { getFallbackProductBySlug, getFallbackProducts } from './product-fallback';
import { getFallbackIndustryBySlug, getFallbackIndustries, getFallbackIndustryList } from './industry-fallback';
import { getFallbackHomepage } from './homepage-fallback';

const API_URL = import.meta.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:8787';

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

export interface ProductDetail {
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

/** @deprecated Use ProductDetail for detail pages */
export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  capabilities: string[];
  industries: string[];
  status: string;
  order: number;
}

export interface PublicIndustry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  relatedProducts: string[];
  relatedCapabilities: string[];
  status: string;
  order: number;
}

export interface ResolvedProductRef {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  hero: ResolvedMedia | null;
}

export interface IndustryDetail {
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

export interface IndustryListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  order: number;
}

export interface PublicCaseStudy {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
  featured: boolean;
  status: string;
  order: number;
  direction: 'bytepesa' | 'techlane' | 'apinai' | 'default';
  hero: ResolvedMedia | null;
  visual: ResolvedMedia | null;
}

export interface CaseStudyShot extends ResolvedMedia {
  caption: string | null;
  treatment: 'full' | 'detail' | 'pair';
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

export interface RelatedWorkCard {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  industry: string | null;
  summary: string | null;
  hero: ResolvedMedia | null;
}

export interface CaseStudyDetail {
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
  direction: 'bytepesa' | 'techlane' | 'apinai' | 'default';
  hero: ResolvedMedia | null;
  visual: ResolvedMedia | null;
  gallery: CaseStudyShot[];
  evidence: CaseStudyShot[];
  systemFlow: string[];
  relatedProducts: CaseStudyProductRef[];
  capabilityItems: ResolvedCapability[];
  related: RelatedWorkCard[];
  previous: RelatedWorkCard | null;
  next: RelatedWorkCard | null;
  seo: ResolvedSeo | null;
}

export interface PublicNavigationItem {
  id: string;
  label: string;
  url: string;
  order: number;
  visibility: string;
  location: string;
}

export interface PublicSiteSettings {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  socialLinks: Record<string, string>;
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getProducts(): Promise<ProductDetail[]> {
  const data = await fetchApi<{ items: PublicProduct[] }>('/products?limit=100');
  if (!data?.items?.length) return getFallbackProducts();
  const details = await Promise.all(data.items.map((p) => getProductBySlug(p.slug)));
  return details.filter((p): p is ProductDetail => p !== null);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const detail = await fetchApi<ProductDetail>(`/products/slug/${slug}`);
  if (detail) return detail;
  return getFallbackProductBySlug(slug);
}

export async function getIndustries(): Promise<IndustryListItem[]> {
  const data = await fetchApi<{ items: PublicIndustry[] }>('/industries?limit=100');
  if (!data?.items?.length) {
    return getFallbackIndustryList().map((item, index) => ({
      id: `fallback-${item.slug}`,
      name: item.name,
      slug: item.slug,
      shortDescription: getFallbackIndustryBySlug(item.slug)?.shortDescription ?? null,
      order: item.order ?? index,
    }));
  }
  return data.items
    .filter((i) => i.status === 'published')
    .map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      shortDescription: i.shortDescription,
      order: i.order,
    }))
    .sort((a, b) => a.order - b.order);
}

export async function getIndustryBySlug(slug: string): Promise<IndustryDetail | null> {
  const detail = await fetchApi<IndustryDetail>(`/industries/slug/${slug}`);
  if (detail) return detail;
  return getFallbackIndustryBySlug(slug);
}

export async function getIndustryDetailList(): Promise<IndustryDetail[]> {
  const list = await getIndustries();
  const details = await Promise.all(list.map((i) => getIndustryBySlug(i.slug)));
  const resolved = details.filter((d): d is IndustryDetail => d !== null && d.status === 'published');
  if (resolved.length > 0) return resolved;
  return getFallbackIndustries();
}

export async function getCaseStudies(): Promise<PublicCaseStudy[]> {
  const data = await fetchApi<{ items: PublicCaseStudy[] }>('/case-studies?limit=100');
  return (data?.items ?? []).filter((item) => item.status === 'published').sort((a, b) => a.order - b.order);
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudyDetail | null> {
  return fetchApi<CaseStudyDetail>(`/case-studies/slug/${slug}`);
}

export function resolveCaseStudySeo(study: CaseStudyDetail, siteBase: string) {
  const canonical = study.seo?.canonicalUrl ?? `${siteBase}/case-studies/${study.slug}`;
  const title = study.seo?.title ?? `${study.title} — Case Study | Novaflow`;
  const description = study.seo?.description ?? study.summary ?? study.challenge ?? '';
  const ogImage = study.seo?.ogImageUrl ?? study.hero?.url ?? study.visual?.url ?? '/images/og-default.jpg';
  return {
    title,
    description,
    ogTitle: study.seo?.ogTitle ?? title,
    ogDescription: study.seo?.ogDescription ?? description,
    ogImage,
    canonical,
  };
}

export async function getNavigation(location?: 'main' | 'footer'): Promise<PublicNavigationItem[]> {
  const data = await fetchApi<{ items: PublicNavigationItem[] }>(`/navigation${location ? `?location=${location}` : ''}`);
  return data?.items ?? [];
}

export async function getSiteSettings(): Promise<PublicSiteSettings | null> {
  return fetchApi<PublicSiteSettings>('/site-settings');
}

export function resolveProductSeo(product: ProductDetail, siteBase: string) {
  const canonical = product.seo?.canonicalUrl ?? `${siteBase}/products/${product.slug}`;
  const title = product.seo?.title ?? `${product.name} | Novaflow`;
  const description = product.seo?.description ?? product.shortDescription ?? product.description ?? '';
  const ogImage = product.seo?.ogImageUrl ?? product.hero?.url ?? '/images/og-default.jpg';
  return {
    title,
    description,
    ogTitle: product.seo?.ogTitle ?? title,
    ogDescription: product.seo?.ogDescription ?? description,
    ogImage,
    canonical,
  };
}

export function productConnects(product: ProductDetail): string[] {
  if (product.capabilityItems.length > 0) {
    return product.capabilityItems.map((c) => c.name);
  }
  return product.features.slice(0, 4);
}

export function resolveIndustrySeo(industry: IndustryDetail, siteBase: string) {
  const canonical = industry.seo?.canonicalUrl ?? `${siteBase}/industries/${industry.slug}`;
  const title = industry.seo?.title ?? `Software Systems for ${industry.name} | Novaflow`;
  const description = industry.seo?.description ?? industry.shortDescription ?? industry.businessContext ?? '';
  const ogImage = industry.seo?.ogImageUrl ?? industry.visual?.url ?? '/images/og-default.jpg';
  return {
    title,
    description,
    ogTitle: industry.seo?.ogTitle ?? title,
    ogDescription: industry.seo?.ogDescription ?? description,
    ogImage,
    canonical,
  };
}

export function industrySystemItems(industry: IndustryDetail): string[] {
  if (industry.systemItems.length > 0) return industry.systemItems;
  return industry.capabilityItems.map((c) => c.name);
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

export interface HomepageHeroSection {
  visible: boolean;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  supportingText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  heroVisual: ResolvedMedia | null;
  mobileHeroVisual: ResolvedMedia | null;
}

export interface HomepageWhatWeBuildSection {
  visible: boolean;
  eyebrow: string;
  headline: string;
  capabilities: ResolvedCapability[];
  desktopVisual: ResolvedMedia | null;
  mobileVisual: ResolvedMedia | null;
}

export interface HomepageProductsSection {
  visible: boolean;
  eyebrow: string;
  headline: string;
  items: ResolvedHomeProduct[];
}

export interface HomepageForBusinessSection {
  visible: boolean;
  eyebrow: string;
  headline: string;
  items: ResolvedHomeIndustry[];
}

export interface HomepageWorkSection {
  visible: boolean;
  eyebrow: string;
  headline: string;
  items: ResolvedHomeCaseStudy[];
}

export interface HomepageAboutSection {
  visible: boolean;
  eyebrow: string;
  headlineLines: string[];
  shortDescription: string;
  metaLine: string;
  linkLabel: string;
  linkUrl: string;
  visual: ResolvedMedia | null;
}

export interface HomepageContactSection {
  visible: boolean;
  eyebrow: string;
  headline: string;
  supportingText: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface HomepageResponse {
  status: string;
  hero: HomepageHeroSection;
  whatWeBuild: HomepageWhatWeBuildSection;
  products: HomepageProductsSection;
  forBusiness: HomepageForBusinessSection;
  work: HomepageWorkSection;
  about: HomepageAboutSection;
  contact: HomepageContactSection;
  seo: ResolvedSeo | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

export async function getHomepage(): Promise<HomepageResponse> {
  const data = await fetchApi<HomepageResponse>('/homepage');
  if (data) return data;
  return getFallbackHomepage();
}

export function resolveHomepageSeo(homepage: HomepageResponse, siteBase: string) {
  const canonical = homepage.seo?.canonicalUrl ?? siteBase;
  const title = homepage.seo?.title ?? 'Novaflow — Software Systems That Run Businesses';
  const description =
    homepage.seo?.description ??
    'Novaflow builds software systems around the way businesses actually work — billing, POS, operations, automation and custom platforms.';
  const ogImage = homepage.seo?.ogImageUrl ?? '/images/og-default.jpg';
  return {
    title,
    description,
    ogTitle: homepage.seo?.ogTitle ?? title,
    ogDescription: homepage.seo?.ogDescription ?? description,
    ogImage,
    canonical,
  };
}

export interface InsightCategory {
  id: string;
  name: string;
  slug: string;
}

export interface InsightListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  featured: boolean;
  order: number;
  status: string;
  category: { id: string; name: string; slug: string } | null;
  hero: ResolvedMedia | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
}

export interface InsightRelated {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  readingTime: number;
}

export interface InsightDocument {
  blocks: Array<Record<string, unknown> & { id: string; type: string }>;
}

export interface InsightArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: InsightDocument;
  tags: string[];
  featured: boolean;
  status: string;
  category: { id: string; name: string; slug: string } | null;
  author: { name: string; role: string | null; slug: string | null };
  hero: ResolvedMedia | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
  related: InsightRelated[];
  relatedProducts: Array<{ id: string; name: string; slug: string; category: string | null }>;
  relatedIndustries: Array<{ id: string; name: string; slug: string }>;
  seo: ResolvedSeo;
  preview?: boolean;
}

export interface InsightsIndexResponse {
  items: InsightListItem[];
  total: number;
  featured: InsightListItem | null;
}

export async function getInsightCategories(): Promise<InsightCategory[]> {
  const data = await fetchApi<{ items: InsightCategory[] }>('/article-categories');
  return data?.items ?? [];
}

export async function getInsightsIndex(params?: { search?: string; category?: string; limit?: number; offset?: number }): Promise<InsightsIndexResponse> {
  const q = new URLSearchParams();
  q.set('limit', String(params?.limit ?? 8));
  q.set('offset', String(params?.offset ?? 0));
  if (params?.search) q.set('search', params.search);
  if (params?.category && params.category !== 'all') q.set('category', params.category);
  const data = await fetchApi<InsightsIndexResponse>(`/articles?${q}`);
  return data ?? { items: [], total: 0, featured: null };
}

export async function getPublishedInsightSlugs(): Promise<string[]> {
  const data = await fetchApi<{ items: Array<{ slug: string; status: string }> }>('/articles?limit=100');
  return (data?.items ?? []).filter((item) => item.status === 'published').map((item) => item.slug);
}

export async function getInsightBySlug(slug: string, preview?: string): Promise<InsightArticle | null> {
  const suffix = preview ? `?preview=${encodeURIComponent(preview)}` : '';
  return fetchApi<InsightArticle>(`/articles/slug/${slug}${suffix}`);
}

export function resolveInsightSeo(article: InsightArticle, siteBase: string) {
  const canonical = article.seo?.canonicalUrl ?? `${siteBase}/insights/${article.slug}`;
  const title = article.seo?.title ?? `${article.title} | Novaflow Insights`;
  const description = article.seo?.description ?? article.excerpt ?? '';
  const ogImage = article.seo?.ogImageUrl ?? article.hero?.url ?? '/images/og-default.jpg';
  return {
    title,
    description,
    ogTitle: article.seo?.ogTitle ?? title,
    ogDescription: article.seo?.ogDescription ?? description,
    ogImage,
    canonical,
  };
}
