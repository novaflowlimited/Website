import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, StatusBadge, ConfirmDialog, FormSection } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { IndustryPreview } from '../../components/IndustryPreview';
import { useToast } from '../../components/ToastProvider';
import type { Industry, Product, Capability, SeoMetadata } from '../../types';

function linesToArray(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function arrayToLines(items: string[] | undefined): string {
  return (items ?? []).join('\n');
}

export function IndustriesList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<Industry | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ['industries', search, statusFilter],
    queryFn: () => api.getIndustries({ search: search || undefined, status: statusFilter, limit: 100 }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishIndustry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); toast.success('Industry published.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: (id: string) => api.unpublishIndustry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); toast.success('Industry unpublished.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteIndustry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); toast.success('Industry deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Industries">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search industries…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="cms-input cms-toolbar__filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <Link to="/industries/new" className="cms-button cms-button--primary">New Industry</Link>
      </div>

      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load industries." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No industries yet." action={() => window.location.href = '/industries/new'} actionLabel="Create industry" /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Industry</th><th>Status</th><th>Products</th><th>Updated</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {query.data.items.map((ind) => (
                  <tr key={ind.id}>
                    <td><Link to={`/industries/${ind.id}/edit`}>{ind.name}</Link></td>
                    <td><StatusBadge status={ind.status} /></td>
                    <td>{ind.relatedProducts.length}</td>
                    <td>{new Date(ind.updatedAt).toLocaleDateString()}</td>
                    <td>{ind.order}</td>
                    <td className="cms-table__actions">
                      <Link to={`/industries/${ind.id}/edit`} className="cms-button cms-button--sm">Edit</Link>
                      {ind.status === 'published' ? (
                        <button className="cms-button cms-button--sm" onClick={() => unpublishMutation.mutate(ind.id)}>Unpublish</button>
                      ) : (
                        <button className="cms-button cms-button--sm" onClick={() => publishMutation.mutate(ind.id)}>Publish</button>
                      )}
                      <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(ind)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>

      <ConfirmDialog open={!!confirmDelete} title="Delete Industry" message={<>Delete <strong>{confirmDelete?.name}</strong>?</>} confirmLabel="Delete" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
    </Layout>
  );
}

export function IndustryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<Partial<Industry>>({
    name: '', slug: '', shortDescription: '', businessContext: '', challengeHeadline: '', challenge: '',
    systemDescription: '', systemItems: [], relatedProducts: [], relatedCapabilities: [], status: 'draft', order: 0,
  });
  const [systemItemsText, setSystemItemsText] = useState('');
  const [seoForm, setSeoForm] = useState<Partial<SeoMetadata>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const query = useQuery({ queryKey: ['industry', id], queryFn: () => api.getIndustry(id!), enabled: !isNew });
  const productsQuery = useQuery({ queryKey: ['products-all'], queryFn: () => api.getProducts({ limit: 100 }) });
  const capabilitiesQuery = useQuery({ queryKey: ['capabilities-all'], queryFn: () => api.getCapabilities({ limit: 100 }) });

  useEffect(() => {
    if (query.data) {
      setForm(query.data);
      setSystemItemsText(arrayToLines(query.data.systemItems));
      if (query.data.seoId) {
        api.getSeo(query.data.seoId).then(setSeoForm).catch(() => undefined);
      }
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Industry>) => {
      const payload = { ...data, systemItems: linesToArray(systemItemsText) };
      let industry = isNew ? await api.createIndustry(payload) : await api.updateIndustry(id!, payload);

      const hasSeo = seoForm.title || seoForm.description || seoForm.ogImageMediaId || seoForm.canonicalUrl;
      if (hasSeo) {
        if (industry.seoId) {
          await api.updateSeo(industry.seoId, seoForm);
        } else {
          const seo = await api.createSeo({ entityType: 'industry', entityId: industry.id, ...seoForm });
          industry = await api.updateIndustry(industry.id, { seoId: seo.id });
        }
      }
      return industry;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      toast.success('Saved successfully.');
      if (isNew) navigate(`/industries/${item.id}/edit`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishIndustry(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); queryClient.invalidateQueries({ queryKey: ['industry', id] }); toast.success('Published.'); setConfirmPublish(false); },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishIndustry(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); queryClient.invalidateQueries({ queryKey: ['industry', id] }); toast.success('Unpublished.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveIndustry(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['industries'] }); toast.success('Archived.'); setConfirmArchive(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isLoading) return <Layout title="Edit Industry"><LoadingState /></Layout>;
  if (query.isError) return <Layout title="Edit Industry"><ErrorState message="Unable to load industry." /></Layout>;

  const update = (field: keyof Industry, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleArrayItem = (field: 'relatedProducts' | 'relatedCapabilities', item: string) => {
    const current = (form[field] as string[]) ?? [];
    update(field, current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  };

  const previewIndustry: Partial<Industry> = { ...form, systemItems: linesToArray(systemItemsText) };

  return (
    <Layout title={isNew ? 'New Industry' : `Edit: ${form.name}`}>
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
        <button className="cms-button cms-button--ghost" onClick={() => navigate('/industries')}>Back</button>
      </div>

      {showPreview && <IndustryPreview industry={previewIndustry} />}

      <FormSection title="General">
        <label className="cms-field"><span className="cms-field__label">Name</span><input className="cms-input" value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Slug</span><input className="cms-input" value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Short Description / Hero Statement</span><textarea className="cms-input" rows={2} value={form.shortDescription ?? ''} onChange={(e) => update('shortDescription', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Status</span><select className="cms-input" value={form.status ?? 'draft'} onChange={(e) => update('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="cms-field"><span className="cms-field__label">Order</span><input type="number" className="cms-input" value={form.order ?? 0} onChange={(e) => update('order', Number(e.target.value))} /></label>
      </FormSection>

      <FormSection title="Content">
        <label className="cms-field"><span className="cms-field__label">The Business</span><textarea className="cms-input" rows={3} value={form.businessContext ?? ''} onChange={(e) => update('businessContext', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Challenge Headline (one line per row)</span><textarea className="cms-input" rows={3} value={form.challengeHeadline ?? ''} onChange={(e) => update('challengeHeadline', e.target.value)} placeholder="OPERATIONS&#10;BECOME&#10;FRAGMENTED." /></label>
        <label className="cms-field"><span className="cms-field__label">Challenge Explanation</span><textarea className="cms-input" rows={3} value={form.challenge ?? ''} onChange={(e) => update('challenge', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">System Description</span><textarea className="cms-input" rows={3} value={form.systemDescription ?? ''} onChange={(e) => update('systemDescription', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">System Items (one per line)</span><textarea className="cms-input" rows={5} value={systemItemsText} onChange={(e) => setSystemItemsText(e.target.value)} placeholder="POS&#10;Inventory&#10;Payments" /></label>
      </FormSection>

      <FormSection title="Media">
        <label className="cms-field"><span className="cms-field__label">Main Visual</span><MediaPicker value={form.visualMediaId ?? null} onChange={(v) => update('visualMediaId', v)} /></label>
        <label className="cms-field"><span className="cms-field__label">Mobile Visual</span><MediaPicker value={form.mobileVisualMediaId ?? null} onChange={(v) => update('mobileVisualMediaId', v)} /></label>
      </FormSection>

      <FormSection title="Relationships">
        <div className="cms-field">
          <span className="cms-field__label">Related Products</span>
          <div className="cms-checkbox-group">
            {productsQuery.data?.items.map((product: Product) => (
              <label key={product.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.relatedProducts ?? []).includes(product.id)} onChange={() => toggleArrayItem('relatedProducts', product.id)} />
                {product.name}
              </label>
            ))}
          </div>
        </div>
        <div className="cms-field">
          <span className="cms-field__label">Related Capabilities</span>
          <div className="cms-checkbox-group">
            {capabilitiesQuery.data?.items.map((cap: Capability) => (
              <label key={cap.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.relatedCapabilities ?? []).includes(cap.id)} onChange={() => toggleArrayItem('relatedCapabilities', cap.id)} />
                {cap.name}
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="SEO">
        <label className="cms-field"><span className="cms-field__label">SEO Title</span><input className="cms-input" value={seoForm.title ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, title: e.target.value || null }))} placeholder="Leave blank to use default" /></label>
        <label className="cms-field"><span className="cms-field__label">SEO Description</span><textarea className="cms-input" rows={2} value={seoForm.description ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, description: e.target.value || null }))} /></label>
        <label className="cms-field"><span className="cms-field__label">Canonical URL</span><input className="cms-input" value={seoForm.canonicalUrl ?? ''} onChange={(e) => setSeoForm((prev) => ({ ...prev, canonicalUrl: e.target.value || null }))} placeholder={`https://novaflow.co/industries/${form.slug ?? 'slug'}`} /></label>
        <label className="cms-field"><span className="cms-field__label">OG Image</span><MediaPicker value={seoForm.ogImageMediaId ?? null} onChange={(v) => setSeoForm((prev) => ({ ...prev, ogImageMediaId: typeof v === 'string' ? v : null }))} /></label>
      </FormSection>

      <ConfirmDialog open={confirmPublish} title="Publish Industry" message={<>Publish <strong>{form.name}</strong>? It will appear on the public site.</>} confirmLabel="Publish" onConfirm={() => publishMutation.mutate()} onCancel={() => setConfirmPublish(false)} />
      <ConfirmDialog open={confirmArchive} title="Archive Industry" message={<>Archive <strong>{form.name}</strong>?</>} confirmLabel="Archive" onConfirm={() => archiveMutation.mutate()} onCancel={() => setConfirmArchive(false)} />
    </Layout>
  );
}
