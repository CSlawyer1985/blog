import { WALLPAPERS } from './wallpapers.js';
import { el, tool, icon, symbol, APPS, formatDate, dateKey, emptyState, downloadBlob } from './ui.js';

const AUTHOR_PORTRAIT = '/assets/portrait-about.webp';
const ARTICLE_ROOT = '/articles/';
const assetArticle = article => `${ARTICLE_ROOT}${article.slug}/index.html`;

function sidebarItem(label, glyph, action, selected = false, count) {
  return el('button', { class: `sidebar-item${selected ? ' is-selected' : ''}`, onclick: action }, symbol(glyph), label, count !== undefined ? el('span', { class: 'sidebar-count', text: count }) : null);
}
function sidebarGroup(title, children) { return el('section', { class: 'sidebar-group' }, el('div', { class: 'sidebar-heading', text: title }), children); }
function searchBox(label, value, onInput) {
  const input = el('input', { placeholder: label, value: value || '', 'aria-label': label, oninput: event => onInput(event.target.value) });
  return el('label', { class: 'app-search' }, symbol('magnifyingglass'), input);
}

export function registerApps(os) {
  const data = os.data, articlesById = new Map(data.articles.map(a => [a.id, a]));
  const allAlbums = [
    { id: 'projects', name: '作品集', items: data.projects.map(p => ({ id: p.id, title: p.title, src: p.image, projectId: p.id })) },
    { id: 'covers', name: '文章封面', items: data.articles.filter(a => a.has_cover).map(a => ({ id: a.id, title: a.title, src: `${ARTICLE_ROOT}${a.slug}/${a.cover_file || 'cover.png'}`, articleId: a.id })) },
    { id: 'about', name: '关于陈石', items: [{ id: 'portrait', title: '陈石', src: AUTHOR_PORTRAIT }, { id: 'book', title: data.author.book.title, src: '/assets/book-cover.webp' }] },
  ];
  os.albums = allAlbums;
  const favorites = () => new Set(os.preferences.favorites);
  const articleLink = id => new URL(`?article=${encodeURIComponent(id)}`, location.href.split('?')[0]).href;

  os.loadArticle = async (article) => {
    if (!os.articleCache.has(article.id)) {
      os.articleCache.set(article.id, fetch(assetArticle(article)).then(response => { if (!response.ok) throw new Error('无法读取文章'); return response.text(); }).then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html'), body = doc.querySelector('.article-body');
        if (!body) throw new Error('文章正文缺失');
        body.querySelectorAll('script,iframe,form').forEach(node => node.remove());
        for (const node of body.querySelectorAll('*')) for (const attr of [...node.attributes]) if (attr.name.startsWith('on')) node.removeAttribute(attr.name);
        const base = new URL(assetArticle(article), location.href);
        for (const image of body.querySelectorAll('img')) { image.src = new URL(image.getAttribute('src'), base).href; image.loading = 'lazy'; }
        for (const anchor of body.querySelectorAll('a[href]')) { anchor.href = new URL(anchor.getAttribute('href'), base).href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
        return body.outerHTML;
      }).catch(error => { os.articleCache.delete(article.id); throw error; }));
    }
    return os.articleCache.get(article.id);
  };
  os.readArticle = id => os.open('notes', { articleId: id, category: 'all', showList: false });
  os.toggleFavorite = (id) => { const current = favorites(); current.has(id) ? current.delete(id) : current.add(id); os.preferences.favorites = [...current]; os.savePreferences(); os.toast(current.has(id) ? '已加入个人收藏' : '已从个人收藏移除'); };

  function profileNode() {
    return el('article', { class: 'note-prose' },
      el('div', { class: 'profile-header' }, el('img', { class: 'profile-portrait', src: AUTHOR_PORTRAIT, alt: '陈石', width: 72, height: 72 }), el('div', {}, el('h2', { class: 'profile-name', text: data.author.name }), el('p', { class: 'profile-identity', text: data.author.identity }))),
      el('p', { class: 'profile-intro', text: data.author.intro }),
      el('div', { class: 'profile-positions' }, data.positions.slice(0, 3).map(p => el('div', {}, el('strong', { text: p.title }), p.organization))),
      el('p', { class: 'profile-intro', text: `著有${data.author.book.title}。发起「${data.author.ai_school.name}」。` }),
      el('div', { class: 'profile-actions' }, el('button', { class: 'soft-button primary', onclick: () => os.readArticle(data.articles[0].id) }, symbol('note.text'), '读一篇文章'), el('button', { class: 'soft-button', onclick: () => os.open('finder', { folder: 'works' }) }, symbol('folder'), '看看我的作品'), el('button', { class: 'soft-button', onclick: () => os.browse('/about.html', '关于陈石') }, '完整介绍', symbol('arrow.right'))),
      el('div', { class: 'profile-footnote' }, `宁波，中国 · ${data.articles.length} 篇文章 · ${data.projects.length} 个作品`, el('div', {}, el('a', { href: `mailto:${data.site.email}`, text: data.site.email })))
    );
  }

  os.renderers.notes = w => {
    w.props.category ||= 'all'; w.props.articleId ||= 'about'; w.props.query ||= '';
    w.setTitle('备忘录', '陈石 · 法与 AI'); w.toolbar.classList.add('notes-toolbar');
    const group = el('div', { class: 'tool-group' }, tool('sidebar.left', '显示或隐藏笔记列表', () => { if (w.node.clientWidth <= 460) w.props.showList = !w.props.showList; else w.props.sidebarHidden = !w.props.sidebarHidden; w.refresh(); }), tool(w.props.viewMode === 'gallery' ? 'list.bullet' : 'square.grid.2x2', '切换列表或画廊', () => { w.props.viewMode = w.props.viewMode === 'gallery' ? 'list' : 'gallery'; w.refresh(); }));
    const share = tool('square.and.arrow.up', '复制当前笔记链接', () => w.props.articleId === 'about' ? os.copy(new URL('/about.html', location.href).href) : os.copy(articleLink(w.props.articleId)));
    const queryInput = searchBox('搜索标题与摘要', w.props.query, value => { w.props.query = value; refreshList(); os.scheduleSave(); });
    w.tools.append(group, el('span', { class: 'toolbar-divider' }), share, queryInput);
    const aside = el('aside', { class: 'app-sidebar', 'aria-label': '备忘录分类' }, el('div', { class: 'sidebar-author' }, el('img', { src: '/assets/portrait.webp', alt: '', width: 30, height: 30 }), el('div', {}, el('strong', { text: '陈石的备忘录' }), el('small', { text: '文章与个人笔记' }))));
    aside.hidden = !!w.props.sidebarHidden;
    const chooseCategory = category => { w.props.category = category; w.props.query = ''; w.props.viewMode = 'list'; w.props.showList = true; w.refresh(); };
    aside.append(sidebarGroup('个人', [sidebarItem('关于陈石', 'note.text', () => { w.props.articleId = 'about'; w.props.viewMode = 'list'; w.props.showList = false; w.refresh(); }, w.props.articleId === 'about'), sidebarItem('我的收藏', 'star', () => chooseCategory('favorites'), w.props.category === 'favorites', favorites().size)]), sidebarGroup('文章', [sidebarItem('所有文章', 'folder', () => chooseCategory('all'), w.props.category === 'all', data.articles.length), ...data.categories.map(c => sidebarItem(c.label, 'folder', () => chooseCategory(c.id), w.props.category === c.id, data.articles.filter(a => a.category_id === c.id).length))]));
    const list = el('section', { class: 'notes-list', 'aria-label': '文章列表' }), reader = el('section', { class: 'note-reader', 'aria-label': '笔记正文' });
    const layout = el('div', { class: `app-layout notes-layout${w.props.showList ? ' is-showing-list' : ''}` }, aside, list, reader);
    let loadVersion = 0, displayedId = w.props.articleId;
    w.props.readingPositions ||= {};
    const rememberPosition = () => { if (reader.childElementCount && !reader.classList.contains('notes-gallery')) w.props.readingPositions[displayedId] = reader.scrollTop; };
    const restorePosition = () => { const id = displayedId; requestAnimationFrame(() => { if (id === displayedId && reader.isConnected) reader.scrollTop = w.props.readingPositions[id] || 0; }); };
    const select = id => { rememberPosition(); w.props.articleId = id; w.props.viewMode = 'list'; w.props.showList = false; layout.classList.remove('is-showing-list'); refreshList(); renderReader(); os.scheduleSave(); };
    const renderReader = async () => {
      const token = ++loadVersion;
      displayedId = w.props.articleId;
      if (w.props.articleId === 'about') { reader.replaceChildren(el('div', { class: 'note-date-heading', text: '从这里认识我' }), profileNode()); restorePosition(); return; }
      const article = articlesById.get(w.props.articleId);
      if (!article) { reader.replaceChildren(emptyState('notes', '这篇文章暂时无法打开', '可以从左侧选择另一篇文章。')); return; }
      const prose = el('article', { class: 'note-prose' }, el('h2', { class: 'note-title', text: article.title }), el('p', { class: 'note-subtitle', text: `${article.category_label} · ${article.char_count.toLocaleString()} 字 · 约 ${article.read_time} 分钟阅读` }), el('div', { class: 'article-body', text: '正在读取文章…' }));
      reader.replaceChildren(el('div', { class: 'note-date-heading', text: formatDate(article.date) }), prose);
      try {
        const html = await os.loadArticle(article);
        if (token !== loadVersion || !reader.isConnected) return;
        const parsed = new DOMParser().parseFromString(html, 'text/html'); prose.lastElementChild.replaceWith(document.importNode(parsed.body.firstElementChild, true)); restorePosition();
      } catch { if (token === loadVersion && reader.isConnected) prose.lastElementChild.replaceWith(el('div', { class: 'empty-state' }, el('h2', { text: '暂时无法读取文章' }), el('p', { text: '请稍后重试，或在浏览器中打开。' }), el('button', { class: 'soft-button', text: '重试', onclick: renderReader }))); }
    };
    const refreshList = () => {
      const query = w.props.query.trim().toLocaleLowerCase();
      const matches = data.articles.filter(a => (w.props.category === 'all' || (w.props.category === 'favorites' ? favorites().has(a.id) : a.category_id === w.props.category)) && (!query || `${a.title} ${a.excerpt}`.toLocaleLowerCase().includes(query)));
      if (w.props.viewMode === 'gallery') {
        list.hidden = true; reader.classList.add('notes-gallery'); reader.replaceChildren(...matches.map(a => el('button', { class: 'gallery-note', onclick: () => { w.props.articleId = a.id; w.props.viewMode = 'list'; w.props.showList = false; w.refresh(); } }, el('div', { class: 'gallery-note-preview', text: a.excerpt }), el('div', { class: 'gallery-note-title', text: a.title }))));
        if (!matches.length) reader.append(emptyState('notes', '没有找到笔记', '试试其他关键词或文章分类。')); return;
      }
      reader.classList.remove('notes-gallery'); list.hidden = false;
      list.replaceChildren(el('div', { class: 'list-heading' }, query ? '搜索结果' : w.props.category === 'all' ? '所有文章' : w.props.category === 'favorites' ? '个人收藏' : data.categories.find(c => c.id === w.props.category)?.label || '文章', el('span', { text: matches.length })));
      if (!query && w.props.category === 'all') list.append(el('button', { class: `note-item${w.props.articleId === 'about' ? ' is-selected' : ''}`, onclick: () => select('about') }, el('strong', {}, symbol('pin.fill'), ' 从这里认识我'), el('p', { text: '陈石 · 商事律师 × AI Builder' })));
      for (const article of matches) {
        const button = el('button', { class: `note-item${w.props.articleId === article.id ? ' is-selected' : ''}`, dataset: { articleId: article.id }, onclick: () => select(article.id) }, el('strong', { text: article.title }), el('p', {}, el('span', { class: 'note-date', text: article.date.slice(5).replace('-', '/') }), article.excerpt));
        button.addEventListener('contextmenu', e => { e.preventDefault(); os.showMenu([{ label: '打开笔记', action: () => select(article.id) }, { label: '在浏览器中打开', action: () => os.browse(assetArticle(article), article.title) }, { label: '复制文章链接', action: () => os.copy(articleLink(article.id)) }, { label: favorites().has(article.id) ? '取消个人收藏' : '加入个人收藏', action: () => { os.toggleFavorite(article.id); w.refresh(); } }, { label: '下载正文文本', action: () => downloadArticle(article) }], e.clientX, e.clientY); });
        list.append(button);
      }
      if (!matches.length) list.append(el('div', { class: 'empty-state' }, el('p', { text: w.props.category === 'favorites' ? '在文章上右键，可以加入个人收藏。' : '没有匹配的文章。' })));
    };
    w.content.replaceChildren(layout); refreshList(); if (w.props.viewMode !== 'gallery') renderReader();
    w.cleanup = () => { rememberPosition(); loadVersion++; };
  };
  async function downloadArticle(article) {
    try { const html = await os.loadArticle(article), doc = new DOMParser().parseFromString(html, 'text/html'); downloadBlob(new Blob([`${article.title}\n${article.date}\n\n${doc.body.innerText || doc.body.textContent}`], { type: 'text/plain;charset=utf-8' }), `${article.title}.txt`); } catch { os.toast('正文暂时无法下载，请稍后再试。'); }
  }

  function folderName(id) { return ({ root: '陈石的桌面', articles: '文章', works: '作品', photos: '公开相簿' })[id] || data.categories.find(c => c.id === id)?.label || '文件夹'; }
  function folderItems(id) {
    if (id === 'root') return [{ id: 'articles', title: '文章', type: 'folder', count: data.articles.length }, { id: 'works', title: '作品', type: 'folder', count: data.projects.length }, { id: 'photos', title: '公开相簿', type: 'photos' }, { id: 'about', title: '关于陈石', type: 'about' }];
    if (id === 'articles') return data.categories.map(c => ({ id: c.id, title: c.label, type: 'folder', count: data.articles.filter(a => a.category_id === c.id).length }));
    if (id === 'works') return data.projects.map(p => ({ ...p, type: 'project' }));
    if (id === 'photos') return allAlbums.map(a => ({ id: a.id, title: a.name, type: 'album', count: a.items.length }));
    return data.articles.filter(a => a.category_id === id).map(a => ({ id: a.id, title: a.title, date: a.date, type: 'article' }));
  }
  function openFile(item, w) {
    if (item.type === 'folder') { if (!w) return os.open('finder', { folder: item.id }); w.props.history ||= []; w.props.history.push(w.props.folder); w.props.folder = item.id; w.props.query = ''; w.refresh(); }
    if (item.type === 'project') os.browse(item.page, item.title);
    if (item.type === 'article') os.readArticle(item.id);
    if (item.type === 'photos') os.open('photos');
    if (item.type === 'album') os.open('photos', { albumId: item.id, photoIndex: null });
    if (item.type === 'about') os.browse('/about.html', '关于陈石');
  }
  os.renderers.finder = w => {
    w.props.folder ||= 'root'; w.props.view ||= 'grid'; w.props.history ||= []; w.props.query ||= '';
    w.setTitle(folderName(w.props.folder));
    const back = tool('chevron.left', '返回上一级', () => { w.props.folder = w.props.history.pop() || 'root'; w.refresh(); }, { disabled: w.props.folder === 'root' && !w.props.history.length });
    w.tools.append(back, tool('square.grid.2x2', '图标视图', () => { w.props.view = 'grid'; w.refresh(); }, { class: `tool-button${w.props.view === 'grid' ? ' is-active' : ''}` }), tool('list.bullet', '列表视图', () => { w.props.view = 'list'; w.refresh(); }, { class: `tool-button${w.props.view === 'list' ? ' is-active' : ''}` }), searchBox('搜索此文件夹', w.props.query, value => { w.props.query = value; fill(); }));
    const aside = el('aside', { class: 'app-sidebar' }, sidebarGroup('个人收藏', [sidebarItem('我的桌面', 'rectangle.on.rectangle', () => { w.props.folder = 'root'; w.refresh(); }, w.props.folder === 'root'), sidebarItem('文章', 'note.text', () => { w.props.folder = 'articles'; w.refresh(); }, w.props.folder === 'articles'), sidebarItem('作品', 'folder', () => { w.props.folder = 'works'; w.refresh(); }, w.props.folder === 'works'), sidebarItem('公开相簿', 'photo.on.rectangle', () => { w.props.folder = 'photos'; w.refresh(); }, w.props.folder === 'photos')]), sidebarGroup('站点', [sidebarItem('关于陈石', 'info.circle', () => os.browse('/about.html', '关于陈石')), sidebarItem('完整博客', 'globe', () => os.browse('/', '陈石 · 法与 AI'))]));
    const main = el('div', { class: 'finder-main', tabindex: '0', 'aria-label': folderName(w.props.folder) }), footer = el('footer', { class: 'finder-footer' });
    function fill() {
      const query = w.props.query.trim().toLowerCase(), items = folderItems(w.props.folder).filter(f => f.title.toLowerCase().includes(query));
      const grid = el('div', { class: w.props.view === 'grid' ? 'finder-grid' : 'finder-list' });
      for (const item of items) {
        const asset = item.type === 'folder' ? 'folder' : item.type === 'project' || item.type === 'about' ? 'safari' : item.type === 'album' || item.type === 'photos' ? 'photos' : 'document';
        const button = el('button', { class: `file-item${w.props.selectedId === item.id ? ' is-selected' : ''}`, dataset: { fileId: item.id }, title: item.title }, el('img', { src: item.type === 'project' ? item.image : icon(asset), class: item.type === 'project' ? 'file-thumbnail' : '', alt: '', width: 60, height: 60, loading: 'lazy' }), el('span', { class: 'file-name', text: item.title }), w.props.view === 'list' ? el('span', { class: 'file-meta', text: item.date || (item.count !== undefined ? `${item.count} 项` : item.type === 'project' ? '网页' : '') }) : null);
        button.addEventListener('click', event => { w.props.selectedId = item.id; for (const node of grid.children) node.classList.toggle('is-selected', node.dataset.fileId === item.id); if (event.pointerType === 'touch') openFile(item, w); });
        button.addEventListener('dblclick', () => openFile(item, w));
        button.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); openFile(item, w); } if (e.key === ' ') { e.preventDefault(); previewFile(item); } });
        button.addEventListener('contextmenu', e => { e.preventDefault(); os.showMenu([{ label: '打开', action: () => openFile(item, w) }, { label: '快速预览', action: () => previewFile(item) }, ...(item.type === 'article' ? [{ label: '复制文章链接', action: () => os.copy(articleLink(item.id)) }, { label: '下载正文文本', action: () => downloadArticle(articlesById.get(item.id)) }] : item.type === 'project' ? [{ label: '复制项目官网链接', action: () => os.copy(item.url) }] : [])], e.clientX, e.clientY); });
        grid.append(button);
      }
      main.replaceChildren(items.length ? grid : emptyState('folder', '文件夹中没有匹配项目', '试试其他关键词。'));
      footer.replaceChildren(el('span', { text: `我的桌面 › ${folderName(w.props.folder)}` }), el('span', { text: `${items.length} 个项目` }));
    }
    function previewFile(item) {
      if (item.type === 'project') os.quickLook(item.image, item.title);
      else if (item.type === 'article') { const a = articlesById.get(item.id); os.showOverlay(el('div', { class: 'quick-look' }, el('div', { class: 'quick-look-header' }, a.title, tool('xmark', '关闭预览', () => os.dismissOverlay())), el('div', { class: 'note-prose' }, el('p', { class: 'profile-intro', text: a.excerpt }), el('button', { class: 'soft-button primary', text: '在备忘录中打开', onclick: () => os.readArticle(a.id) }))), '文章预览'); }
      else openFile(item, w);
    }
    fill(); w.content.replaceChildren(el('div', { class: 'app-layout' }, aside, el('div', { class: 'finder-body' }, main, footer)));
  };

  os.browse = (url, title = '陈石 · 法与 AI') => {
    const normal = localPage(url); if (!normal) return os.toast('浏览器只打开本站发布的内容。');
    let existing = [...os.windows.values()].reverse().find(w => w.app === 'browser');
    if (existing) {
      existing.props.tabs ||= [];
      const found = existing.props.tabs.findIndex(tab => tab.url === normal);
      if (found >= 0) existing.props.activeTab = found;
      else { existing.props.tabs.push({ url: normal, title, history: [normal], index: 0 }); existing.props.activeTab = existing.props.tabs.length - 1; }
      os.restore(existing); existing.refresh(); return existing;
    }
    return os.open('browser', { tabs: [{ url: normal, title, history: [normal], index: 0 }], activeTab: 0 });
  };
  function localPage(raw) {
    try {
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin) return null;
      const allowed = /^\/(?:index\.html)?$/.test(url.pathname) || /^\/(?:about|privacy)(?:\.html)?\/?$/.test(url.pathname)
        || /^\/(?:articles|categories)(?:\/|$)/.test(url.pathname) || /^\/desktop\/project(?:\.html)?\/?$/.test(url.pathname);
      return allowed ? url.href : null;
    } catch { return null; }
  }
  os.renderers.browser = w => {
    w.props.tabs ||= [{ url: new URL('/', location.href).href, title: '陈石 · 法与 AI', history: [new URL('/', location.href).href], index: 0 }];
    if (!w.props.tabs.length) w.props.tabs.push({ url: new URL('/', location.href).href, title: '陈石 · 法与 AI', history: [new URL('/', location.href).href], index: 0 });
    w.props.activeTab = Math.max(0, Math.min(w.props.tabs.length - 1, w.props.activeTab || 0));
    const tab = w.props.tabs[w.props.activeTab]; if (!localPage(tab.url)) tab.url = new URL('/', location.href).href;
    const renderedURL = tab.url; tab.scrollPositions ||= {};
    w.setTitle(''); w.toolbar.classList.add('browser-toolbar');
    const navigate = (url, title, add = true) => { const safe = localPage(url); if (!safe) return; if (add) { tab.history = (tab.history || [tab.url]).slice(0, (tab.index || 0) + 1); tab.history.push(safe); tab.index = tab.history.length - 1; } tab.url = safe; if (title) tab.title = title; w.refresh(); };
    const address = el('input', { readonly: true, value: `${new URL(data.site.url).host}${new URL(tab.url).pathname}${new URL(tab.url).search}`, 'aria-label': '本站页面地址，仅用于选择和复制', onclick: e => e.target.select() });
    w.tools.append(tool('chevron.left', '后退', () => { tab.index--; tab.url = tab.history[tab.index]; w.refresh(); }, { disabled: !tab.index }), tool('chevron.right', '前进', () => { tab.index++; tab.url = tab.history[tab.index]; w.refresh(); }, { disabled: (tab.index || 0) >= (tab.history?.length || 1) - 1 }), el('div', { class: 'browser-address' }, symbol('globe'), address), tool('arrow.clockwise', '重新载入页面', () => iframe.src = tab.url), tool('square.and.arrow.up', '复制页面链接', () => os.copy(tab.url)), tool('plus', '新建标签页', () => { w.props.tabs.push({ url: new URL('/', location.href).href, title: '陈石 · 法与 AI', history: [new URL('/', location.href).href], index: 0 }); w.props.activeTab = w.props.tabs.length - 1; w.refresh(); }));
    const tabs = el('nav', { class: 'browser-tabs', 'aria-label': '浏览器标签页' });
    w.props.tabs.forEach((t, index) => {
      const close = el('button', { class: 'tab-close', 'aria-label': `关闭标签页：${t.title}`, onclick: e => { e.stopPropagation(); w.props.tabs.splice(index, 1); if (!w.props.tabs.length) return os.close(w); w.props.activeTab = Math.min(w.props.activeTab, w.props.tabs.length - 1); w.refresh(); } }, symbol('xmark'));
      tabs.append(el('div', { class: `browser-tab${index === w.props.activeTab ? ' is-active' : ''}`, role: 'tab', tabindex: '0', 'aria-selected': index === w.props.activeTab, onclick: () => { w.props.activeTab = index; w.refresh(); }, onkeydown: e => { if (e.key === 'Enter') { w.props.activeTab = index; w.refresh(); } } }, close, symbol('globe'), el('span', { text: t.title })));
    });
    const loader = el('div', { class: 'browser-loading' }), iframe = el('iframe', { class: 'browser-content', src: tab.url, title: tab.title, referrerPolicy: 'same-origin' });
    let frameCleanup = () => {}, boundDocument = null;
    const bindFrame = () => {
      try { if (!iframe.contentDocument || iframe.contentDocument === boundDocument) return; } catch { return; }
      loader.remove(); frameCleanup();
      try {
        const frame = iframe.contentWindow, doc = iframe.contentDocument;
        if (!localPage(frame.location.href) || !doc) return;
        boundDocument = doc;
        const focus = () => os.focus(w);
        const updateTitle = () => {
          if (!doc.title || tab.title === doc.title) return;
          tab.title = doc.title;
          const label = tabs.children[w.props.activeTab]?.querySelector('span:last-child');
          if (label) label.textContent = tab.title;
          os.scheduleSave();
        };
        const click = event => {
          const link = event.target.closest?.('a[href]');
          if (!link || link.hasAttribute('download') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const url = new URL(link.href, frame.location.href);
          if (url.origin === location.origin && /^\/desktop\/?$/.test(url.pathname)) {
            event.preventDefault(); os.toast('你已经在桌面版中。'); return;
          }
          if (link.target === '_top') return;
          const safe = localPage(url.href);
          if (!safe) {
            if (['http:', 'https:'].includes(url.protocol)) { event.preventDefault(); window.open(url.href, '_blank', 'noopener,noreferrer'); }
            return;
          }
          if (url.pathname === frame.location.pathname && url.search === frame.location.search && url.hash) return;
          event.preventDefault();
          link.target === '_blank' ? os.browse(safe, link.textContent.trim()) : navigate(safe, link.textContent.trim());
        };
        doc.addEventListener('pointerdown', focus, true); doc.addEventListener('focusin', focus, true);
        doc.addEventListener('click', click, true);
        const observer = new MutationObserver(updateTitle);
        observer.observe(doc, { childList: true, subtree: true, characterData: true });
        frameCleanup = () => { observer.disconnect(); doc.removeEventListener('pointerdown', focus, true); doc.removeEventListener('focusin', focus, true); doc.removeEventListener('click', click, true); };
        updateTitle();
        const position = tab.scrollPositions[renderedURL];
        if (position) frame.scrollTo(position.x, position.y);
      } catch { /* External or unavailable documents never receive desktop handlers. */ }
    };
    iframe.addEventListener('load', bindFrame);
    // Async third-party embeds on the ordinary Blog must not delay its own links.
    const readiness = setInterval(() => { bindFrame(); if (boundDocument) clearInterval(readiness); }, 16);
    const message = event => {
      if (event.origin !== location.origin || event.source !== iframe.contentWindow || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'chenshi:frame-focus') os.focus(w);
      if (event.data.type === 'chenshi:navigate' && typeof event.data.url === 'string') navigate(event.data.url, event.data.title);
      if (event.data.type === 'chenshi:frame-ready' && typeof event.data.title === 'string' && localPage(event.data.url)) { tab.title = event.data.title; const label = tabs.children[w.props.activeTab]?.querySelector('span:last-child'); if (label) label.textContent = tab.title; os.scheduleSave(); }
    };
    window.addEventListener('message', message); w.cleanup = () => { try { tab.scrollPositions[renderedURL] = { x: iframe.contentWindow.scrollX, y: iframe.contentWindow.scrollY }; } catch { /* Origin guard also applies to document state. */ } clearInterval(readiness); frameCleanup(); window.removeEventListener('message', message); };
    w.content.replaceChildren(el('div', { class: 'browser-pane' }, tabs, el('div', { class: 'browser-frame-wrap' }, iframe, loader)));
  };

  os.renderers.photos = w => {
    w.setTitle('照片', '公开相簿'); w.props.albumId ||= 'albums';
    const album = allAlbums.find(a => a.id === w.props.albumId), index = w.props.photoIndex;
    const goBack = () => { if (w.props.photoIndex !== null && w.props.photoIndex !== undefined) w.props.photoIndex = null; else w.props.albumId = 'albums'; w.refresh(); };
    w.tools.append(tool('chevron.left', '返回相簿', goBack, { disabled: w.props.albumId === 'albums' }), tool('square.grid.2x2', '所有相簿', () => { w.props.albumId = 'albums'; w.props.photoIndex = null; w.refresh(); }));
    if (album && index !== null && index !== undefined && album.items[index]) {
      const item = album.items[index];
      w.tools.append(tool('magnifyingglass', '原尺寸或适合窗口', () => { w.props.zoomed = !w.props.zoomed; w.refresh(); }), tool('info.circle', '查看图片信息', () => os.toast(item.title)), tool('square.and.arrow.up', '在浏览器中打开相关内容', () => item.articleId ? os.browse(assetArticle(articlesById.get(item.articleId)), item.title) : item.projectId ? os.browse(data.projects.find(p => p.id === item.projectId).page, item.title) : os.browse('/about.html', '关于陈石')));
      const previous = () => { w.props.photoIndex = (index - 1 + album.items.length) % album.items.length; w.props.zoomed = false; w.refresh(); };
      const next = () => { w.props.photoIndex = (index + 1) % album.items.length; w.props.zoomed = false; w.refresh(); };
      const image = el('img', { src: item.src, alt: item.title }); image.addEventListener('error', () => os.toast('这张图片暂时无法载入，可以继续浏览。'));
      const detail = el('div', { class: 'photo-detail', tabindex: '0', onkeydown: e => { if (e.key === 'ArrowLeft') previous(); if (e.key === 'ArrowRight') next(); } }, el('div', { class: `photo-large${w.props.zoomed ? ' is-zoomed' : ''}` }, image), el('button', { class: 'photo-detail-nav previous', 'aria-label': '上一张照片', onclick: previous }, symbol('chevron.left')), el('button', { class: 'photo-detail-nav next', 'aria-label': '下一张照片', onclick: next }, symbol('chevron.right')), el('div', { class: 'photo-info' }, el('span', { class: 'photo-caption', text: item.title }), `${index + 1} / ${album.items.length}`));
      image.addEventListener('contextmenu', e => { e.preventDefault(); os.showMenu([{ label: '快速预览', action: () => os.quickLook(item.src, item.title) }, { label: '设为桌面壁纸', action: () => { os.elements.wallpaper.style.backgroundImage = `url("${item.src}")`; os.preferences.customWallpaper = item.src; os.savePreferences(); } }, { label: '下载图片', action: () => { const a = el('a', { href: item.src, download: item.src.split('/').at(-1) }); a.click(); } }], e.clientX, e.clientY); });
      w.content.replaceChildren(detail); return;
    }
    const aside = el('aside', { class: 'app-sidebar' }, sidebarGroup('照片', [sidebarItem('所有相簿', 'rectangle.stack', () => { w.props.albumId = 'albums'; w.refresh(); }, !album)]), sidebarGroup('我的相簿', allAlbums.map(a => sidebarItem(a.name, 'photo.on.rectangle', () => { w.props.albumId = a.id; w.props.photoIndex = null; w.refresh(); }, w.props.albumId === a.id, a.items.length))));
    const scroll = el('div', { class: 'photos-scroll' });
    if (!album) {
      scroll.append(el('div', { class: 'album-grid' }, allAlbums.map(a => el('button', { class: 'album-card', onclick: () => { w.props.albumId = a.id; w.props.photoIndex = null; w.refresh(); } }, el('img', { src: a.items[0].src, alt: a.name, width: 320, height: 256 }), el('strong', { text: a.name }), el('span', { text: `${a.items.length} 张` })))));
    } else {
      const grid = el('div', { class: 'photo-grid' });
      album.items.forEach((item, position) => { const node = el('button', { class: 'photo-thumb', title: item.title, 'aria-label': `打开照片：${item.title}`, onclick: event => { w.props.selectedPhoto = position; for (const sibling of grid.children) sibling.classList.toggle('is-selected', sibling === node); if (event.pointerType === 'touch') { w.props.scrollPosition = scroll.scrollTop; w.props.photoIndex = position; w.props.zoomed = false; w.refresh(); } }, ondblclick: () => { w.props.scrollPosition = scroll.scrollTop; w.props.photoIndex = position; w.props.zoomed = false; w.refresh(); }, onkeydown: e => { if (e.key === 'Enter') { w.props.photoIndex = position; w.refresh(); } } }, el('img', { src: item.src, alt: item.title, loading: 'lazy', width: 200, height: 200 })); grid.append(node); });
      scroll.append(grid); queueMicrotask(() => scroll.scrollTop = w.props.scrollPosition || 0);
    }
    w.content.replaceChildren(el('div', { class: 'app-layout' }, aside, el('div', { class: 'photos-main' }, el('div', { class: 'photos-heading' }, el('h2', { text: album?.name || '相簿' }), el('span', { text: album ? `${album.items.length} 张照片` : '记录创作与思考' })), scroll)));
  };

  os.renderers.calendar = w => {
    w.setTitle('日历', '文章发布日期'); const today = new Date();
    w.props.view ||= w.node.clientWidth <= 460 ? 'agenda' : 'month';
    w.props.month ||= `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = w.props.month.split('-').map(Number), dates = data.articles.filter(a => a.date.startsWith(w.props.month));
    const setMonth = delta => { const d = new Date(year, month - 1 + delta, 1); w.props.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; w.refresh(); };
    w.tools.append(tool('square.grid.2x2', '月视图', () => { w.props.view = 'month'; w.refresh(); }), tool('list.bullet', '日程列表', () => { w.props.view = 'agenda'; w.refresh(); }));
    const aside = el('aside', { class: 'app-sidebar' }, sidebarGroup('日历', [sidebarItem('文章发布', 'calendar', () => {}, true, data.articles.length)]), el('p', { class: 'calendar-sidebar-note', text: '按原博客的真实发布日期整理。点击文章即可阅读。' }), sidebarGroup('分类', data.categories.map(c => sidebarItem(c.label, 'note.text', () => os.open('notes', { category: c.id, articleId: data.articles.find(a => a.category_id === c.id)?.id }), false))), el('div', { class: 'calendar-mini-label', text: `${year} 年 · ${month} 月` }));
    const main = el('div', { class: 'calendar-main' }, el('div', { class: 'calendar-heading' }, el('h2', {}, `${month}月`, el('span', { text: year })), el('div', { class: 'calendar-controls' }, tool('chevron.left', '上个月', () => setMonth(-1)), el('button', { class: 'calendar-today', text: '今天', onclick: () => { w.props.month = dateKey(today).slice(0, 7); w.props.selectedDate = dateKey(today); w.refresh(); } }), tool('chevron.right', '下个月', () => setMonth(1)))));
    if (w.props.view === 'agenda') {
      const list = el('div', { class: 'calendar-agenda' }); let previous;
      for (const article of [...dates].sort((a, b) => a.date.localeCompare(b.date))) { if (article.date !== previous) list.append(el('div', { class: 'agenda-date', text: formatDate(article.date) })); previous = article.date; list.append(el('button', { class: 'agenda-item', text: article.title, onclick: () => os.readArticle(article.id) })); }
      main.append(dates.length ? list : emptyState('calendar', '这个月没有发布文章', '可以切换月份，或从备忘录阅读所有文章。'));
    } else {
      main.append(el('div', { class: 'calendar-weekdays' }, ['日', '一', '二', '三', '四', '五', '六'].map(x => el('span', { text: x }))));
      const grid = el('div', { class: 'calendar-grid' }), first = new Date(year, month - 1, 1), days = new Date(year, month, 0).getDate();
      const rows = Math.ceil((first.getDay() + days) / 7);
      for (let i = 0; i < rows * 7; i++) {
        const date = new Date(year, month - 1, 1 - first.getDay() + i), key = dateKey(date), events = data.articles.filter(a => a.date === key);
        const day = el('div', { class: `calendar-day${date.getMonth() !== month - 1 ? ' is-other-month' : ''}${w.props.selectedDate === key ? ' is-selected' : ''}` }, el('button', { class: `calendar-number${key === dateKey(today) ? ' is-today' : ''}`, text: date.getDate(), 'aria-label': formatDate(key), onclick: () => { w.props.selectedDate = key; w.refresh(); } }));
        for (const article of events.slice(0, 2)) day.append(el('button', { class: 'calendar-event', text: article.title, title: article.title, onclick: () => os.readArticle(article.id) }));
        if (events.length > 2) day.append(el('button', { class: 'calendar-more', text: `另外 ${events.length - 2} 篇`, onclick: () => {
          os.showOverlay(el('div', { class: 'quick-look' }, el('div', { class: 'quick-look-header' }, `${formatDate(key)} · ${events.length} 篇文章`, tool('xmark', '关闭日期详情', () => os.dismissOverlay())), el('div', { class: 'calendar-agenda' }, events.map(a => el('button', { class: 'agenda-item', text: a.title, onclick: () => os.readArticle(a.id) })))), '当天发布的文章');
        } }));
        grid.append(day);
      }
      main.append(grid);
    }
    w.content.replaceChildren(el('div', { class: 'calendar-app' }, aside, main));
  };

  os.renderers.appearance = w => {
    w.setTitle('外观与壁纸');
    const wallpapers = WALLPAPERS;
    const page = el('div', { class: 'settings-main' }, el('h2', { text: '让桌面成为你的桌面' }), el('p', { text: '壁纸与外观会保存在当前浏览器。' }),
      el('section', { class: 'settings-section' }, el('h3', { text: '外观' }), el('div', { class: 'appearance-options' }, [{ id: 'light', title: '浅色' }, { id: 'dark', title: '深色' }].map(a => el('button', { class: `appearance-option${os.preferences.theme === a.id ? ' is-selected' : ''}`, text: a.title, onclick: () => { os.preferences.theme = a.id; os.applyPreferences(); os.savePreferences(); w.refresh(); } })))),
      el('section', { class: 'settings-section' }, el('h3', { text: '壁纸' }), el('div', { class: 'wallpaper-options' }, wallpapers.map(a => el('button', { class: `wallpaper-option${os.preferences.wallpaper === a.id && !os.preferences.customWallpaper ? ' is-selected' : ''}`, onclick: () => { os.preferences.wallpaper = a.id; delete os.preferences.customWallpaper; os.applyPreferences(); os.savePreferences(); w.refresh(); } }, el('img', { src: `assets/wallpapers/${a.id}.jpg`, alt: a.title, width: 240, height: 160 }), el('span', { text: a.title }))))),
      el('div', { class: 'settings-row' }, el('span', { text: '程序坞放大' }), el('input', { type: 'range', min: '1', max: '1.6', step: '.05', value: os.preferences.dockScale, 'aria-label': '程序坞放大程度', oninput: e => { os.preferences.dockScale = Number(e.target.value); os.savePreferences(); } })),
      el('div', { class: 'settings-row' }, el('span', { text: '桌面图标' }), el('button', { class: 'soft-button', text: '整理图标', onclick: () => os.organizeDesktop() })));
    w.content.replaceChildren(page);
  };
  os.renderers.trash = w => { w.setTitle('废纸篓'); w.content.replaceChildren(emptyState('trash-empty', '废纸篓是空的', '桌面只提供公开内容浏览。关闭窗口不会删除任何文章或作品。')); };

  createMusic(os);
}

function createMusic(os) {
  const audio = new Audio(); audio.preload = 'metadata'; const tracks = [], listeners = new Set(); let current = -1, status = 'idle', token = 0;
  const notify = () => { for (const fn of listeners) fn(); };
  const select = (index, play = false) => { if (!tracks[index]) return; token++; current = index; audio.src = tracks[index].url; status = 'paused'; notify(); if (play) toggle(true); };
  const toggle = async (forcePlay = false) => {
    if (!tracks.length) return;
    if (current < 0) select(0);
    if (!audio.paused && !forcePlay) { audio.pause(); return; }
    const request = ++token;
    try { status = 'loading'; notify(); await audio.play(); if (request === token) { status = 'playing'; notify(); } }
    catch { if (request === token) { status = 'error'; notify(); os.toast('这段音频暂时无法播放，请重试或选择其他文件。'); } }
  };
  for (const event of ['play', 'pause', 'timeupdate', 'loadedmetadata', 'waiting', 'canplay', 'error']) audio.addEventListener(event, () => { if (event === 'pause') status = 'paused'; if (event === 'play') status = 'playing'; if (event === 'error') status = 'error'; if (event === 'waiting') status = 'buffering'; notify(); });
  audio.addEventListener('ended', () => { if (current + 1 < tracks.length) select(current + 1, true); else { status = 'ended'; notify(); } });
  os.player = { stop: () => { token++; audio.pause(); audio.currentTime = 0; status = 'paused'; notify(); } };
  const fileInput = el('input', { id: 'local-audio-picker', type: 'file', accept: 'audio/*', multiple: true, hidden: true, 'aria-label': '选择本地音频文件' });
  document.body.append(fileInput);
  fileInput.addEventListener('change', () => {
    for (const file of fileInput.files) tracks.push({ name: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) });
    if (current < 0 && tracks.length) select(0);
    for (const w of os.windows.values()) if (w.app === 'music') w.refresh();
  });
  const pick = () => { fileInput.value = ''; fileInput.click(); };
  window.addEventListener('pagehide', () => { audio.pause(); for (const t of tracks) URL.revokeObjectURL(t.url); });
  os.renderers.music = w => {
    w.setTitle(w.props.mini ? '迷你播放器' : '音乐');
    w.tools.append(tool('plus', '打开本地音频文件', pick), tool('rectangle.on.rectangle', w.props.mini ? '返回音乐资料库' : '切换迷你播放器', () => { w.props.mini = !w.props.mini; if (w.props.mini) { w.props.mainRect = { ...w.rect }; w.rect = { ...w.rect, width: 420, height: 210 }; } else w.rect = w.props.mainRect || { ...w.rect, width: 760, height: 510 }; w.mode = 'normal'; os.applyRect(w); w.refresh(); }));
    const side = el('aside', { class: 'app-sidebar' }, sidebarGroup('资料库', [sidebarItem('歌曲', 'music.note', () => {}, true, tracks.length), sidebarItem('打开音频…', 'plus', pick)]));
    if (!tracks.length) {
      w.content.replaceChildren(el('div', { class: 'app-layout' }, side, emptyState('music', '音乐，留一个位置', '博客暂未发布音频作品。你可以打开本地音频，在这里听一会儿。', el('button', { class: 'soft-button primary', text: '打开音频…', onclick: pick })))); return;
    }
    const list = el('div', { class: 'music-library' }, el('div', { class: 'music-header', text: '歌曲' }));
    tracks.forEach((track, i) => list.append(el('button', { class: `track-row${i === current ? ' is-current' : ''}`, onclick: () => select(i, true) }, el('span', { class: 'track-index', text: i + 1 }), symbol('music.note'), el('span', { text: track.name }))));
    const play = tool('play.fill', '播放或暂停', () => toggle()), title = el('span', { class: 'music-track-label' }), elapsed = el('span'), duration = el('span'), seek = el('input', { type: 'range', min: '0', max: '100', value: '0', 'aria-label': '播放进度', onchange: e => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(e.target.value); } });
    const volume = el('input', { type: 'range', min: '0', max: '1', step: '.01', value: audio.volume, class: 'music-volume', 'aria-label': '音量', oninput: e => audio.volume = Number(e.target.value) });
    const bar = el('div', { class: 'music-bar' }, el('div', { class: 'music-play-controls' }, tool('backward.end.fill', '上一首', () => select(Math.max(0, current - 1), true)), play, tool('forward.end.fill', '下一首', () => select((current + 1) % tracks.length, true))), title, symbol('speaker.wave.2.fill'), volume, el('div', { class: 'music-progress' }, elapsed, seek, duration));
    const update = () => { title.textContent = tracks[current]?.name || '选择一首歌曲'; play.replaceChildren(symbol(status === 'playing' || status === 'buffering' ? 'pause.fill' : 'play.fill')); play.title = status === 'playing' ? '暂停' : '播放'; seek.max = Number.isFinite(audio.duration) ? String(audio.duration) : '100'; if (document.activeElement !== seek) seek.value = String(audio.currentTime || 0); elapsed.textContent = time(audio.currentTime); duration.textContent = time(audio.duration); for (const [i, row] of [...list.querySelectorAll('.track-row')].entries()) row.classList.toggle('is-current', i === current); };
    listeners.add(update); w.cleanup = () => listeners.delete(update); update();
    w.content.replaceChildren(el('div', { class: `app-layout${w.props.mini ? ' music-mini-view' : ''}` }, side, el('div', { class: 'music-layout' }, list, bar, el('p', { class: 'music-local-notice', text: '音频仅在当前浏览器播放，不会上传。关闭音乐窗口后仍可通过程序坞恢复播放控制。' }))));
  };
  function time(value) { if (!Number.isFinite(value)) return '0:00'; return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
}
