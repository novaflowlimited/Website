import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { ArticleCategory } from '../../types';

export function InsightsCategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<ArticleCategory | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArticleCategory | null>(null);

  const query = useQuery({ queryKey: ['article-categories'], queryFn: () => api.getArticleCategories() });
  const createMutation = useMutation({
    mutationFn: () => api.createArticleCategory({ name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['article-categories'] }); toast.success('Category created.'); setName(''); },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: (category: ArticleCategory) => api.updateArticleCategory(category.id, { name: category.name, slug: category.slug, order: category.order }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['article-categories'] }); toast.success('Category updated.'); setEditing(null); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteArticleCategory(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['article-categories'] }); toast.success('Category deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Insight categories">
      <section className="cms-panel">
        <form className="cms-toolbar" onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMutation.mutate(); }}>
          <input className="cms-input cms-toolbar__search" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <button className="cms-button cms-button--primary" type="submit" disabled={createMutation.isPending}>Add category</button>
        </form>
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load categories." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No categories yet." /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {query.data.items.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {editing?.id === category.id ? (
                        <input className="cms-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      ) : category.name}
                    </td>
                    <td>
                      {editing?.id === category.id ? (
                        <input className="cms-input" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                      ) : category.slug}
                    </td>
                    <td>
                      {editing?.id === category.id ? (
                        <input type="number" className="cms-input" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
                      ) : category.order}
                    </td>
                    <td className="cms-table__actions">
                      {editing?.id === category.id ? (
                        <>
                          <button className="cms-button cms-button--sm" onClick={() => updateMutation.mutate(editing)}>Save</button>
                          <button className="cms-button cms-button--sm" onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="cms-button cms-button--sm" onClick={() => setEditing(category)}>Edit</button>
                          <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(category)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete category"
        message={<>Delete <strong>{confirmDelete?.name}</strong>? Categories in use cannot be deleted.</>}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  );
}
