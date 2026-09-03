/** Industry detail page — hero reveal, reduced motion support */

function initIndustryDetail() {
  const root = document.querySelector('[data-industry-slug]');
  if (!root) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroVisual = root.querySelector('.nf-id-hero__visual');

  if (heroVisual && !prefersReducedMotion) {
    requestAnimationFrame(() => heroVisual.classList.add('is-revealed'));
  } else if (heroVisual) {
    heroVisual.classList.add('is-revealed');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIndustryDetail);
} else {
  initIndustryDetail();
}

document.addEventListener('astro:page-load', initIndustryDetail);
