import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MediaPicker } from './MediaPicker';
import type { ProductScreenshot } from '../types';

export function ScreenshotManager({
  value,
  onChange,
  withTreatment = false,
}: {
  value: ProductScreenshot[];
  onChange: (value: ProductScreenshot[]) => void;
  withTreatment?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sorted = [...value].sort((a, b) => a.order - b.order);

  const updateItem = (index: number, patch: Partial<ProductScreenshot>) => {
    const next = sorted.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = sorted.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i }));
    onChange(next);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, i) => ({ ...item, order: i })));
  };

  const handleAdd = (mediaIds: string | string[] | null) => {
    if (!mediaIds) return;
    const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];
    const existing = new Set(sorted.map((s) => s.mediaId));
    const additions = ids
      .filter((id) => !existing.has(id))
      .map((mediaId, offset) => ({
        mediaId,
        title: null,
        caption: null,
        treatment: 'full' as const,
        order: sorted.length + offset,
      }));
    onChange([...sorted, ...additions]);
    setPickerOpen(false);
  };

  return (
    <div className="cms-screenshot-manager">
      {sorted.length === 0 ? (
        <p className="cms-screenshot-manager__empty">No screenshots yet.</p>
      ) : (
        <ul className="cms-screenshot-manager__list">
          {sorted.map((item, index) => (
            <ScreenshotRow
              key={`${item.mediaId}-${index}`}
              item={item}
              index={index}
              total={sorted.length}
              withTreatment={withTreatment}
              onUpdate={(patch) => updateItem(index, patch)}
              onRemove={() => removeItem(index)}
              onMove={(dir) => moveItem(index, dir)}
            />
          ))}
        </ul>
      )}
      <button type="button" className="cms-button cms-button--sm" onClick={() => setPickerOpen(true)}>
        Add screenshot
      </button>
      {pickerOpen && (
        <div className="cms-field" style={{ marginTop: '0.75rem' }}>
          <MediaPicker value={null} multiple onChange={handleAdd} />
          <button type="button" className="cms-button cms-button--ghost cms-button--sm" onClick={() => setPickerOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function ScreenshotRow({
  item,
  index,
  total,
  withTreatment,
  onUpdate,
  onRemove,
  onMove,
}: {
  item: ProductScreenshot;
  index: number;
  total: number;
  withTreatment: boolean;
  onUpdate: (patch: Partial<ProductScreenshot>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    api.getMediaItem(item.mediaId).then((media) => {
      if (media?.r2Url) setPreview(media.r2Url);
    }).catch(() => undefined);
  }, [item.mediaId]);

  return (
    <li className="cms-screenshot-manager__item">
      <div className="cms-screenshot-manager__thumb">
        {preview ? <img src={preview} alt="" /> : <span>…</span>}
      </div>
      <div className="cms-screenshot-manager__fields">
        <label className="cms-field">
          <span className="cms-field__label">Title (optional)</span>
          <input
            className="cms-input"
            value={item.title ?? ''}
            onChange={(e) => onUpdate({ title: e.target.value || null })}
          />
        </label>
        <label className="cms-field">
          <span className="cms-field__label">Caption (optional)</span>
          <input
            className="cms-input"
            value={item.caption ?? ''}
            onChange={(e) => onUpdate({ caption: e.target.value || null })}
          />
        </label>
        {withTreatment && (
          <label className="cms-field">
            <span className="cms-field__label">Treatment</span>
            <select
              className="cms-input"
              value={item.treatment ?? 'full'}
              onChange={(e) => onUpdate({ treatment: e.target.value as ProductScreenshot['treatment'] })}
            >
              <option value="full">Full width</option>
              <option value="detail">Cropped detail</option>
              <option value="pair">Side by side</option>
            </select>
          </label>
        )}
      </div>
      <div className="cms-screenshot-manager__actions">
        <button type="button" className="cms-button cms-button--sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
          ↑
        </button>
        <button type="button" className="cms-button cms-button--sm" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">
          ↓
        </button>
        <button type="button" className="cms-button cms-button--sm" onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}
