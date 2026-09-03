import type { Article, ArticleCategory } from '../types';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321';

export function ArticlePreview({
  article,
  categoryName,
}: {
  article: Partial<Article>;
  categoryName?: string;
}) {
  const slug = article.slug || 'preview';
  const isDraft = article.status !== 'published';
  const blocks = article.content?.blocks ?? [];

  return (
    <div className="cms-product-preview">
      <div className="cms-product-preview__toolbar">
        <span className="cms-product-preview__badge">{isDraft ? 'Draft preview — not indexed' : 'Preview — not indexed'}</span>
        {article.status === 'published' && article.slug && (
          <a
            className="cms-button cms-button--sm"
            href={`${WEBSITE_URL}/insights/${article.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Open /insights/{slug} ↗
          </a>
        )}
      </div>
      {isDraft && <p className="cms-article-preview__banner">DRAFT</p>}
      <article className="cms-product-preview__page">
        <header className="cms-product-preview__hero">
          <p className="cms-product-preview__index">{(categoryName ?? 'INSIGHTS').toUpperCase()}</p>
          <h1>{article.title?.toUpperCase() ?? 'ARTICLE TITLE'}</h1>
          {article.excerpt && <p className="cms-product-preview__statement">{article.excerpt}</p>}
        </header>
        {blocks.slice(0, 8).map((block) => {
          if (block.type === 'heading') return <h2 key={block.id}>{block.text}</h2>;
          if (block.type === 'paragraph') return <p key={block.id}>{block.text}</p>;
          if (block.type === 'quote') return <blockquote key={block.id}>{block.text}</blockquote>;
          if (block.type === 'list') return <p key={block.id}>{block.items.filter(Boolean).join(' · ')}</p>;
          if (block.type === 'image') return <p key={block.id}>[Image{block.caption ? `: ${block.caption}` : ''}]</p>;
          if (block.type === 'code') return <pre key={block.id}><code>{block.code}</code></pre>;
          if (block.type === 'table') return <p key={block.id}>[Table]</p>;
          return null;
        })}
      </article>
      <p className="cms-product-preview__note">
        Drafts stay in CMS until published. Public articles appear at <code>/insights/{slug}</code>.
      </p>
    </div>
  );
}

export function categoryLabel(categories: ArticleCategory[], id?: string | null) {
  return categories.find((category) => category.id === id)?.name;
}
