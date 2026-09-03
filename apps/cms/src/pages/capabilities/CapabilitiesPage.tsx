import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, StatusBadge, ConfirmDialog, FormSection } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { Capability } from '../../types';

export function CapabilitiesList() {
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Capability | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({ queryKey: ['capabilities', search], queryFn: () => api.getCapabilities({ search: search || undefined, limit: 100 }) });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCapability(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['capabilities'] }); toast.success('Capability deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Capabilities">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Link to="/capabilities/new" className="cms-button cms-button--primary">New Capability</Link>
      </div>
      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load capabilities." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No capabilities yet." action={() => window.location.href = '/capabilities/new'} actionLabel="Create capability" /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {query.data.items.map((cap) => (
                  <tr key={cap.id}>
                    <td><Link to={`/capabilities/${cap.id}/edit`}>{cap.name}</Link></td>
                    <td>{cap.slug}</td>
                    <td><StatusBadge status={cap.status} /></td>
                    <td>{cap.order}</td>
                    <td className="cms-table__actions">
                      <Link to={`/capabilities/${cap.id}/edit`} className="cms-button cms-button--sm">Edit</Link>
                      <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(cap)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      <ConfirmDialog open={!!confirmDelete} title="Delete Capability" message={<>Delete <strong>{confirmDelete?.name}</strong>?</>} confirmLabel="Delete" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
    </Layout>
  );
}

export function CapabilityEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isNew = id === 'new' || !id;
  const [form, setForm] = useState<Partial<Capability>>({ name: '', slug: '', shortDescription: '', status: 'draft', order: 0 });

  const query = useQuery({ queryKey: ['capability', id], queryFn: () => api.getCapability(id!), enabled: !isNew });
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Capability>) => isNew ? api.createCapability(data) : api.updateCapability(id!, data),
    onSuccess: (item) => { queryClient.invalidateQueries({ queryKey: ['capabilities'] }); toast.success('Saved successfully.'); if (isNew) navigate(`/capabilities/${item.id}/edit`); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isLoading) return <Layout title="Edit Capability"><LoadingState /></Layout>;
  const update = (field: keyof Capability, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Layout title={isNew ? 'New Capability' : `Edit: ${form.name}`}>
      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button>
        <button className="cms-button cms-button--ghost" onClick={() => navigate('/capabilities')}>Back</button>
      </div>
      <FormSection title="General">
        <label className="cms-field"><span className="cms-field__label">Name</span><input className="cms-input" value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Slug</span><input className="cms-input" value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Short Description</span><textarea className="cms-input" rows={2} value={form.shortDescription ?? ''} onChange={(e) => update('shortDescription', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Status</span><select className="cms-input" value={form.status ?? 'draft'} onChange={(e) => update('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="cms-field"><span className="cms-field__label">Order</span><input type="number" className="cms-input" value={form.order ?? 0} onChange={(e) => update('order', Number(e.target.value))} /></label>
      </FormSection>
    </Layout>
  );
}
