/* ═══════════════════════════════════════════
   Article Page JS
   Progress bar + sidebar article list
   ═══════════════════════════════════════════ */

(function() {
  /* ── Progress Bar ── */
  var bar = document.querySelector('.progress-bar-fill');
  if (bar) {
    window.addEventListener('scroll', function() {
      var scrollTop = document.documentElement.scrollTop;
      var scrollH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = scrollH > 0 ? Math.min(scrollTop / scrollH * 100, 100) : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ── Sidebar Article List ── */
  var nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  var currentSlug = '';
  var currentCat = '';
  try {
    var meta = JSON.parse(document.getElementById('article-meta').textContent);
    currentSlug = meta.slug || '';
    currentCat = meta.category || '';
  } catch(e) {}

  fetch('/data/articles.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var articles = data.articles || [];
      if (!articles.length) return;

      // Prefer same-category articles
      var catArticles = articles;
      if (currentCat) {
        catArticles = articles.filter(function(a) {
          return a.category_label === currentCat;
        });
      }
      if (catArticles.length < 3) catArticles = articles.slice(0, 20);

      nav.innerHTML = catArticles.map(function(a) {
        var cls = 'sidebar-link' + (a.slug === currentSlug ? ' is-active' : '');
        return '<a href="/articles/' + a.slug + '/" class="' + cls + '">' +
          a.title + '</a>';
      }).join('');
    })
    .catch(function() {
      nav.innerHTML = '<span class="sidebar-link" style="color:var(--muted)">加载失败</span>';
    });
})();
