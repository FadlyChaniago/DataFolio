/**
 * Project Explorer — search, platform/category filters, sorting, URL state and "Load More".
 * Vanilla JS, no dependencies. Cards are server-rendered by Astro; this script only
 * re-orders and shows/hides them, so the page still lists every project without JS.
 */

const root = document.querySelector('[data-explorer]');
if (root) initExplorer(root);

function initExplorer(root) {
  const grid = root.querySelector('[data-grid]');
  const cards = Array.from(grid.querySelectorAll('[data-project]'));
  const search = root.querySelector('[data-filter="q"]');
  const categorySelect = root.querySelector('[data-filter="category"]');
  const sortSelect = root.querySelector('[data-filter="sort"]');
  const chips = Array.from(root.querySelectorAll('[data-platform-chips] [data-platform]'));
  const countEl = root.querySelector('[data-result-count]');
  const clearBtn = root.querySelector('[data-clear]');
  const clearEmptyBtn = root.querySelector('[data-clear-empty]');
  const emptyEl = root.querySelector('[data-empty]');
  const loadMoreWrap = root.querySelector('[data-load-more-wrap]');
  const loadMoreBtn = root.querySelector('[data-load-more]');
  const pageSize = Number(root.dataset.pageSize) || 12;

  const platforms = new Set(chips.map((c) => c.dataset.platform).filter(Boolean));
  const categories = new Set(Array.from(categorySelect.options).map((o) => o.value).filter(Boolean));
  const sorts = new Set(Array.from(sortSelect.options).map((o) => o.value));
  const DEFAULT_SORT = 'newest';

  // Pre-compute what each card needs once.
  const items = cards.map((el) => ({
    el,
    title: el.dataset.title || '',
    platform: el.dataset.platform || '',
    category: el.dataset.category || '',
    date: el.dataset.date || '',
    featured: el.dataset.featured === 'true',
    text: el.dataset.search || '',
  }));

  let state = readUrl();
  let limit = pageSize;

  // ---- state <-> URL --------------------------------------------------------
  function readUrl() {
    const p = new URLSearchParams(window.location.search);
    const platform = p.get('platform') || '';
    const category = p.get('category') || '';
    const sort = p.get('sort') || DEFAULT_SORT;
    return {
      q: (p.get('q') || '').slice(0, 100),
      platform: platforms.has(platform) ? platform : '',
      category: categories.has(category) ? category : '',
      sort: sorts.has(sort) ? sort : DEFAULT_SORT,
    };
  }

  function writeUrl(mode) {
    const p = new URLSearchParams(window.location.search);
    const set = (k, v, def = '') => (v && v !== def ? p.set(k, v) : p.delete(k));
    set('q', state.q.trim());
    set('platform', state.platform);
    set('category', state.category);
    set('sort', state.sort, DEFAULT_SORT);
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }

  // ---- filtering & sorting --------------------------------------------------
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const byDateDesc = (a, b) => b.date.localeCompare(a.date) || collator.compare(a.title, b.title);
  const comparators = {
    newest: byDateDesc,
    oldest: (a, b) => a.date.localeCompare(b.date) || collator.compare(a.title, b.title),
    az: (a, b) => collator.compare(a.title, b.title),
    za: (a, b) => collator.compare(b.title, a.title),
    featured: (a, b) => Number(b.featured) - Number(a.featured) || byDateDesc(a, b),
  };

  function matches(item, terms) {
    if (state.platform && item.platform !== state.platform) return false;
    if (state.category && item.category !== state.category) return false;
    return terms.every((t) => item.text.includes(t));
  }

  function isFiltered() {
    return Boolean(state.q.trim() || state.platform || state.category);
  }

  function render() {
    const terms = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const sorted = items.slice().sort(comparators[state.sort] || byDateDesc);
    const matched = [];

    // Re-order DOM once (DocumentFragment = one reflow), then toggle visibility.
    const frag = document.createDocumentFragment();
    for (const item of sorted) {
      frag.appendChild(item.el);
      if (matches(item, terms)) matched.push(item);
      else item.el.hidden = true;
    }
    matched.forEach((item, i) => (item.el.hidden = i >= limit));
    grid.appendChild(frag);

    const shown = Math.min(limit, matched.length);
    const total = items.length;
    countEl.innerHTML = isFiltered()
      ? `Showing <strong>${shown}</strong> of <strong>${matched.length}</strong> matching projects <span aria-hidden="true">·</span> ${total} in total`
      : `Showing <strong>${shown}</strong> of <strong>${total}</strong> projects`;

    grid.hidden = matched.length === 0;
    emptyEl.hidden = matched.length !== 0;
    loadMoreWrap.hidden = matched.length <= limit;
    clearBtn.hidden = !isFiltered();

    // Sync controls (needed after popstate / clear).
    if (search.value !== state.q) search.value = state.q;
    categorySelect.value = state.category;
    sortSelect.value = state.sort;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.platform === state.platform));
  }

  function update(patch, mode = 'push') {
    state = { ...state, ...patch };
    limit = pageSize;
    writeUrl(mode);
    render();
  }

  // ---- events ---------------------------------------------------------------
  let typingTimer;
  search.addEventListener('input', () => {
    state.q = search.value;
    limit = pageSize;
    render();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => writeUrl('replace'), 300);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.value) {
      e.preventDefault();
      update({ q: '' }, 'replace');
    }
  });

  categorySelect.addEventListener('change', () => update({ category: categorySelect.value }));
  sortSelect.addEventListener('change', () => update({ sort: sortSelect.value }));
  for (const chip of chips) {
    chip.addEventListener('click', () => update({ platform: chip.dataset.platform || '' }));
  }

  const clearAll = () => {
    update({ q: '', platform: '', category: '' });
    search.focus();
  };
  clearBtn.addEventListener('click', clearAll);
  clearEmptyBtn.addEventListener('click', clearAll);

  loadMoreBtn.addEventListener('click', () => {
    const firstNew = limit;
    limit += pageSize;
    render();
    // Move focus to the first newly revealed card for keyboard users.
    const visible = Array.from(grid.querySelectorAll('[data-project]:not([hidden])'));
    visible[firstNew]?.querySelector('a, [tabindex]')?.focus({ preventScroll: false });
  });

  // "/" focuses search (unless the user is already typing somewhere).
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    search.focus();
  });

  window.addEventListener('popstate', () => {
    state = readUrl();
    limit = pageSize;
    render();
  });

  render();
}
