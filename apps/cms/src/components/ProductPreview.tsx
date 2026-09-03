import type { Product } from '../types';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321';

export function ProductPreview({ product }: { product: Partial<Product> }) {
  const slug = product.slug ?? 'preview';
  const features = product.features ?? [];
  const workflow = product.workflow ?? [];

  return (
    <div className="cms-product-preview">
      <div className="cms-product-preview__toolbar">
        <span className="cms-product-preview__badge">Preview — not indexed</span>
        {product.status === 'published' && product.slug && (
          <a
            className="cms-button cms-button--sm"
            href={`${WEBSITE_URL}/products/${product.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            View live ↗
          </a>
        )}
      </div>

      <article className="cms-product-preview__page">
        <header className="cms-product-preview__hero">
          <p className="cms-product-preview__index">01 / PRODUCT</p>
          <h1>{product.name?.toUpperCase() ?? 'PRODUCT'}</h1>
          {product.category && <p className="cms-product-preview__category">{product.category.toUpperCase()}</p>}
          {product.shortDescription && <p className="cms-product-preview__statement">{product.shortDescription}</p>}
        </header>

        {product.problem && (
          <section>
            <h2>THE PROBLEM</h2>
            <p>{product.problem}</p>
          </section>
        )}

        {product.description && (
          <section>
            <h2>THE SYSTEM</h2>
            <p>{product.description}</p>
          </section>
        )}

        {workflow.length > 0 && (
          <section>
            <h2>HOW IT WORKS</h2>
            <p>{workflow.join(' → ')}</p>
          </section>
        )}

        {features.length > 0 && (
          <section>
            <h2>FEATURES</h2>
            <ul>
              {features.map((f) => (
                <li key={f}>{f.toUpperCase()}</li>
              ))}
            </ul>
          </section>
        )}

        {product.solution && (
          <section>
            <h2>RESULT</h2>
            <p>{product.solution}</p>
          </section>
        )}
      </article>

      <p className="cms-product-preview__note">
        Draft content for <strong>{slug}</strong>. Published products appear at{' '}
        <code>/products/{slug}</code>.
      </p>
    </div>
  );
}
