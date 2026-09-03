import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, ConfirmDialog } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { NavigationItem } from '../../types';

export function NavigationManager() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState<NavigationItem | null>(null);
  const [editing, setEditing] = useState<NavigationItem | null>(null);
  const [newItem, setNewItem] = useState({ label: '', url: '', location: 'main' as 'main' | 'footer' });

  const query = useQuery({ queryKey: ['navigation'], queryFn: () => api.getNavigation() });
  const createMutation = useMutation({
    mutationFn: (data: Partial<NavigationItem>) => api.createNavigationItem(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['navigation'] }); toast.success('Navigation item added.'); setNewItem({ label: '', url: '', location: 'main' }); },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NavigationItem> }) => api.updateNavigationItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['navigation'] }); toast.success('Saved.'); setEditing(null); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNavigationItem(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['navigation'] }); toast.success('Deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const mainItems = query.data?.items.filter((i) => i.location === 'main').sort((a, b) => a.order - b.order) ?? [];
  const footerItems = query.data?.items.filter((i) => i.location === 'footer').sort((a, b) => a.order - b.order) ?? [];

  const renderItems = (items: NavigationItem[], title: string) => (
    <section className="cms-panel">
      <div className="cms-panel__header"><h2>{title}</h2></div>
      {items.length === 0 ? <EmptyState title={`No ${title.toLowerCase()} items.`} /> : (
        <div className="cms-nav-list">
          {items.map((item) => (
            <div key={item.id} className="cms-nav-list__item">
              <span className="cms-nav-list__label">{item.label}</span>
              <span className="cms-nav-list__url">{item.url}</span>
              <span className={`cms-status-badge cms-status-badge--${item.visibility}`}>{item.visibility}</span>
              <div className="cms-table__actions">
                <button className="cms-button cms-button--sm" onClick={() => setEditing(item)}>Edit</button>
                <button className="cms-button cms-button--sm" onClick={() => updateMutation.mutate({ id: item.id, data: { visibility: item.visibility === 'visible' ? 'hidden' : 'visible' } })}>{item.visibility === 'visible' ? 'Hide' : 'Show'}</button>
                <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <Layout title="Navigation">
      <section className="cms-panel">
        <div className="cms-panel__header"><h2>Add Navigation Item</h2></div>
        <div className="cms-form-row">
          <input className="cms-input" placeholder="Label" value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} />
          <input className="cms-input" placeholder="URL (e.g. /about)" value={newItem.url} onChange={(e) => setNewItem({ ...newItem, url: e.target.value })} />
          <select className="cms-input" value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value as 'main' | 'footer' })}>
            <option value="main">Main</option>
            <option value="footer">Footer</option>
          </select>
          <button className="cms-button cms-button--primary" onClick={() => createMutation.mutate({ ...newItem, order: 0, visibility: 'visible' })} disabled={!newItem.label || !newItem.url}>Add</button>
        </div>
      </section>

      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Unable to load navigation." /> : (
        <>
          {renderItems(mainItems, 'Main Navigation')}
          {renderItems(footerItems, 'Footer Navigation')}
        </>
      )}

      {editing && (
        <div className="cms-modal-overlay" onClick={() => setEditing(null)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="cms-modal__title">Edit Navigation Item</h2>
            <label className="cms-field"><span className="cms-field__label">Label</span><input className="cms-input" defaultValue={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">URL</span><input className="cms-input" defaultValue={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Order</span><input type="number" className="cms-input" defaultValue={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></label>
            <div className="cms-modal__actions">
              <button className="cms-button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="cms-button cms-button--primary" onClick={() => updateMutation.mutate({ id: editing.id, data: { label: editing.label, url: editing.url, order: editing.order } })}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} title="Delete Navigation Item" message={<>Delete <strong>{confirmDelete?.label}</strong>?</>} confirmLabel="Delete" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
    </Layout>
  );
}
