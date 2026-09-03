import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, StatusBadge, ConfirmDialog } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { Product } from '../../types';

export function ProductsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const limit = 20;

  const query = useQuery({
    queryKey: ['products', search, statusFilter, page],
    queryFn: () => api.getProducts({ search: search || undefined, status: statusFilter, limit, offset: page * limit }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product published successfully.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const unpublishMutation = useMutation({
    mutationFn: (id: string) => api.unpublishProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product unpublished.'); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Products">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select className="cms-input cms-toolbar__filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <Link to="/products/new" className="cms-button cms-button--primary">New Product</Link>
      </div>

      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load products." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No products yet." action={() => window.location.href = '/products/new'} actionLabel="Create product" /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/products/${p.id}/edit`}>{p.name}</Link></td>
                    <td>{p.category ?? '—'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                    <td>{p.order}</td>
                    <td className="cms-table__actions">
                      <Link to={`/products/${p.id}/edit`} className="cms-button cms-button--sm">Edit</Link>
                      {p.status === 'published' ? (
                        <button className="cms-button cms-button--sm" onClick={() => unpublishMutation.mutate(p.id)}>Unpublish</button>
                      ) : (
                        <button className="cms-button cms-button--sm" onClick={() => publishMutation.mutate(p.id)}>Publish</button>
                      )}
                      <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
        {query.data && query.data.total > limit && (
          <div className="cms-pagination">
            <button className="cms-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.ceil(query.data.total / limit)}</span>
            <button className="cms-button" disabled={(page + 1) * limit >= query.data.total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Product"
        message={<>Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  );
}
