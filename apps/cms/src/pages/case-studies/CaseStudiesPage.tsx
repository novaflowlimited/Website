import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, StatusBadge, ConfirmDialog, FormSection } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { ScreenshotManager } from '../../components/ScreenshotManager';
import { CaseStudyPreview } from '../../components/CaseStudyPreview';
import { useToast } from '../../components/ToastProvider';
import type { Capability, CaseStudy, CaseStudyGalleryItem, Product, SeoMetadata } from '../../types';

function normalizeGallery(gallery: CaseStudy['gallery'] | undefined): CaseStudyGalleryItem[] {
  if (!gallery) return [];
  return gallery.map((item, order) => {
    if (typeof item === 'string') {
      return { mediaId: item, caption: null, treatment: 'full', order };
    }
    return {
      mediaId: item.mediaId,
      caption: item.caption ?? null,
      treatment: item.treatment ?? 'full',
      order: item.order ?? order,
    };
  });
}

export function CaseStudiesList() {
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<CaseStudy | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({ queryKey: ['case-studies', search], queryFn: () => api.getCaseStudies({ search: search || undefined, limit: 100 }) });
  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishCaseStudy(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['case-studies'] }); toast.success('Case study published.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: (id: string) => api.unpublishCaseStudy(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['case-studies'] }); toast.success('Case study unpublished.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCaseStudy(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['case-studies'] }); toast.success('Case study deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Case Studies">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Link to="/case-studies/new" className="cms-button cms-button--primary">New Case Study</Link>
      </div>
      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load case studies." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No case studies yet." action={() => window.location.href = '/case-studies/new'} actionLabel="Create case study" /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Title</th><th>Client</th><th>Industry</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
              <tbody>
                {query.data.items.map((cs) => (
                  <tr key={cs.id}>
                    <td><Link to={`/case-studies/${cs.id}/edit`}>{cs.title}</Link></td>
                    <td>{cs.client ?? '—'}</td>
                    <td>{cs.industry ?? '—'}</td>
                    <td><StatusBadge status={cs.status} /></td>
                    <td>{cs.featured ? '★' : '—'}</td>
                    <td className="cms-table__actions">
                      <Link to={`/case-studies/${cs.id}/edit`} className="cms-button cms-button--sm">Edit</Link>
                      {cs.status === 'published' ? (
                        <button className="cms-button cms-button--sm" onClick={() => unpublishMutation.mutate(cs.id)}>Unpublish</button>
                      ) : (
                        <button className="cms-button cms-button--sm" onClick={() => publishMutation.mutate(cs.id)}>Publish</button>
                      )}
                      <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(cs)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      <ConfirmDialog open={!!confirmDelete} title="Delete Case Study" message={<>Delete <strong>{confirmDelete?.title}</strong>?</>} confirmLabel="Delete" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
    </Layout>
  );
}

export function CaseStudyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isNew = id === 'new' || !id;
  const [form, setForm] = useState<Partial<CaseStudy>>({
    title: '',
    slug: '',
    client: '',
    industry: '',
    summary: '',
    challenge: '',
    approach: '',
    solution: '',
    result: '',
    gallery: [],
    products: [],
    capabilities: [],
    featured: false,
    status: 'draft',
    order: 0,
  });
  const [seoForm, setSeoForm] = useState<Partial<SeoMetadata>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const query = useQuery({ queryKey: ['case-study', id], queryFn: () => api.getCaseStudy(id!), enabled: !isNew });
  const productsQuery = useQuery({ queryKey: ['products-all'], queryFn: () => api.getProducts({ limit: 100 }) });
  const capabilitiesQuery = useQuery({ queryKey: ['capabilities-all'], queryFn: () => api.getCapabilities({ limit: 100 }) });

  useEffect(() => {
    if (query.data) {
      setForm({ ...query.data, gallery: normalizeGallery(query.data.gallery) });
      if (query.data.seoId) {
        api.getSeo(query.data.seoId).then(setSeoForm).catch(() => undefined);
      }
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CaseStudy>) => {
      const payload = { ...data, gallery: normalizeGallery(data.gallery) };
      let item = isNew ? await api.createCaseStudy(payload) : await api.updateCaseStudy(id!, payload);
      const hasSeo = seoForm.title || seoForm.description || seoForm.ogImageMediaId || seoForm.canonicalUrl;
      if (hasSeo) {
        if (item.seoId) {
          await api.updateSeo(item.seoId, seoForm);
        } else {
          const seo = await api.createSeo({ entityType: 'case_study', entityId: item.id, ...seoForm });
          item = await api.updateCaseStudy(item.id, { seoId: seo.id });
        }
      }
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['case-study', id] });
      toast.success('Saved successfully.');
      if (isNew) navigate(`/case-studies/${item.id}/edit`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const publishMutation = useMutation({
    mutationFn: () => api.publishCaseStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['case-study', id] });
      toast.success('Published successfully.');
      setConfirmPublish(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishCaseStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['case-study', id] });
      toast.success('Unpublished.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveCaseStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      toast.success('Archived.');
      setConfirmArchive(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isLoading) return <Layout title="Edit Case Study"><LoadingState /></Layout>;
  if (query.isError) return <Layout title="Edit Case Study"><ErrorState message="Unable to load case study." /></Layout>;

  const update = (field: keyof CaseStudy, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleArrayItem = (field: 'products' | 'capabilities', item: string) => {
    const current = (form[field] as string[]) ?? [];
    update(field, current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  };

  const galleryValue = normalizeGallery(form.gallery).map((item) => ({
    mediaId: item.mediaId,
    title: null,
    caption: item.caption ?? null,
    treatment: item.treatment ?? 'full',
    order: item.order,
  }));

  return (
    <Layout title={isNew ? 'New Case Study' : `Edit: ${form.title}`}>
      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="cms-button" onClick={() => setShowPreview((v) => !v)}>{showPreview ? 'Hide Preview' : 'Preview'}</button>
        {!isNew && form.status === 'published' && (
          <button className="cms-button" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>Unpublish</button>
        )}
        {!isNew && form.status !== 'published' && (
          <button className="cms-button" onClick={() => setConfirmPublish(true)}>Publish</button>
        )}
        {!isNew && (
          <button className="cms-button" onClick={() => setConfirmArchive(true)}>Archive</button>
        )}
        <button className="cms-button cms-button--ghost" onClick={() => navigate('/case-studies')}>Back</button>
      </div>

      {showPreview && <CaseStudyPreview study={form} />}

      <FormSection title="General">
        <label className="cms-field"><span className="cms-field__label">Title</span><input className="cms-input" value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Slug</span><input className="cms-input" value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="auto-generated from title" /></label>
        <label className="cms-field"><span className="cms-field__label">Client / project (optional)</span><input className="cms-input" value={form.client ?? ''} onChange={(e) => update('client', e.target.value || null)} /></label>
        <label className="cms-field"><span className="cms-field__label">Category</span><input className="cms-input" value={form.industry ?? ''} onChange={(e) => update('industry', e.target.value || null)} /></label>
        <label className="cms-field"><span className="cms-field__label">Summary (one line)</span><textarea className="cms-input" rows={2} value={form.summary ?? ''} onChange={(e) => update('summary', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Status</span><select className="cms-input" value={form.status ?? 'draft'} onChange={(e) => update('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="cms-field cms-checkbox"><input type="checkbox" checked={form.featured ?? false} onChange={(e) => update('featured', e.target.checked)} /> Featured</label>
        <label className="cms-field"><span className="cms-field__label">Order</span><input type="number" className="cms-input" value={form.order ?? 0} onChange={(e) => update('order', Number(e.target.value))} /></label>
      </FormSection>

      <FormSection title="Story">
        <label className="cms-field"><span className="cms-field__label">Problem</span><textarea className="cms-input" rows={3} value={form.challenge ?? ''} onChange={(e) => update('challenge', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Approach</span><textarea className="cms-input" rows={3} value={form.approach ?? ''} onChange={(e) => update('approach', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">System</span><textarea className="cms-input" rows={3} value={form.solution ?? ''} onChange={(e) => update('solution', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Outcome</span><textarea className="cms-input" rows={3} value={form.result ?? ''} onChange={(e) => update('result', e.target.value)} /></label>
      </FormSection>

      <FormSection title="Media">
        <label className="cms-field"><span className="cms-field__label">Hero Image</span><MediaPicker value={form.heroMediaId ?? null} onChange={(v) => update('heroMediaId', v)} /></label>
        <div className="cms-field">
          <span className="cms-field__label">Project media / screenshots</span>
          <ScreenshotManager
            withTreatment
            value={galleryValue}
            onChange={(items) =>
              update(
                'gallery',
                items.map((item, order) => ({
                  mediaId: item.mediaId,
                  caption: item.caption ?? item.title ?? null,
                  treatment: item.treatment ?? 'full',
                  order,
                })),
              )
            }
          />
        </div>
      </FormSection>

      <FormSection title="Relationships">
        <div className="cms-field">
          <span className="cms-field__label">Related products</span>
          <div className="cms-checkbox-group">
            {productsQuery.data?.items.map((product: Product) => (
              <label key={product.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.products ?? []).includes(product.id)} onChange={() => toggleArrayItem('products', product.id)} />
                {product.name}
              </label>
            ))}
          </div>
        </div>
        <div className="cms-field">
          <span className="cms-field__label">Capabilities</span>
          <div className="cms-checkbox-group">
            {capabilitiesQuery.data?.items.map((cap: Capability) => (
              <label key={cap.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.capabilities ?? []).includes(cap.id)} onChange={() => toggleArrayItem('capabilities', cap.id)} />
                {cap.name}
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="SEO">
        <label className="cms-field"><span className="cms-field__label">SEO Title</span><input className="cms-input" value={seoForm.title ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, title: e.target.value || null }))} placeholder="Leave blank to use default" /></label>
        <label className="cms-field"><span className="cms-field__label">SEO Description</span><textarea className="cms-input" rows={2} value={seoForm.description ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, description: e.target.value || null }))} /></label>
        <label className="cms-field"><span className="cms-field__label">Canonical URL</span><input className="cms-input" value={seoForm.canonicalUrl ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, canonicalUrl: e.target.value || null }))} placeholder={`https://novaflow.co/case-studies/${form.slug ?? 'slug'}`} /></label>
        <label className="cms-field"><span className="cms-field__label">OG Image</span><MediaPicker value={seoForm.ogImageMediaId ?? null} onChange={(v) => setSeoForm((prev) => ({ ...prev, ogImageMediaId: typeof v === 'string' ? v : null }))} /></label>
      </FormSection>

      <ConfirmDialog open={confirmPublish} title="Publish Case Study" message={<>Publish <strong>{form.title}</strong>? It will be visible on the public site.</>} confirmLabel="Publish" onConfirm={() => publishMutation.mutate()} onCancel={() => setConfirmPublish(false)} />
      <ConfirmDialog open={confirmArchive} title="Archive Case Study" message={<>Archive <strong>{form.title}</strong>?</>} confirmLabel="Archive" onConfirm={() => archiveMutation.mutate()} onCancel={() => setConfirmArchive(false)} />
    </Layout>
  );
}
