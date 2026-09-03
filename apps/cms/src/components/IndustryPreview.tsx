import type { Industry } from '../types';

export function IndustryPreview({ industry }: { industry: Partial<Industry> }) {
  const headlineLines = (industry.challengeHeadline ?? '').split('\n').filter(Boolean);
  const systemItems = industry.systemItems ?? [];

  return (
    <div className="cms-product-preview">
      <div className="cms-product-preview__toolbar">
        <span className="cms-product-preview__badge">Preview — not indexed</span>
        {industry.status === 'published' && industry.slug && (
          <a
            className="cms-button cms-button--sm"
            href={`${import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321'}/industries/${industry.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            View live ↗
          </a>
        )}
      </div>
      <article className="cms-product-preview__page">
        <header className="cms-product-preview__hero">
          <p className="cms-product-preview__index">01 / INDUSTRY</p>
          <h1>{industry.name?.toUpperCase() ?? 'INDUSTRY'}</h1>
          {industry.shortDescription && <p className="cms-product-preview__statement">{industry.shortDescription.toUpperCase()}</p>}
        </header>
        {industry.businessContext && (
          <section><h2>THE BUSINESS</h2><p>{industry.businessContext}</p></section>
        )}
        {(headlineLines.length > 0 || industry.challenge) && (
          <section>
            <h2>THE CHALLENGE</h2>
            {headlineLines.length > 0 && <p>{headlineLines.join(' ')}</p>}
            {industry.challenge && <p>{industry.challenge}</p>}
          </section>
        )}
        {(systemItems.length > 0 || industry.systemDescription) && (
          <section>
            <h2>THE SYSTEM</h2>
            {industry.systemDescription && <p>{industry.systemDescription}</p>}
            {systemItems.length > 0 && <ul>{systemItems.map((item) => <li key={item}>{item.toUpperCase()}</li>)}</ul>}
          </section>
        )}
      </article>
    </div>
  );
}
