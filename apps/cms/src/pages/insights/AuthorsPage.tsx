import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { ConfirmDialog, EmptyState, ErrorState, FormSection, LoadingState } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { useToast } from '../../components/ToastProvider';
import type { ArticleAuthor } from '../../types';

export function InsightsAuthorsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', role: '', bio: '', photoMediaId: null as string | null });
  const [confirmDelete, setConfirmDelete] = useState<ArticleAuthor | null>(null);

  const query = useQuery({ queryKey: ['article-authors'], queryFn: () => api.getArticleAuthors() });
  const createMutation = useMutation({
    mutationFn: () => api.createArticleAuthor(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article-authors'] });
      toast.success('Author added.');
      setForm({ name: '', role: '', bio: '', photoMediaId: null });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteArticleAuthor(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['article-authors'] }); toast.success('Author removed.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Insight authors">
      <p className="cms-field__hint" style={{ margin: '0 0 1rem' }}>
        Optional. Public articles without an author display as NOVAFLOW. Do not create fictional authors.
      </p>
      <FormSection title="Add author">
        <label className="cms-field"><span className="cms-field__label">Name</span><input className="cms-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
        <label className="cms-field"><span className="cms-field__label">Role</span><input className="cms-input" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} /></label>
        <label className="cms-field"><span className="cms-field__label">Bio</span><textarea className="cms-input" rows={3} value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} /></label>
        <label className="cms-field"><span className="cms-field__label">Photo</span><MediaPicker value={form.photoMediaId} onChange={(v) => setForm((prev) => ({ ...prev, photoMediaId: typeof v === 'string' ? v : null }))} /></label>
        <button className="cms-button cms-button--primary" onClick={() => form.name.trim() && createMutation.mutate()} disabled={createMutation.isPending}>Add author</button>
      </FormSection>
      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load authors." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No authors configured. Articles will publish as NOVAFLOW." /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {query.data.items.map((author) => (
                  <tr key={author.id}>
                    <td>{author.name}</td>
                    <td>{author.role ?? '—'}</td>
                    <td><button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(author)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove author"
        message={<>Remove <strong>{confirmDelete?.name}</strong>? Existing articles will fall back to NOVAFLOW.</>}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  );
}
