/* ══════════════════════════════════════════
   home.js — 首页文章列表、分类筛选
   ══════════════════════════════════════════ */

(function() {
  let allArticles = [];
  let currentCategory = 'all';

  /* ── Fetch Articles Data ──────────────── */

  async function loadArticles() {
    try {
      const resp = await fetch('data/articles.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      allArticles = data.articles || [];
      renderArticles(allArticles);
    } catch (err) {
      console.warn('Failed to load articles:', err);
      document.getElementById('all-articles-grid').innerHTML =
        '<div class="empty-state"><p>文章加载失败，请稍后重试。</p></div>';
    }
  }

  /* ── Render Articles ──────────────────── */

  function renderArticles(articles) {
    const grid = document.getElementById('all-articles-grid');
    const empty = document.getElementById('empty-state');
    if (!grid) return;

    if (articles.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    grid.innerHTML = articles.map(a => `
      <article class="article-card reveal">
        <a href="articles/${a.slug}/" class="article-card-link">
          ${a.has_cover ? `<div class="article-card-cover"><img src="articles/${a.slug}/cover.png" alt="" loading="lazy" width="400" height="225"></div>` : ''}
          <div class="article-card-body">
          <div class="article-card-meta">
            <span class="article-card-date">${a.date_str}</span>
            <span class="article-card-category">${a.category_label}</span>
          </div>
          <h3 class="article-card-title">${escapeHTML(a.title)}</h3>
          <p class="article-card-excerpt">${escapeHTML(a.excerpt)}...</p>
          <div class="article-card-footer">
            <span class="article-card-readtime">${a.read_time} 分钟阅读</span>
          </div>
          </div>
        </a>
      </article>
    `).join('');

    // 触发 scroll-reveal
    requestAnimationFrame(() => {
      grid.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity 400ms var(--ease-out), transform 400ms var(--ease-out)';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      });
    });
  }

  /* ── Category Filter ──────────────────── */

  function setupCategoryFilter() {
    const pills = document.querySelectorAll('.category-pill');
    if (!pills.length) return;

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        // Update active state
        pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');

        // Filter
        currentCategory = pill.dataset.category;
        const filtered = currentCategory === 'all'
          ? allArticles
          : allArticles.filter(a => a.category_id === currentCategory);

        renderArticles(filtered);

        // Scroll to grid
        document.getElementById('all-articles-grid')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }

  /* ── Helpers ──────────────────────────── */

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Init ─────────────────────────────── */

  if (document.getElementById('all-articles-grid')) {
    loadArticles();
    setupCategoryFilter();
  }

  // Update article count in stats
  fetch('data/site.json')
    .then(r => r.json())
    .then(data => {
      const countEl = document.getElementById('article-count');
      if (countEl && data.stats) {
        countEl.textContent = data.stats.total_articles;
      }
    })
    .catch(() => {});
})();
