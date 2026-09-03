import type { CaseStudy } from '../types';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321';

export function CaseStudyPreview({ study }: { study: Partial<CaseStudy> }) {
  const slug = study.slug ?? 'preview';

  return (
    <div className="cms-product-preview">
      <div className="cms-product-preview__toolbar">
        <span className="cms-product-preview__badge">Preview — not indexed</span>
        {study.status === 'published' && study.slug && (
          <a
            className="cms-button cms-button--sm"
            href={`${WEBSITE_URL}/case-studies/${study.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            View live ↗
          </a>
        )}
      </div>

      <article className="cms-product-preview__page">
        <header className="cms-product-preview__hero">
          <p className="cms-product-preview__index">CASE STUDY</p>
          <h1>{study.title?.toUpperCase() ?? 'CASE STUDY'}</h1>
          {study.industry && <p className="cms-product-preview__category">{study.industry.toUpperCase()}</p>}
          {study.summary && <p className="cms-product-preview__statement">{study.summary}</p>}
        </header>

        {study.challenge && (
          <section>
            <h2>01 / PROBLEM</h2>
            <p>{study.challenge}</p>
          </section>
        )}
        {study.approach && (
          <section>
            <h2>02 / APPROACH</h2>
            <p>{study.approach}</p>
          </section>
        )}
        {study.solution && (
          <section>
            <h2>03 / SYSTEM</h2>
            <p>{study.solution}</p>
          </section>
        )}
        {study.result && (
          <section>
            <h2>04 / OUTCOME</h2>
            <p>{study.result}</p>
          </section>
        )}
      </article>

      <p className="cms-product-preview__note">
        Draft content for <strong>{slug}</strong>. Published case studies appear at{' '}
        <code>/case-studies/{slug}</code>.
      </p>
    </div>
  );
}
