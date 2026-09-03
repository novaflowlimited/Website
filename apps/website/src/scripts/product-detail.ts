/** Product detail page interactions — workflow reveal, gallery scroll, reduced motion */

function initProductDetail() {
  const root = document.querySelector('[data-product-slug]');
  if (!root) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const workflow = root.querySelector('[data-workflow-track]');
  if (workflow && !prefersReducedMotion) {
    const steps = workflow.querySelectorAll('.nf-pd-workflow__step');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.4, rootMargin: '0px 0px -10% 0px' },
    );
    steps.forEach((step) => observer.observe(step));
  } else if (workflow) {
    workflow.querySelectorAll('.nf-pd-workflow__step').forEach((step) => step.classList.add('is-visible'));
  }

  const heroVisual = root.querySelector('.nf-pd-hero__visual');
  if (heroVisual && !prefersReducedMotion) {
    requestAnimationFrame(() => heroVisual.classList.add('is-revealed'));
  } else if (heroVisual) {
    heroVisual.classList.add('is-revealed');
  }

  const gallery = root.querySelector('[data-product-gallery]');
  if (gallery) {
    gallery.querySelectorAll('[data-gallery-item]').forEach((item, index) => {
      if (index === 0) item.classList.add('is-active');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductDetail);
} else {
  initProductDetail();
}

document.addEventListener('astro:page-load', initProductDetail);
