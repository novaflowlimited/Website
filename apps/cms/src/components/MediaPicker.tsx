import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Media } from '../types';
import { LoadingState, EmptyState } from './EmptyState';

export function MediaPicker({
  value,
  onChange,
  multiple = false,
}: {
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [selectedItems, setSelectedItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api.getMedia({ search: search || undefined, limit: 24 })
      .then((res) => setMedia(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, search]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedItems([]);
      return;
    }
    let cancelled = false;
    Promise.all(selectedIds.map((id) => api.getMediaItem(id).catch(() => null))).then((items) => {
      if (!cancelled) setSelectedItems(items.filter((item): item is Media => Boolean(item)));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedIds.join(',')]);

  const handleSelect = (id: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      onChange(next);
    } else {
      onChange(id === value ? null : id);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: Media[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await api.uploadMedia(file));
      }
      setMedia((prev) => [...uploaded, ...prev]);
      if (multiple) {
        const current = Array.isArray(value) ? value : [];
        onChange([...current, ...uploaded.map((item) => item.id)]);
      } else {
        onChange(uploaded[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cms-media-picker">
      <div className="cms-media-picker__selected">
        {selectedItems.length === 0 ? (
          <span className="cms-media-picker__placeholder">No image selected</span>
        ) : (
          <div className="cms-media-picker__thumbs">
            {selectedItems.map((item) => (
              <span key={item.id} className="cms-media-picker__thumb">
                {item.r2Url && <img src={item.r2Url} alt={item.altText ?? item.filename} />}
                <span>{item.filename}</span>
              </span>
            ))}
          </div>
        )}
        <div className="cms-media-picker__actions">
          {selectedIds.length > 0 && (
            <button type="button" className="cms-button cms-button--sm" onClick={() => onChange(multiple ? [] : null)}>
              Clear
            </button>
          )}
          <button type="button" className="cms-button cms-button--sm" onClick={() => setOpen(true)}>
            Browse / Upload
          </button>
        </div>
      </div>
      {open && (
        <div className="cms-modal-overlay" onClick={() => setOpen(false)}>
          <div className="cms-modal cms-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="cms-modal__title">Select or upload image</h2>
            <div className="cms-media-picker__toolbar">
              <input
                className="cms-input cms-modal__search"
                placeholder="Search by filename…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="button" className="cms-button cms-button--primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
                multiple={multiple}
                hidden
                onChange={(e) => {
                  void handleUpload(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
            {error && <p className="cms-field__hint">{error}</p>}
            <div className="cms-media-grid">
              {loading ? (
                <LoadingState />
              ) : media.length === 0 ? (
                <EmptyState title="No images yet. Upload one here." action={() => fileInputRef.current?.click()} actionLabel="Upload image" />
              ) : (
                media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cms-media-card ${selectedIds.includes(item.id) ? 'cms-media-card--selected' : ''}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="cms-media-card__thumb">
                      {item.r2Url && <img src={item.r2Url} alt={item.altText ?? item.filename} loading="lazy" />}
                    </div>
                    <span className="cms-media-card__name">{item.filename}</span>
                  </button>
                ))
              )}
            </div>
            <div className="cms-modal__actions">
              <button type="button" className="cms-button" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
