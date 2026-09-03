// Shared CMS types — mirror the API/database schema in camelCase

export type ContentStatus = 'draft' | 'published' | 'archived';
export type UserRole = 'admin' | 'editor';
export type LeadStatus = 'new' | 'reviewing' | 'contacted' | 'qualified' | 'closed' | 'in_progress';
export type NavigationLocation = 'main' | 'footer';
export type NavigationVisibility = 'visible' | 'hidden';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ProductScreenshot {
  mediaId: string;
  title?: string | null;
  caption?: string | null;
  treatment?: 'full' | 'detail' | 'pair';
  order: number;
}

export interface CaseStudyGalleryItem {
  mediaId: string;
  caption?: string | null;
  treatment?: 'full' | 'detail' | 'pair';
  order: number;
}

export interface Product {
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
  capabilities: string[];
  industries: string[];
  logoMediaId: string | null;
  heroMediaId: string | null;
  screenshots: ProductScreenshot[];
  status: ContentStatus;
  order: number;
  seoId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  businessContext: string | null;
  challengeHeadline: string | null;
  challenge: string | null;
  systemDescription: string | null;
  systemItems: string[];
  visualMediaId: string | null;
  mobileVisualMediaId: string | null;
  relatedProducts: string[];
  relatedCapabilities: string[];
  order: number;
  status: ContentStatus;
  seoId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Capability {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  order: number;
  status: ContentStatus;
  seoId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudy {
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
  heroMediaId: string | null;
  gallery: Array<string | CaseStudyGalleryItem>;
  products: string[];
  capabilities: string[];
  testimonial: string | null;
  featured: boolean;
  order: number;
  status: ContentStatus;
  seoId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type ArticleBlock =
  | { id: string; type: 'heading'; level: 2 | 3; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'quote'; text: string; attribution?: string | null }
  | { id: string; type: 'list'; ordered: boolean; items: string[] }
  | { id: string; type: 'code'; language?: string | null; code: string }
  | { id: string; type: 'image'; mediaId: string; caption?: string | null; layout: 'inline' | 'full' }
  | { id: string; type: 'table'; headers: string[]; rows: string[][] };

export interface ArticleDocument {
  blocks: ArticleBlock[];
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleAuthor {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  bio: string | null;
  photoMediaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  featured: boolean;
  order: number;
  status: ContentStatus;
  category: { id: string; name: string; slug: string } | null;
  hero: { id: string; url: string; altText: string | null; title: string } | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: ArticleDocument;
  heroMediaId: string | null;
  categoryId: string | null;
  tags: string[];
  authorId: string | null;
  featured: boolean;
  order: number;
  status: ContentStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageMediaId: string | null;
  relatedProductIds: string[];
  relatedIndustryIds: string[];
  previewToken: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Media {
  id: string;
  filename: string;
  title: string;
  altText: string | null;
  decorative: boolean;
  type: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  r2Key: string;
  r2Url: string;
  thumbnailUrl: string | null;
  focalX: number;
  focalY: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  references?: Array<{ entityType: string; entityId: string; entityName: string }>;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  order: number;
  visibility: NavigationVisibility;
  location: NavigationLocation;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  id: string;
  companyName: string;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  socialLinks: Record<string, string>;
  defaultSeoId: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SeoMetadata {
  id: string;
  entityType: string;
  entityId: string | null;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageMediaId: string | null;
  canonicalUrl: string | null;
  twitterCard: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  message: string;
  source: string | null;
  internalNotes: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  products: number;
  industries: number;
  caseStudies: number;
  capabilities: number;
  articles: number;
  media: number;
  drafts: number;
  published: number;
  newEnquiries: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface SearchResults {
  results: Array<{ id: string; name: string; type: string; slug: string }>;
}

export interface HomepageHeroContent {
  visible: boolean;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  supportingText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  heroVisualMediaId: string | null;
  mobileHeroVisualMediaId: string | null;
}

export interface HomepageWhatWeBuildContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  capabilityIds: string[];
  desktopVisualMediaId: string | null;
  mobileVisualMediaId: string | null;
}

export interface HomepageProductsContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredProductIds: string[];
}

export interface HomepageForBusinessContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredIndustryIds: string[];
}

export interface HomepageWorkContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  featuredCaseStudyIds: string[];
}

export interface HomepageAboutContent {
  visible: boolean;
  eyebrow: string;
  headlineLines: string[];
  shortDescription: string;
  metaLine: string;
  visualMediaId: string | null;
  linkLabel: string;
  linkUrl: string;
}

export interface HomepageContactContent {
  visible: boolean;
  eyebrow: string;
  headline: string;
  supportingText: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface HomepageContent {
  hero: HomepageHeroContent;
  whatWeBuild: HomepageWhatWeBuildContent;
  products: HomepageProductsContent;
  forBusiness: HomepageForBusinessContent;
  work: HomepageWorkContent;
  about: HomepageAboutContent;
  contact: HomepageContactContent;
}

export interface HomepageEditorState {
  id: string;
  status: ContentStatus;
  draftContent: HomepageContent;
  publishedContent: HomepageContent | null;
  hasUnpublishedChanges: boolean;
  changedSections: string[];
  updatedAt: string;
  publishedAt: string | null;
}
