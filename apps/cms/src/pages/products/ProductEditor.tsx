import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { FormSection, LoadingState, ErrorState, ConfirmDialog } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { ScreenshotManager } from '../../components/ScreenshotManager';
import { ProductPreview } from '../../components/ProductPreview';
import { useToast } from '../../components/ToastProvider';
import type { Product, Capability, Industry, SeoMetadata } from '../../types';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(items: string[] | undefined): string {
  return (items ?? []).join('\n');
}

export function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    slug: '',
    category: '',
    shortDescription: '',
    description: '',
    problem: '',
    solution: '',
    features: [],
    workflow: [],
    capabilities: [],
    industries: [],
    logoMediaId: null,
    heroMediaId: null,
    screenshots: [],
    status: 'draft',
    order: 0,
  });
  const [featureText, setFeatureText] = useState('');
  const [workflowText, setWorkflowText] = useState('');
  const [seoForm, setSeoForm] = useState<Partial<SeoMetadata>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id!),
    enabled: !isNew,
  });
  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities-all'],
    queryFn: () => api.getCapabilities({ limit: 100 }),
  });
  const industriesQuery = useQuery({
    queryKey: ['industries-all'],
    queryFn: () => api.getIndustries({ limit: 100 }),
  });

  useEffect(() => {
    if (productQuery.data) {
      setForm(productQuery.data);
      setFeatureText(arrayToLines(productQuery.data.features));
      setWorkflowText(arrayToLines(productQuery.data.workflow));
      if (productQuery.data.seoId) {
        api.getSeo(productQuery.data.seoId).then(setSeoForm).catch(() => undefined);
      }
    }
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const payload = {
        ...data,
        features: linesToArray(featureText),
        workflow: linesToArray(workflowText),
      };

      let product = isNew ? await api.createProduct(payload) : await api.updateProduct(id!, payload);

      const hasSeo =
        seoForm.title ||
        seoForm.description ||
        seoForm.ogTitle ||
        seoForm.ogDescription ||
        seoForm.ogImageMediaId ||
        seoForm.canonicalUrl;

      if (hasSeo) {
        if (product.seoId) {
          await api.updateSeo(product.seoId, seoForm);
        } else {
          const seo = await api.createSeo({
            entityType: 'product',
            entityId: product.id,
            ...seoForm,
          });
          product = await api.updateProduct(product.id, { seoId: seo.id });
        }
      }

      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isNew ? 'Product created.' : 'Saved successfully.');
      if (isNew) navigate(`/products/${product.id}/edit`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Published successfully.');
      setConfirmPublish(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Unpublished.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Archived.');
      setConfirmArchive(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (productQuery.isLoading) return <Layout title="Edit Product"><LoadingState /></Layout>;
  if (productQuery.isError) return <Layout title="Edit Product"><ErrorState message="Unable to load product." /></Layout>;

  const update = (field: keyof Product, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleArrayItem = (field: 'capabilities' | 'industries', item: string) => {
    const current = (form[field] as string[]) ?? [];
    update(field, current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  };

  const handleSave = () => saveMutation.mutate(form);

  const previewProduct: Partial<Product> = {
    ...form,
    features: linesToArray(featureText),
    workflow: linesToArray(workflowText),
  };

  return (
    <Layout title={isNew ? 'New Product' : `Edit: ${form.name ?? 'Product'}`}>
      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="cms-button" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
        {!isNew && form.status === 'published' && (
          <button className="cms-button" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
            Unpublish
          </button>
        )}
        {!isNew && form.status !== 'published' && (
          <button className="cms-button" onClick={() => setConfirmPublish(true)}>Publish</button>
        )}
        {!isNew && (
          <button className="cms-button" onClick={() => setConfirmArchive(true)}>Archive</button>
        )}
        <button className="cms-button cms-button--ghost" onClick={() => navigate('/products')}>Back</button>
      </div>

      {showPreview && <ProductPreview product={previewProduct} />}

      <FormSection title="General">
        <label className="cms-field">
          <span className="cms-field__label">Name</span>
          <input className="cms-input" value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Slug</span>
          <input className="cms-input" value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="auto-generated from name" />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Category</span>
          <input className="cms-input" value={form.category ?? ''} onChange={(e) => update('category', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Short Description</span>
          <textarea className="cms-input" rows={2} value={form.shortDescription ?? ''} onChange={(e) => update('shortDescription', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Status</span>
          <select className="cms-input" value={form.status ?? 'draft'} onChange={(e) => update('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Order</span>
          <input type="number" className="cms-input" value={form.order ?? 0} onChange={(e) => update('order', Number(e.target.value))} />
        </label>
      </FormSection>

      <FormSection title="Story">
        <label className="cms-field">
          <span className="cms-field__label">Problem</span>
          <textarea className="cms-input" rows={3} value={form.problem ?? ''} onChange={(e) => update('problem', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Solution / Result</span>
          <textarea className="cms-input" rows={3} value={form.solution ?? ''} onChange={(e) => update('solution', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">System Description</span>
          <textarea className="cms-input" rows={4} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Features (one per line)</span>
          <textarea className="cms-input" rows={5} value={featureText} onChange={(e) => setFeatureText(e.target.value)} placeholder="Subscribers&#10;Billing&#10;Payments" />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Workflow (one per line)</span>
          <textarea className="cms-input" rows={4} value={workflowText} onChange={(e) => setWorkflowText(e.target.value)} placeholder="Subscriber&#10;Package&#10;Billing&#10;Payment&#10;Service" />
        </label>
      </FormSection>

      <FormSection title="Media">
        <label className="cms-field">
          <span className="cms-field__label">Logo</span>
          <MediaPicker value={form.logoMediaId ?? null} onChange={(v) => update('logoMediaId', v)} />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Hero Visual</span>
          <MediaPicker value={form.heroMediaId ?? null} onChange={(v) => update('heroMediaId', v)} />
        </label>
        <div className="cms-field">
          <span className="cms-field__label">Screenshots</span>
          <ScreenshotManager value={form.screenshots ?? []} onChange={(v) => update('screenshots', v)} />
        </div>
        <p className="cms-field__hint">Hero visual appears on the product page and on /products. Upload from Browse / Upload, or CMS → Media.</p>
      </FormSection>

      <FormSection title="Relationships">
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
        <div className="cms-field">
          <span className="cms-field__label">Industries</span>
          <div className="cms-checkbox-group">
            {industriesQuery.data?.items.map((ind: Industry) => (
              <label key={ind.id} className="cms-checkbox">
                <input type="checkbox" checked={(form.industries ?? []).includes(ind.id)} onChange={() => toggleArrayItem('industries', ind.id)} />
                {ind.name}
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="SEO">
        <label className="cms-field">
          <span className="cms-field__label">SEO Title</span>
          <input
            className="cms-input"
            value={seoForm.title ?? ''}
            onChange={(e) => setSeoForm((prev) => ({ ...prev, title: e.target.value || null }))}
            placeholder="Leave blank to use default"
          />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">SEO Description</span>
          <textarea
            className="cms-input"
            rows={2}
            value={seoForm.description ?? ''}
            onChange={(e) => setSeoForm((prev) => ({ ...prev, description: e.target.value || null }))}
            placeholder="Leave blank to use default"
          />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Canonical URL</span>
          <input
            className="cms-input"
            value={seoForm.canonicalUrl ?? ''}
            onChange={(e) => setSeoForm((prev) => ({ ...prev, canonicalUrl: e.target.value || null }))}
            placeholder={`https://novaflow.co/products/${form.slug ?? 'slug'}`}
          />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">OG Image</span>
          <MediaPicker
            value={seoForm.ogImageMediaId ?? null}
            onChange={(v) => setSeoForm((prev) => ({ ...prev, ogImageMediaId: typeof v === 'string' ? v : null }))}
          />
        </label>
      </FormSection>

      <ConfirmDialog
        open={confirmPublish}
        title="Publish Product"
        message={<>Publish <strong>{form.name}</strong>? It will be visible on the public site.</>}
        confirmLabel="Publish"
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title="Archive Product"
        message={<>Archive <strong>{form.name}</strong>? It will be hidden from the public site.</>}
        confirmLabel="Archive"
        onConfirm={() => archiveMutation.mutate()}
        onCancel={() => setConfirmArchive(false)}
      />
    </Layout>
  );
}
