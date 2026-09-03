import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { ConfirmDialog, ErrorState, EmptyState, FormSection, LoadingState, StatusBadge } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { ArticleBodyEditor } from '../../components/ArticleBodyEditor';
import { ArticlePreview, categoryLabel } from '../../components/ArticlePreview';
import { useToast } from '../../components/ToastProvider';
import type { Article, ArticleListItem } from '../../types';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321';

export function ArticlesList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(0);
  const [confirmArchive, setConfirmArchive] = useState<ArticleListItem | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const limit = 20;

  const categoriesQuery = useQuery({ queryKey: ['article-categories'], queryFn: () => api.getArticleCategories() });
  const query = useQuery({
    queryKey: ['articles', search, statusFilter, categoryFilter, featuredFilter, sort, page],
    queryFn: () =>
      api.getArticles({
        search: search || undefined,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter === 'all' ? undefined : featuredFilter,
        sort,
        order: 'desc',
        limit,
        offset: page * limit,
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishArticle(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['articles'] }); toast.success('Article published.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.archiveArticle(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['articles'] }); toast.success('Article archived.'); setConfirmArchive(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Insights">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search title, excerpt, tags…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select className="cms-input cms-toolbar__filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select className="cms-input cms-toolbar__filter" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
          <option value="all">All categories</option>
          {categoriesQuery.data?.items.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select className="cms-input cms-toolbar__filter" value={featuredFilter} onChange={(e) => { setFeaturedFilter(e.target.value); setPage(0); }}>
          <option value="all">Featured: any</option>
          <option value="true">Featured</option>
          <option value="false">Not featured</option>
        </select>
        <select className="cms-input cms-toolbar__filter" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="updated">Sort: updated</option>
          <option value="published">Sort: published</option>
          <option value="title">Sort: title</option>
          <option value="featured">Sort: featured order</option>
        </select>
        <Link to="/insights/new" className="cms-button cms-button--primary">New article</Link>
      </div>
      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load articles." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No articles yet." action={() => { window.location.href = '/insights/new'; }} actionLabel="Create article" /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((article) => (
                  <tr key={article.id}>
                    <td><Link to={`/insights/${article.id}/edit`}>{article.title}</Link></td>
                    <td>{article.category?.name ?? '—'}</td>
                    <td><StatusBadge status={article.status} /></td>
                    <td>{article.featured ? 'Yes' : '—'}</td>
                    <td>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}</td>
                    <td>{new Date(article.updatedAt).toLocaleDateString()}</td>
                    <td className="cms-table__actions">
                      <Link to={`/insights/${article.id}/edit`} className="cms-button cms-button--sm">Edit</Link>
                      {article.status === 'published' ? (
                        <a className="cms-button cms-button--sm" href={`${WEBSITE_URL}/insights/${article.slug}`} target="_blank" rel="noreferrer">Preview</a>
                      ) : (
                        <Link to={`/insights/${article.id}/edit?preview=1`} className="cms-button cms-button--sm">Preview</Link>
                      )}
                      {article.status === 'published' ? null : (
                        <button className="cms-button cms-button--sm" onClick={() => publishMutation.mutate(article.id)}>Publish</button>
                      )}
                      <button className="cms-button cms-button--sm" onClick={() => setConfirmArchive(article)}>Archive</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
        {query.data && query.data.total > limit && (
          <div className="cms-pagination">
            <button className="cms-button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.ceil(query.data.total / limit)}</span>
            <button className="cms-button" disabled={(page + 1) * limit >= query.data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={!!confirmArchive}
        title="Archive article"
        message={<>Archive <strong>{confirmArchive?.title}</strong>? It will leave the public Insights index.</>}
        confirmLabel="Archive"
        onConfirm={() => confirmArchive && archiveMutation.mutate(confirmArchive.id)}
        onCancel={() => setConfirmArchive(null)}
      />
    </Layout>
  );
}

export function ArticleEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isNew = id === 'new' || !id;
  const [showPreview, setShowPreview] = useState(searchParams.get('preview') === '1');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [form, setForm] = useState<Partial<Article>>({
    title: '',
    slug: '',
    excerpt: '',
    content: { blocks: [] },
    heroMediaId: null,
    categoryId: null,
    tags: [],
    authorId: null,
    featured: false,
    order: 0,
    status: 'draft',
    seoTitle: '',
    seoDescription: '',
    ogImageMediaId: null,
    relatedProductIds: [],
    relatedIndustryIds: [],
  });
  const [tagText, setTagText] = useState('');

  const articleQuery = useQuery({ queryKey: ['article', id], queryFn: () => api.getArticle(id!), enabled: !isNew });
  const categoriesQuery = useQuery({ queryKey: ['article-categories'], queryFn: () => api.getArticleCategories() });
  const authorsQuery = useQuery({ queryKey: ['article-authors'], queryFn: () => api.getArticleAuthors() });
  const productsQuery = useQuery({ queryKey: ['products-all'], queryFn: () => api.getProducts({ limit: 100, status: 'published' }) });
  const industriesQuery = useQuery({ queryKey: ['industries-all'], queryFn: () => api.getIndustries({ limit: 100, status: 'published' }) });

  useEffect(() => {
    if (articleQuery.data) {
      setForm(articleQuery.data);
      setTagText((articleQuery.data.tags ?? []).join(', '));
    }
  }, [articleQuery.data]);

  const update = (field: keyof Article, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const payload = (): Partial<Article> => ({
    ...form,
    tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
    content: form.content ?? { blocks: [] },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Article>) => (isNew ? api.createArticle(data) : api.updateArticle(id!, data)),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success(isNew ? 'Draft created.' : 'Draft saved.');
      if (isNew) navigate(`/insights/${article.id}/edit`);
      else queryClient.invalidateQueries({ queryKey: ['article', id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const publishMutation = useMutation({
    mutationFn: () => api.publishArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', id] });
      toast.success('Published.');
      setConfirmPublish(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', id] });
      toast.success('Unpublished.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Archived.');
      setConfirmArchive(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (articleQuery.isLoading) return <Layout title="Edit article"><LoadingState /></Layout>;
  if (articleQuery.isError) return <Layout title="Edit article"><ErrorState message="Unable to load article." /></Layout>;

  const toggleId = (field: 'relatedProductIds' | 'relatedIndustryIds', value: string) => {
    const current = form[field] ?? [];
    update(field, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const publishedLocal = form.publishedAt ? form.publishedAt.slice(0, 16) : '';

  return (
    <Layout title={isNew ? 'New article' : `Edit: ${form.title || 'Article'}`}>
      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" onClick={() => saveMutation.mutate(payload())} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="cms-button" onClick={() => setShowPreview((v) => !v)}>{showPreview ? 'Hide Preview' : 'Preview'}</button>
        {!isNew && form.status === 'published' && (
          <button className="cms-button" onClick={() => unpublishMutation.mutate()}>Unpublish</button>
        )}
        {!isNew && form.status !== 'published' && (
          <button className="cms-button" onClick={() => setConfirmPublish(true)}>Publish</button>
        )}
        {!isNew && <button className="cms-button" onClick={() => setConfirmArchive(true)}>Archive</button>}
        <button className="cms-button cms-button--ghost" onClick={() => navigate('/insights')}>Back</button>
      </div>

      {showPreview && (
        <ArticlePreview
          article={{ ...form, tags: payload().tags }}
          categoryName={categoryLabel(categoriesQuery.data?.items ?? [], form.categoryId)}
        />
      )}

      <FormSection title="Content">
        <label className="cms-field"><span className="cms-field__label">Title</span><input className="cms-input" value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Slug</span><input className="cms-input" value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="auto-generated from title" /></label>
        <label className="cms-field"><span className="cms-field__label">Excerpt</span><textarea className="cms-input" rows={3} value={form.excerpt ?? ''} onChange={(e) => update('excerpt', e.target.value)} /></label>
        <label className="cms-field">
          <span className="cms-field__label">Category</span>
          <select className="cms-input" value={form.categoryId ?? ''} onChange={(e) => update('categoryId', e.target.value || null)}>
            <option value="">Select category</option>
            {categoriesQuery.data?.items.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="cms-field"><span className="cms-field__label">Tags</span><input className="cms-input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="systems, billing, operations" /></label>
        <label className="cms-field">
          <span className="cms-field__label">Author</span>
          <select className="cms-input" value={form.authorId ?? ''} onChange={(e) => update('authorId', e.target.value || null)}>
            <option value="">Novaflow (publication)</option>
            {authorsQuery.data?.items.map((author) => (
              <option key={author.id} value={author.id}>{author.name}</option>
            ))}
          </select>
          <span className="cms-field__hint">Leave empty to publish as NOVAFLOW. Do not invent authors.</span>
        </label>
        <div className="cms-field">
          <span className="cms-field__label">Related products</span>
          <div className="cms-checkbox-group">
            {productsQuery.data?.items.map((product) => (
              <label key={product.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.relatedProductIds ?? []).includes(product.id)} onChange={() => toggleId('relatedProductIds', product.id)} />
                {product.name}
              </label>
            ))}
          </div>
        </div>
        <div className="cms-field">
          <span className="cms-field__label">Related industries</span>
          <div className="cms-checkbox-group">
            {industriesQuery.data?.items.map((industry) => (
              <label key={industry.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.relatedIndustryIds ?? []).includes(industry.id)} onChange={() => toggleId('relatedIndustryIds', industry.id)} />
                {industry.name}
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Body">
        <ArticleBodyEditor value={form.content ?? { blocks: [] }} onChange={(content) => update('content', content)} />
      </FormSection>

      <FormSection title="Media">
        <label className="cms-field">
          <span className="cms-field__label">Hero image</span>
          <MediaPicker value={form.heroMediaId ?? null} onChange={(v) => update('heroMediaId', typeof v === 'string' ? v : null)} />
        </label>
        <p className="cms-field__hint">Inline images are added as body blocks from the Media Library.</p>
      </FormSection>

      <FormSection title="Publishing">
        <label className="cms-field">
          <span className="cms-field__label">Status</span>
          <input className="cms-input" value={form.status ?? 'draft'} readOnly />
        </label>
        <label className="cms-checkbox">
          <input type="checkbox" checked={form.featured ?? false} onChange={(e) => update('featured', e.target.checked)} /> Featured
        </label>
        {form.featured && (
          <label className="cms-field">
            <span className="cms-field__label">Featured order</span>
            <input type="number" className="cms-input" value={form.order ?? 0} onChange={(e) => update('order', Number(e.target.value))} />
            <span className="cms-field__hint">Only used for featured placement. Chronology still follows published date.</span>
          </label>
        )}
        <label className="cms-field">
          <span className="cms-field__label">Published date</span>
          <input
            type="datetime-local"
            className="cms-input"
            value={publishedLocal}
            onChange={(e) => update('publishedAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </label>
      </FormSection>

      <FormSection title="SEO">
        <label className="cms-field"><span className="cms-field__label">SEO title</span><input className="cms-input" value={form.seoTitle ?? ''} onChange={(e) => update('seoTitle', e.target.value || null)} /></label>
        <label className="cms-field"><span className="cms-field__label">SEO description</span><textarea className="cms-input" rows={2} value={form.seoDescription ?? ''} onChange={(e) => update('seoDescription', e.target.value || null)} /></label>
        <label className="cms-field">
          <span className="cms-field__label">OG image</span>
          <MediaPicker value={form.ogImageMediaId ?? null} onChange={(v) => update('ogImageMediaId', typeof v === 'string' ? v : null)} />
        </label>
      </FormSection>

      <ConfirmDialog open={confirmPublish} title="Publish article" message={<>Publish <strong>{form.title}</strong> to /insights?</>} confirmLabel="Publish" onConfirm={() => publishMutation.mutate()} onCancel={() => setConfirmPublish(false)} />
      <ConfirmDialog open={confirmArchive} title="Archive article" message={<>Archive <strong>{form.title}</strong>?</>} confirmLabel="Archive" onConfirm={() => archiveMutation.mutate()} onCancel={() => setConfirmArchive(false)} />
    </Layout>
  );
}
