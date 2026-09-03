const root = document.querySelector<HTMLElement>('[data-insights-index]');
const API_URL = (root?.dataset.api || '').replace(/\/$/, '');

interface InsightListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  readingTime: number;
  publishedAt: string | null;
  featured: boolean;
  category: { name: string; slug: string } | null;
  hero: { url: string; altText: string | null; width: number | null; height: number | null } | null;
}

function pad(index: number) {
  return String(index + 1).padStart(2, '0');
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function renderList(items: InsightListItem[]) {
  return items
    .map(
      (article, index) => `<li>
        <a class="nf-ins-list__item" href="/insights/${escapeAttr(article.slug)}">
          <span class="nf-ins-list__index">${pad(index)}</span>
          <span class="nf-ins-list__body">
            <span class="nf-ins-list__title">${escapeHtml(article.title)}</span>
            <span class="nf-ins-list__meta">${escapeHtml(article.category?.name ?? 'Insights')} · ${article.readingTime} min</span>
          </span>
          <span class="nf-ins-list__arrow" aria-hidden="true">→</span>
        </a>
      </li>`,
    )
    .join('');
}

function renderFeatured(article: InsightListItem | null) {
  if (!article) return '';
  const image = article.hero
    ? `<a class="nf-ins-featured__visual" href="/insights/${escapeAttr(article.slug)}"><img src="${escapeAttr(article.hero.url)}" alt="${escapeHtml(article.hero.altText ?? '')}" width="${article.hero.width ?? 1600}" height="${article.hero.height ?? 900}" loading="lazy" decoding="async" /></a>`
    : '';
  const excerpt = article.excerpt ? `<p class="nf-ins-featured__excerpt">${escapeHtml(article.excerpt)}</p>` : '';
  const date = article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : '';
  return `<article class="nf-ins-featured">
    <p class="nf-ins-featured__label">Featured</p>
    ${image}
    <div class="nf-ins-featured__copy">
      <h2 class="nf-ins-featured__title"><a href="/insights/${escapeAttr(article.slug)}">${escapeHtml(article.title)}</a></h2>
      ${excerpt}
      <p class="nf-ins-featured__meta">${escapeHtml(article.category?.name ?? 'Insights')}${date}</p>
      <a class="nf-ins-featured__link" href="/insights/${escapeAttr(article.slug)}">Read article ↗</a>
    </div>
  </article>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (root && API_URL) {
  const results = root.querySelector<HTMLElement>('[data-insights-results]');
  const listEl = root.querySelector<HTMLOListElement>('[data-insights-list]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-insights-search]');
  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-insights-filter]')];
  const select = root.querySelector<HTMLSelectElement>('[data-insights-select]');
  const more = root.querySelector<HTMLButtonElement>('[data-insights-more]');
  const pageSize = Number(root.dataset.pageSize ?? 8);
  let category = 'all';
  let search = '';
  let offset = 0;
  let total = Number(root.dataset.total ?? 0);
  let loading = false;

  const syncFilters = () => {
    filterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.insightsFilter === category);
    });
    if (select) select.value = category;
  };

  const load = async (reset: boolean) => {
    if (loading) return;
    loading = true;
    if (reset) offset = 0;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    const res = await fetch(`${API_URL}/articles?${params}`);
    if (!res.ok) {
      loading = false;
      return;
    }
    const data = (await res.json()) as { items: InsightListItem[]; total: number; featured: InsightListItem | null };
    total = data.total;
    const filtered = Boolean(search || category !== 'all');
    const featured = filtered ? null : data.featured;
    const items = data.items.filter((item) => item.id !== featured?.id);
    if (!results || !listEl) {
      loading = false;
      return;
    }
    if (reset) {
      const featuredHtml = renderFeatured(featured);
      results.innerHTML = `${featuredHtml}<ol class="nf-ins-list" data-insights-list>${renderList(items)}</ol>`;
    } else {
      const liveList = results.querySelector('[data-insights-list]');
      if (liveList) liveList.insertAdjacentHTML('beforeend', renderList(items));
    }
    offset += data.items.length;
    if (more) more.hidden = offset >= total;
    loading = false;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      category = button.dataset.insightsFilter ?? 'all';
      syncFilters();
      void load(true);
    });
  });
  select?.addEventListener('change', () => {
    category = select.value || 'all';
    syncFilters();
    void load(true);
  });
  let timer: number | undefined;
  searchInput?.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      search = searchInput.value.trim();
      void load(true);
    }, 220);
  });
  more?.addEventListener('click', () => {
    void load(false);
  });
}
