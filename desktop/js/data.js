// One adapter over the Blog's published sources. No desktop content snapshot.
const sources = { articles: '/data/articles.json', site: '/data/site.json', home: '/index.html', about: '/about.html' };
async function read(path, json = false) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`无法读取共享内容（${path}）`);
  return json ? response.json() : new DOMParser().parseFromString(await response.text(), 'text/html');
}
const text = (root, selector) => root.querySelector(selector)?.textContent.trim() || '';
const chinese = (root, selector) => text(root, `${selector} [lang="zh"]`) || text(root, selector);
const publicURL = (raw, base) => {
  if (!raw) return '';
  const url = new URL(raw, new URL(base, location.origin));
  return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
};

export async function loadBlogContent() {
  const [index, meta, home, about] = await Promise.all([
    read(sources.articles, true), read(sources.site, true), read(sources.home), read(sources.about),
  ]);
  if (!Array.isArray(index.articles) || !meta.site || !meta.author) throw new Error('共享内容格式不完整');
  const projects = [...home.querySelectorAll('a.project-link')].map((card, order) => {
    const id = card.dataset.art || card.querySelector('[data-art]')?.dataset.art;
    if (!id) throw new Error('首页作品缺少稳定标识，请检查 data-art');
    return { id, title: chinese(card, '.project-caption h3'), english: text(card, '.project-caption h3 [lang="en"]'),
      description: chinese(card, '.project-caption p'), image: publicURL(card.querySelector('img')?.getAttribute('src'), sources.home),
      url: publicURL(card.getAttribute('href'), sources.home), order: order + 1,
      page: `/desktop/project.html?id=${encodeURIComponent(id)}` };
  });
  const positions = [...about.querySelectorAll('.pos-item')].map(row => ({
    title: chinese(row, '.pos-item__title'), organization: chinese(row, '.pos-item__org'),
  }));
  // Empty published collections remain empty: never silently use stale private copies.
  const categories = [...new Map(index.articles.map(a => [a.category_id, { id: a.category_id, label: a.category_label }])).values()]
    .map(c => ({ ...c, count: index.articles.filter(a => a.category_id === c.id).length }));
  const slogan = home.querySelector('.hero__slogan [lang="zh"]')?.cloneNode(true);
  slogan?.querySelectorAll('br').forEach(br => br.replaceWith('，'));
  return { site: meta.site, author: { ...meta.author,
      identity: chinese(home, '.hero__kicker'), intro: slogan?.textContent.trim() || '',
      book: { ...meta.author.book, title: text(about, '.book-meta h3') ? `《${text(about, '.book-meta h3')}》` : meta.author.book.title },
      ai_school: { ...meta.author.ai_school, name: text(about, '.ns-card h3') || meta.author.ai_school.name },
    }, positions, categories, articles: index.articles, projects, updated: index.updated, sources };
}
