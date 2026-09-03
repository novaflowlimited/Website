import type {
  Product,
  Industry,
  Capability,
  CaseStudy,
  Article,
  ArticleListItem,
  ArticleCategory,
  ArticleAuthor,
  Media,
  NavigationItem,
  SiteSettings,
  SeoMetadata,
  Lead,
  ActivityLogEntry,
  DashboardStats,
  PaginatedResponse,
  SearchResults,
  SessionUser,
  HomepageContent,
  HomepageEditorState,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: SessionUser }>('/auth/me'),

  // Dashboard
  getStats: () => request<DashboardStats>('/dashboard/stats'),
  getRecentActivity: (limit = 10) =>
    request<{ items: ActivityLogEntry[] }>(`/dashboard/recent-activity?limit=${limit}`),

  // Products
  getProducts: (params?: { search?: string; status?: string; category?: string; sort?: string; order?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<Product>>(`/products?${q}`);
  },
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  createProduct: (data: Partial<Product>) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publishProduct: (id: string) => request<Product>(`/products/${id}/publish`, { method: 'POST' }),
  unpublishProduct: (id: string) => request<Product>(`/products/${id}/unpublish`, { method: 'POST' }),
  archiveProduct: (id: string) => request<Product>(`/products/${id}/archive`, { method: 'POST' }),
  deleteProduct: (id: string) => request<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),

  // Industries
  getIndustries: (params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<Industry>>(`/industries?${q}`);
  },
  getIndustry: (id: string) => request<Industry>(`/industries/${id}`),
  createIndustry: (data: Partial<Industry>) =>
    request<Industry>('/industries', { method: 'POST', body: JSON.stringify(data) }),
  updateIndustry: (id: string, data: Partial<Industry>) =>
    request<Industry>(`/industries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publishIndustry: (id: string) => request<Industry>(`/industries/${id}/publish`, { method: 'POST' }),
  unpublishIndustry: (id: string) => request<Industry>(`/industries/${id}/unpublish`, { method: 'POST' }),
  archiveIndustry: (id: string) => request<Industry>(`/industries/${id}/archive`, { method: 'POST' }),
  deleteIndustry: (id: string) => request<{ ok: true }>(`/industries/${id}`, { method: 'DELETE' }),

  // Capabilities
  getCapabilities: (params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<Capability>>(`/capabilities?${q}`);
  },
  getCapability: (id: string) => request<Capability>(`/capabilities/${id}`),
  createCapability: (data: Partial<Capability>) =>
    request<Capability>('/capabilities', { method: 'POST', body: JSON.stringify(data) }),
  updateCapability: (id: string, data: Partial<Capability>) =>
    request<Capability>(`/capabilities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publishCapability: (id: string) => request<Capability>(`/capabilities/${id}/publish`, { method: 'POST' }),
  unpublishCapability: (id: string) => request<Capability>(`/capabilities/${id}/unpublish`, { method: 'POST' }),
  deleteCapability: (id: string) => request<{ ok: true }>(`/capabilities/${id}`, { method: 'DELETE' }),

  // Case Studies
  getCaseStudies: (params?: { search?: string; status?: string; featured?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<CaseStudy>>(`/case-studies?${q}`);
  },
  getCaseStudy: (id: string) => request<CaseStudy>(`/case-studies/${id}`),
  createCaseStudy: (data: Partial<CaseStudy>) =>
    request<CaseStudy>('/case-studies', { method: 'POST', body: JSON.stringify(data) }),
  updateCaseStudy: (id: string, data: Partial<CaseStudy>) =>
    request<CaseStudy>(`/case-studies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publishCaseStudy: (id: string) => request<CaseStudy>(`/case-studies/${id}/publish`, { method: 'POST' }),
  unpublishCaseStudy: (id: string) => request<CaseStudy>(`/case-studies/${id}/unpublish`, { method: 'POST' }),
  archiveCaseStudy: (id: string) => request<CaseStudy>(`/case-studies/${id}/archive`, { method: 'POST' }),
  deleteCaseStudy: (id: string) => request<{ ok: true }>(`/case-studies/${id}`, { method: 'DELETE' }),

  // Insights
  getArticles: (params?: { search?: string; status?: string; category?: string; featured?: string; sort?: string; order?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<{ items: ArticleListItem[]; total: number; featured: ArticleListItem | null }>(`/articles?${q}`);
  },
  getArticle: (id: string) => request<Article>(`/articles/${id}`),
  createArticle: (data: Partial<Article>) =>
    request<Article>('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id: string, data: Partial<Article>) =>
    request<Article>(`/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publishArticle: (id: string) => request<Article>(`/articles/${id}/publish`, { method: 'POST' }),
  unpublishArticle: (id: string) => request<Article>(`/articles/${id}/unpublish`, { method: 'POST' }),
  archiveArticle: (id: string) => request<Article>(`/articles/${id}/archive`, { method: 'POST' }),
  deleteArticle: (id: string) => request<{ ok: true }>(`/articles/${id}`, { method: 'DELETE' }),
  getArticleCategories: () => request<{ items: ArticleCategory[] }>('/article-categories'),
  createArticleCategory: (data: Partial<ArticleCategory>) =>
    request<ArticleCategory>('/article-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateArticleCategory: (id: string, data: Partial<ArticleCategory>) =>
    request<ArticleCategory>(`/article-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteArticleCategory: (id: string) => request<{ ok: true }>(`/article-categories/${id}`, { method: 'DELETE' }),
  getArticleAuthors: () => request<{ items: ArticleAuthor[] }>('/article-authors'),
  createArticleAuthor: (data: Partial<ArticleAuthor>) =>
    request<ArticleAuthor>('/article-authors', { method: 'POST', body: JSON.stringify(data) }),
  updateArticleAuthor: (id: string, data: Partial<ArticleAuthor>) =>
    request<ArticleAuthor>(`/article-authors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteArticleAuthor: (id: string) => request<{ ok: true }>(`/article-authors/${id}`, { method: 'DELETE' }),

  // Media
  getMedia: (params?: { search?: string; type?: string; sort?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<Media>>(`/media?${q}`);
  },
  getMediaItem: (id: string) => request<Media>(`/media/${id}`),
  uploadMedia: (file: File, meta?: { altText?: string; title?: string; type?: string; decorative?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (meta) Object.entries(meta).forEach(([k, v]) => v !== undefined && formData.append(k, String(v)));
    return request<Media>('/media/upload', { method: 'POST', body: formData });
  },
  updateMedia: (id: string, data: Partial<Media>) =>
    request<Media>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  replaceMedia: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Media>(`/media/${id}/replace`, { method: 'POST', body: formData });
  },
  deleteMedia: (id: string) => request<{ ok: true }>(`/media/${id}`, { method: 'DELETE' }),

  // Navigation
  getNavigation: (location?: string) => {
    const q = new URLSearchParams();
    if (location) q.set('location', location);
    return request<{ items: NavigationItem[] }>(`/navigation?${q}`);
  },
  createNavigationItem: (data: Partial<NavigationItem>) =>
    request<NavigationItem>('/navigation', { method: 'POST', body: JSON.stringify(data) }),
  updateNavigationItem: (id: string, data: Partial<NavigationItem>) =>
    request<NavigationItem>(`/navigation/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNavigationItem: (id: string) => request<{ ok: true }>(`/navigation/${id}`, { method: 'DELETE' }),

  // Site Settings
  getSiteSettings: () => request<SiteSettings>('/site-settings'),
  updateSiteSettings: (data: Partial<SiteSettings>) =>
    request<SiteSettings>('/site-settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // SEO
  getSeoEntries: () => request<{ items: SeoMetadata[] }>('/seo'),
  getDefaultSeo: () => request<SeoMetadata | null>('/seo/default'),
  getSeo: (id: string) => request<SeoMetadata>(`/seo/${id}`),
  createSeo: (data: Partial<SeoMetadata>) =>
    request<SeoMetadata>('/seo', { method: 'POST', body: JSON.stringify(data) }),
  updateSeo: (id: string, data: Partial<SeoMetadata>) =>
    request<SeoMetadata>(`/seo/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSeo: (id: string) => request<{ ok: true }>(`/seo/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: (params?: { status?: string; search?: string; sort?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && q.set(k, String(v)));
    return request<PaginatedResponse<Lead>>(`/leads?${q}`);
  },
  getLead: (id: string) => request<Lead>(`/leads/${id}`),
  updateLeadStatus: (id: string, status: string) =>
    request<Lead>(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateLead: (id: string, data: { internalNotes?: string | null }) =>
    request<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Activity
  getActivity: (limit = 20) => request<{ items: ActivityLogEntry[] }>(`/activity?limit=${limit}`),

  // Search
  search: (q: string) => request<SearchResults>(`/search?q=${encodeURIComponent(q)}`),

  // Homepage
  getHomepageEditor: () => request<HomepageEditorState>('/homepage/editor'),
  updateHomepage: (draftContent: HomepageContent) =>
    request<Pick<HomepageEditorState, 'id' | 'status' | 'draftContent' | 'hasUnpublishedChanges' | 'changedSections'>>(
      '/homepage',
      { method: 'PATCH', body: JSON.stringify({ draftContent }) },
    ),
  publishHomepage: () => request<{ status: string }>('/homepage/publish', { method: 'POST' }),
  unpublishHomepage: () => request<{ status: string }>('/homepage/unpublish', { method: 'POST' }),
};
