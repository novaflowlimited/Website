import { MediaPicker } from './MediaPicker';
import type { ArticleBlock, ArticleDocument } from '../types';

function newId() {
  return crypto.randomUUID();
}

const blockOptions: Array<{ type: ArticleBlock['type']; label: string }> = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'heading', label: 'Heading' },
  { type: 'quote', label: 'Quote' },
  { type: 'list', label: 'List' },
  { type: 'image', label: 'Image' },
  { type: 'code', label: 'Code' },
  { type: 'table', label: 'Table' },
];

function createBlock(type: ArticleBlock['type']): ArticleBlock {
  switch (type) {
    case 'heading':
      return { id: newId(), type: 'heading', level: 2, text: '' };
    case 'quote':
      return { id: newId(), type: 'quote', text: '', attribution: '' };
    case 'list':
      return { id: newId(), type: 'list', ordered: false, items: [''] };
    case 'image':
      return { id: newId(), type: 'image', mediaId: '', caption: '', layout: 'inline' };
    case 'code':
      return { id: newId(), type: 'code', language: '', code: '' };
    case 'table':
      return { id: newId(), type: 'table', headers: ['', ''], rows: [['', '']] };
    default:
      return { id: newId(), type: 'paragraph', text: '' };
  }
}

export function ArticleBodyEditor({
  value,
  onChange,
}: {
  value: ArticleDocument;
  onChange: (next: ArticleDocument) => void;
}) {
  const blocks = value.blocks ?? [];

  const updateBlock = (id: string, next: ArticleBlock) => {
    onChange({ blocks: blocks.map((block) => (block.id === id ? next : block)) });
  };
  const removeBlock = (id: string) => onChange({ blocks: blocks.filter((block) => block.id !== id) });
  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ blocks: next });
  };
  const addBlock = (type: ArticleBlock['type']) => onChange({ blocks: [...blocks, createBlock(type)] });

  return (
    <div className="cms-article-body">
      {blocks.length === 0 && <p className="cms-field__hint">Add structured blocks. HTML, CSS and JavaScript are not allowed.</p>}
      {blocks.map((block, index) => (
        <article key={block.id} className="cms-article-block">
          <header className="cms-article-block__toolbar">
            <span className="cms-article-block__type">{block.type}</span>
            <div>
              <button type="button" className="cms-button cms-button--sm" onClick={() => moveBlock(index, -1)} disabled={index === 0}>Up</button>
              <button type="button" className="cms-button cms-button--sm" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>Down</button>
              <button type="button" className="cms-button cms-button--sm cms-button--danger" onClick={() => removeBlock(block.id)}>Remove</button>
            </div>
          </header>
          {block.type === 'heading' && (
            <>
              <label className="cms-field">
                <span className="cms-field__label">Level</span>
                <select className="cms-input" value={block.level} onChange={(e) => updateBlock(block.id, { ...block, level: Number(e.target.value) as 2 | 3 })}>
                  <option value={2}>Heading 2</option>
                  <option value={3}>Heading 3</option>
                </select>
              </label>
              <textarea className="cms-input" rows={2} value={block.text} onChange={(e) => updateBlock(block.id, { ...block, text: e.target.value })} />
            </>
          )}
          {block.type === 'paragraph' && (
            <textarea className="cms-input" rows={4} value={block.text} onChange={(e) => updateBlock(block.id, { ...block, text: e.target.value })} placeholder="Links: [label](/products/bytepesa)" />
          )}
          {block.type === 'quote' && (
            <>
              <textarea className="cms-input" rows={3} value={block.text} onChange={(e) => updateBlock(block.id, { ...block, text: e.target.value })} />
              <input className="cms-input" value={block.attribution ?? ''} onChange={(e) => updateBlock(block.id, { ...block, attribution: e.target.value })} placeholder="Attribution (optional)" />
            </>
          )}
          {block.type === 'list' && (
            <>
              <label className="cms-checkbox">
                <input type="checkbox" checked={block.ordered} onChange={(e) => updateBlock(block.id, { ...block, ordered: e.target.checked })} /> Ordered
              </label>
              <textarea
                className="cms-input"
                rows={5}
                value={block.items.join('\n')}
                onChange={(e) => updateBlock(block.id, { ...block, items: e.target.value.split('\n') })}
                placeholder="One item per line"
              />
            </>
          )}
          {block.type === 'image' && (
            <>
              <MediaPicker value={block.mediaId || null} onChange={(v) => updateBlock(block.id, { ...block, mediaId: typeof v === 'string' ? v : '' })} />
              <input className="cms-input" value={block.caption ?? ''} onChange={(e) => updateBlock(block.id, { ...block, caption: e.target.value })} placeholder="Caption" />
              <select className="cms-input" value={block.layout} onChange={(e) => updateBlock(block.id, { ...block, layout: e.target.value as 'inline' | 'full' })}>
                <option value="inline">Inline</option>
                <option value="full">Full width</option>
              </select>
            </>
          )}
          {block.type === 'code' && (
            <>
              <input className="cms-input" value={block.language ?? ''} onChange={(e) => updateBlock(block.id, { ...block, language: e.target.value })} placeholder="Language (optional)" />
              <textarea className="cms-input cms-input--mono" rows={6} value={block.code} onChange={(e) => updateBlock(block.id, { ...block, code: e.target.value })} />
            </>
          )}
          {block.type === 'table' && (
            <textarea
              className="cms-input"
              rows={6}
              value={[block.headers.join('\t'), ...block.rows.map((row) => row.join('\t'))].join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter((line) => line.length > 0);
                const headers = (lines[0] ?? '').split('\t');
                const rows = lines.slice(1).map((line) => line.split('\t'));
                updateBlock(block.id, { ...block, headers, rows });
              }}
              placeholder="Tab-separated rows. First row is the header."
            />
          )}
        </article>
      ))}
      <div className="cms-article-body__add">
        {blockOptions.map((option) => (
          <button key={option.type} type="button" className="cms-button cms-button--sm" onClick={() => addBlock(option.type)}>
            + {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
