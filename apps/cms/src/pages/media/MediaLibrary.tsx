import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, ConfirmDialog } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { Media } from '../../types';

export function MediaLibrary() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Media | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const limit = 24;

  const query = useQuery({
    queryKey: ['media', search, typeFilter, page],
    queryFn: () => api.getMedia({ search: search || undefined, type: typeFilter, limit, offset: page * limit }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadMedia(file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Upload complete.'); setUploading(false); },
    onError: (err: Error) => { toast.error(err.message); setUploading(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Media> }) => api.updateMedia(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Metadata saved.'); setEditing(null); },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedia(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Media deleted.'); setConfirmDelete(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    Array.from(files).forEach((file) => uploadMutation.mutate(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Layout title="Media Library">
      <div className="cms-toolbar">
        <input className="cms-input cms-toolbar__search" placeholder="Search by filename…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select className="cms-input cms-toolbar__filter" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}>
          <option value="all">All types</option>
          <option value="image">Image</option>
          <option value="logo">Logo</option>
          <option value="screenshot">Screenshot</option>
          <option value="og-image">OG Image</option>
        </select>
        <div className="cms-view-toggle">
          <button className={`cms-button cms-button--sm ${view === 'grid' ? 'cms-button--primary' : ''}`} onClick={() => setView('grid')}>Grid</button>
          <button className={`cms-button cms-button--sm ${view === 'list' ? 'cms-button--primary' : ''}`} onClick={() => setView('list')}>List</button>
        </div>
      </div>

      <div className="cms-upload-zone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        {uploading ? <span>Uploading…</span> : <span>Drag and drop files here, or click to select</span>}
      </div>

      <section className="cms-panel">
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load media." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No media yet." action={() => fileInputRef.current?.click()} actionLabel="Upload media" /> :
          view === 'grid' ? (
            <div className="cms-media-grid">
              {query.data.items.map((item) => (
                <div key={item.id} className="cms-media-card" onClick={() => setEditing(item)}>
                  <div className="cms-media-card__thumb">{item.r2Url && <img src={item.r2Url} alt={item.altText ?? item.filename} loading="lazy" />}</div>
                  <div className="cms-media-card__info">
                    <span className="cms-media-card__name">{item.filename}</span>
                    <span className="cms-media-card__meta">{item.type} · {(item.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead><tr><th>Filename</th><th>Type</th><th>Dimensions</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.filename}</td>
                      <td>{item.type}</td>
                      <td>{item.width && item.height ? `${item.width}×${item.height}` : '—'}</td>
                      <td>{(item.sizeBytes / 1024).toFixed(0)} KB</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="cms-table__actions">
                        <button className="cms-button cms-button--sm" onClick={() => setEditing(item)}>Edit</button>
                        <button className="cms-button cms-button--sm cms-button--danger" onClick={() => setConfirmDelete(item)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        {query.data && query.data.total > limit && (
          <div className="cms-pagination">
            <button className="cms-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.ceil(query.data.total / limit)}</span>
            <button className="cms-button" disabled={(page + 1) * limit >= query.data.total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </section>

      {editing && (
        <div className="cms-modal-overlay" onClick={() => setEditing(null)}>
          <div className="cms-modal cms-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="cms-modal__title">Edit Media</h2>
            <div className="cms-media-editor">
              <div className="cms-media-editor__preview">{editing.r2Url && <img src={editing.r2Url} alt={editing.altText ?? editing.filename} />}</div>
              <div className="cms-media-editor__form">
                <label className="cms-field"><span className="cms-field__label">Filename</span><input className="cms-input" defaultValue={editing.filename} disabled /></label>
                <label className="cms-field"><span className="cms-field__label">Title</span><input className="cms-input" defaultValue={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
                <label className="cms-field"><span className="cms-field__label">Alt Text</span><input className="cms-input" defaultValue={editing.altText ?? ''} onChange={(e) => setEditing({ ...editing, altText: e.target.value })} placeholder="Describe the image for screen readers" /></label>
                <label className="cms-field cms-checkbox"><input type="checkbox" checked={editing.decorative} onChange={(e) => setEditing({ ...editing, decorative: e.target.checked })} /> Decorative image (no alt text needed)</label>
                <label className="cms-field"><span className="cms-field__label">Focal Point X</span><input type="number" min={0} max={100} className="cms-input" defaultValue={editing.focalX} onChange={(e) => setEditing({ ...editing, focalX: Number(e.target.value) })} /></label>
                <label className="cms-field"><span className="cms-field__label">Focal Point Y</span><input type="number" min={0} max={100} className="cms-input" defaultValue={editing.focalY} onChange={(e) => setEditing({ ...editing, focalY: Number(e.target.value) })} /></label>
              </div>
            </div>
            <div className="cms-modal__actions">
              <button className="cms-button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="cms-button cms-button--primary" onClick={() => updateMutation.mutate({ id: editing.id, data: { title: editing.title, altText: editing.altText, decorative: editing.decorative, focalX: editing.focalX, focalY: editing.focalY } })}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} title="Delete Media" message={<>Delete <strong>{confirmDelete?.filename}</strong>?{confirmDelete?.references && confirmDelete.references.length > 0 && <><br />This image is used by {confirmDelete.references.length} item(s).</>}</>} confirmLabel="Delete" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
    </Layout>
  );
}
