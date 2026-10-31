import { WALLPAPERS, DEFAULT_WALLPAPER } from './wallpapers.js';
import { el, icon, symbol, tool, APPS, clamp, reducedMotion } from './ui.js';

export class DesktopOS {
  constructor(data) {
    this.data = data;
    this.windows = new Map(); this.hiddenApps = new Set(); this.z = 40; this.sequence = 0; this.active = null;
    this.renderers = {}; this.commands = {}; this.showingDesktop = false; this.selected = null;
    this.elements = Object.fromEntries(['menubar', 'desktop', 'desktop-icons', 'windows', 'dock', 'menu-layer', 'overlay-layer', 'toast', 'wallpaper', 'drag-shield'].map(id => [id, document.getElementById(id)]));
    this.preferences = this.readStore('chenshi.blog.desktop.preferences.v1', { theme: 'dark', wallpaper: DEFAULT_WALLPAPER, dockScale: 1.35, favorites: [], iconPositions: {} }, localStorage);
    this.articleCache = new Map(); this.returnFocus = null;
  }
  readStore(key, fallback, store) { try { return { ...fallback, ...JSON.parse(store.getItem(key) || '{}') }; } catch { return fallback; } }
  savePreferences() { try { localStorage.setItem('chenshi.blog.desktop.preferences.v1', JSON.stringify(this.preferences)); } catch { this.toast('浏览器未允许保存偏好，本次设置仍然有效。'); } }
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const windows = [...this.windows.values()].map(w => ({ app: w.app, props: w.props, rect: w.rect, normalRect: w.normalRect, mode: w.mode, minimized: w.minimized, hidden: this.hiddenApps.has(w.app) }));
      try { sessionStorage.setItem('chenshi.blog.desktop.session.v1', JSON.stringify({ windows })); } catch { /* The live desktop remains available. */ }
    }, 180);
  }
  start() {
    this.applyPreferences(); this.buildDesktop(); this.renderDock(); this.renderMenubar(); this.bindGlobalEvents();
    const session = this.readStore('chenshi.blog.desktop.session.v1', { windows: [] }, sessionStorage);
    if (Array.isArray(session.windows) && session.windows.length && session.windows.length < 20) {
      for (const saved of session.windows) {
        if (!APPS[saved.app] || !saved.props || typeof saved.props !== 'object') continue;
        const w = this.open(saved.app, saved.props, { newInstance: true, rect: saved.rect });
        if (saved.normalRect) w.normalRect = saved.normalRect;
        if (['maximized', 'fullscreen'].includes(saved.mode)) { w.mode = saved.mode; this.applyRect(w); }
        if (saved.minimized) { w.minimized = true; this.updateWindowFlags(w); }
        if (saved.hidden) this.hiddenApps.add(saved.app);
      }
      for (const w of this.windows.values()) this.updateWindowFlags(w);
      this.focusNext();
    } else {
      const width = innerWidth;
      this.open('finder', { folder: 'works' }, { rect: { x: Math.max(20, width * .065), y: 116, width: 700, height: 474 } });
      this.open('notes', { articleId: 'about', category: 'all' }, { rect: { x: Math.max(12, width * .19), y: 64, width: 1020, height: Math.min(660, innerHeight - 170) } });
    }
    const article = new URLSearchParams(location.search).get('article');
    if (article && this.data.articles.some(a => a.id === article)) this.open('notes', { articleId: article, category: 'all' });
    document.getElementById('startup').classList.add('is-finished');
    setTimeout(() => document.getElementById('startup').remove(), 300);
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }
  workRect(mode = 'normal') { return { x: 0, y: 0, width: innerWidth, height: innerHeight - 30 - (mode === 'fullscreen' ? 0 : 106) }; }
  fitRect(rect) {
    const area = this.workRect();
    const width = clamp(Number(rect.width) || 760, Math.min(320, area.width - 12), Math.max(300, area.width - 16));
    const height = clamp(Number(rect.height) || 540, Math.min(250, area.height - 12), Math.max(250, area.height - 12));
    return { x: clamp(Number(rect.x) || 0, 8, Math.max(8, area.width - width - 8)), y: clamp(Number(rect.y) || 0, 8, Math.max(8, area.height - height)), width, height };
  }
  open(app, props = {}, options = {}) {
    this.closeMenu(); this.dismissOverlay(); this.revealDesktop(false);
    if (!APPS[app] || !this.renderers[app]) return null;
    this.hiddenApps.delete(app);
    if (!options.newInstance) {
      const existing = [...this.windows.values()].reverse().find(w => w.app === app);
      if (existing) {
        if (Object.keys(props).length) { existing.props = { ...existing.props, ...props }; this.refresh(existing); }
        this.restore(existing); return existing;
      }
    }
    const meta = APPS[app], n = this.windows.size;
    const w = { id: `${app}-${++this.sequence}`, app, props: { ...props }, mode: 'normal', minimized: false, motion: 0,
      rect: this.fitRect(options.rect || { x: 100 + n * 30, y: 64 + n * 26, width: meta.width, height: meta.height }) };
    w.node = el('section', { class: 'window', tabindex: '-1', role: 'dialog', 'aria-label': meta.name, dataset: { windowId: w.id, app } });
    w.traffic = el('div', { class: 'traffic-lights' },
      el('button', { class: 'traffic close', title: '关闭窗口', 'aria-label': `关闭${meta.name}窗口`, onclick: () => this.close(w) }, symbol('xmark')),
      el('button', { class: 'traffic minimize', title: '最小化', 'aria-label': `最小化${meta.name}`, onclick: () => this.minimize(w) }, symbol('minus')),
      el('button', { class: 'traffic expand', title: '进入或退出全屏；Option 点击缩放', 'aria-label': `缩放或全屏${meta.name}`, onclick: e => this.toggleGeometry(w, e.altKey ? 'maximized' : 'fullscreen') }, symbol('arrow.up.left.and.arrow.down.right')));
    w.title = el('div', { class: 'toolbar-title', text: meta.name });
    w.tools = el('div', { class: 'toolbar-tools' });
    w.toolbar = el('header', { class: 'window-toolbar' }, w.traffic, w.title, w.tools);
    w.content = el('div', { class: 'window-content' });
    w.node.append(w.toolbar, w.content);
    w.setTitle = (title, subtitle) => { w.title.replaceChildren(title, subtitle ? el('span', { class: 'toolbar-meta', text: subtitle }) : ''); w.node.setAttribute('aria-label', title ? `${title} · ${meta.name}` : meta.name); };
    w.refresh = () => this.refresh(w);
    this.windows.set(w.id, w); this.elements.windows.append(w.node);
    this.bindWindowGeometry(w); this.applyRect(w); this.refresh(w); this.focus(w);
    if (!reducedMotion()) w.node.animate([{ opacity: 0, transform: 'scale(.97) translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 190, easing: 'cubic-bezier(.2,.7,.2,1)' });
    this.scheduleSave(); return w;
  }
  refresh(w) { if (!this.windows.has(w.id)) return; w.cleanup?.(); w.cleanup = null; w.tools.replaceChildren(); this.renderers[w.app](w); this.scheduleSave(); }
  focus(w) {
    if (!w || !this.windows.has(w.id) || w.minimized || this.hiddenApps.has(w.app)) return;
    this.active = w.id; w.z = ++this.z; w.node.style.zIndex = w.z;
    for (const other of this.windows.values()) other.node.classList.toggle('is-focused', other.id === w.id);
    this.renderMenubar(); this.renderDock(); this.scheduleSave();
  }
  focusNext() {
    const next = [...this.windows.values()].filter(w => !w.minimized && !this.hiddenApps.has(w.app)).sort((a, b) => b.z - a.z)[0];
    if (next) this.focus(next); else { this.active = null; this.renderMenubar(); this.renderDock(); }
  }
  applyRect(w) {
    const frame = w.mode === 'normal' ? w.rect : this.workRect(w.mode);
    for (const key of ['x', 'y', 'width', 'height']) w.node.style[key === 'x' ? 'left' : key === 'y' ? 'top' : key] = `${frame[key]}px`;
    w.node.classList.toggle('is-maximized', w.mode === 'maximized'); w.node.classList.toggle('is-fullscreen', w.mode === 'fullscreen');
  }
  updateWindowFlags(w) { w.node.classList.toggle('is-hidden', this.hiddenApps.has(w.app)); w.node.classList.toggle('is-minimized', w.minimized); }
  cancelMotion(w) { w.motion++; w.animation?.cancel(); w.animation = null; }
  async close(w) {
    if (!w || !this.windows.has(w.id)) return;
    this.cancelMotion(w); this.windows.delete(w.id); w.cleanup?.();
    w.node.classList.add('is-closing'); w.node.dataset.app = `closing-${w.app}`; w.node.setAttribute('aria-hidden', 'true'); w.node.inert = true;
    this.focusNext(); this.scheduleSave();
    if (!reducedMotion() && !w.minimized) await w.node.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 130, easing: 'ease-in' }).finished.catch(() => {});
    w.node.remove();
  }
  async minimize(w) {
    if (!w || w.minimized || !this.windows.has(w.id)) return;
    this.cancelMotion(w); const version = w.motion;
    const rect = w.node.getBoundingClientRect(), target = this.elements.dock.querySelector(`[data-app="${w.app}"]`)?.getBoundingClientRect();
    w.minimized = true; this.focusNext(); this.scheduleSave();
    if (!reducedMotion() && target) {
      const dx = target.x + target.width / 2 - rect.x - rect.width / 2, dy = target.y - rect.y - rect.height / 2;
      w.animation = w.node.animate([{ opacity: 1, transform: 'none' }, { opacity: .15, transform: `translate(${dx}px,${dy}px) scale(.08)` }], { duration: 300, easing: 'cubic-bezier(.4,0,.7,1)' });
      await w.animation.finished.catch(() => {});
    }
    if (version === w.motion && this.windows.has(w.id)) this.updateWindowFlags(w);
  }
  restore(w) {
    if (!w) return;
    const wasMinimized = w.minimized; this.cancelMotion(w); w.minimized = false; this.hiddenApps.delete(w.app); this.revealDesktop(false);
    for (const other of this.windows.values()) this.updateWindowFlags(other);
    if (wasMinimized && !reducedMotion()) w.node.animate([{ opacity: .2, transform: 'translateY(35px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
    this.focus(w); this.scheduleSave();
  }
  hideApp(app) { this.hiddenApps.add(app); for (const w of this.windows.values()) this.updateWindowFlags(w); this.focusNext(); this.scheduleSave(); }
  showApp(app) {
    this.hiddenApps.delete(app); this.revealDesktop(false);
    const windows = [...this.windows.values()].filter(w => w.app === app).sort((a, b) => b.z - a.z);
    for (const w of windows) this.updateWindowFlags(w);
    const visible = windows.find(w => !w.minimized);
    if (visible) this.focus(visible); else if (windows.length) this.restore(windows[0]); else this.open(app);
  }
  revealDesktop(value = !this.showingDesktop) { this.showingDesktop = value; this.elements.windows.classList.toggle('is-desktop-revealed', value); }
  toggleGeometry(w, target = 'maximized') {
    if (!w) return;
    this.cancelMotion(w);
    if (w.mode === target) { w.mode = 'normal'; if (w.normalRect) w.rect = this.fitRect(w.normalRect); }
    else { if (w.mode === 'normal') w.normalRect = { ...w.rect }; w.mode = target; }
    this.applyRect(w); this.focus(w); this.scheduleSave();
  }
  bindWindowGeometry(w) {
    w.node.addEventListener('pointerdown', () => this.focus(w));
    const start = (event, direction) => {
      if (event.button !== 0 || w.mode !== 'normal') return;
      if (!direction && event.target.closest('button,input,a,select,.toolbar-tools')) return;
      this.focus(w); const initial = { ...w.rect }, x = event.clientX, y = event.clientY;
      const shield = this.elements['drag-shield']; let moved = false;
      const move = e => {
        const dx = e.clientX - x, dy = e.clientY - y;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true; shield.hidden = false; shield.style.cursor = direction ? `${direction}-resize` : 'grabbing';
        let rect = { ...initial };
        if (!direction) { rect.x = clamp(initial.x + dx, -initial.width + 150, innerWidth - 100); rect.y = clamp(initial.y + dy, 0, innerHeight - 140); }
        else {
          const minW = Math.min(320, innerWidth - 16), minH = 240;
          if (direction.includes('e')) rect.width = Math.max(minW, Math.min(innerWidth - initial.x, initial.width + dx));
          if (direction.includes('s')) rect.height = Math.max(minH, Math.min(innerHeight - initial.y - 55, initial.height + dy));
          if (direction.includes('w')) { rect.width = Math.max(minW, initial.width - dx); rect.x = initial.x + initial.width - rect.width; }
          if (direction.includes('n')) { rect.height = Math.max(minH, initial.height - dy); rect.y = Math.max(0, initial.y + initial.height - rect.height); }
        }
        w.rect = rect; this.applyRect(w);
      };
      const finish = () => { shield.hidden = true; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', finish); document.removeEventListener('pointercancel', finish); window.removeEventListener('blur', finish); this.scheduleSave(); };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', finish, { once: true }); document.addEventListener('pointercancel', finish, { once: true }); window.addEventListener('blur', finish, { once: true });
      event.preventDefault();
    };
    w.toolbar.addEventListener('pointerdown', e => start(e));
    w.toolbar.addEventListener('dblclick', e => { if (!e.target.closest('button,input,.toolbar-tools')) this.toggleGeometry(w); });
    w.toolbar.addEventListener('contextmenu', e => { e.preventDefault(); this.showMenu([{ label: '最小化', action: () => this.minimize(w) }, { label: '缩放／还原', action: () => this.toggleGeometry(w) }, { label: '关闭窗口', action: () => this.close(w) }], e.clientX, e.clientY); });
    for (const direction of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) w.node.append(el('div', { class: `resize-handle resize-${direction}`, onpointerdown: e => start(e, direction) }));
  }
  buildDesktop() {
    const items = [{ id: 'articles', title: '文章', meta: `${this.data.articles.length} 篇`, icon: 'folder', action: () => this.open('finder', { folder: 'articles' }) },
      { id: 'works', title: '作品', meta: `${this.data.projects.length} 个项目`, icon: 'folder', action: () => this.open('finder', { folder: 'works' }) },
      { id: 'about', title: '关于陈石', meta: '从这里开始', icon: 'safari', action: () => this.browse('/about.html', '关于陈石') },
      { id: 'photos', title: '公开相簿', meta: '文章与作品配图', icon: 'photos', action: () => this.open('photos') }];
    this.elements['desktop-icons'].replaceChildren(...items.map(item => {
      const node = el('button', { class: 'desktop-item', title: `双击打开${item.title}`, dataset: { contentId: item.id }, 'aria-label': `${item.title}，${item.meta}` }, el('img', { src: icon(item.icon), alt: '', width: 62, height: 62 }), el('span', {}, item.title, el('small', { text: item.meta })));
      const pos = this.preferences.iconPositions[item.id] || { x: 0, y: 0 }; node.style.transform = `translate(${clamp(Number(pos.x) || 0, -innerWidth + 130, 0)}px,${clamp(Number(pos.y) || 0, -100, Math.max(0, innerHeight - 440))}px)`;
      node.addEventListener('click', event => { this.selected = item.id; this.selectDesktop(); if (event.pointerType === 'touch') item.action(); });
      node.addEventListener('dblclick', () => { if (performance.now() - (this.lastIconDrag || 0) > 400) item.action(); });
      node.addEventListener('keydown', e => { if (e.key === 'Enter') item.action(); });
      node.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); this.showMenu([{ label: '打开', action: item.action }, { label: '在新窗口打开', action: () => item.id === 'about' ? this.browse('/about.html', '关于陈石') : this.open(item.id === 'photos' ? 'photos' : 'finder', { folder: item.id }, { newInstance: true }) }, null, { label: '整理桌面图标', action: () => this.organizeDesktop() }], e.clientX, e.clientY); });
      node.addEventListener('pointerdown', e => {
        if (e.button !== 0) return; const startX = e.clientX, startY = e.clientY, old = this.preferences.iconPositions[item.id] || { x: 0, y: 0 }; let dragging = false;
        const move = event => { const dx = event.clientX - startX, dy = event.clientY - startY; if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true; if (dragging) { const x = clamp(old.x + dx, -innerWidth + 130, 0), y = clamp(old.y + dy, -node.offsetTop, innerHeight - 200 - node.offsetTop); node.style.transform = `translate(${x}px,${y}px)`; this.preferences.iconPositions[item.id] = { x, y }; } };
        const up = () => { document.removeEventListener('pointermove', move); if (dragging) { this.lastIconDrag = performance.now(); this.savePreferences(); } };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up, { once: true });
      });
      return node;
    }));
  }
  organizeDesktop() { this.preferences.iconPositions = {}; this.savePreferences(); this.buildDesktop(); }
  selectDesktop() { for (const node of this.elements['desktop-icons'].children) node.classList.toggle('is-selected', node.dataset.contentId === this.selected); }
  renderDock() {
    const ids = ['launcher', 'finder', 'notes', 'browser', 'photos', 'calendar', 'music', 'appearance', 'trash'];
    this.elements.dock.replaceChildren(...ids.flatMap(id => {
      const meta = id === 'launcher' ? { name: '应用', icon: 'apps' } : APPS[id];
      const running = [...this.windows.values()].filter(w => w.app === id);
      const node = el('button', { class: `dock-item${running.length ? ' is-running' : ''}${running.some(w => w.minimized) ? ' is-minimized' : ''}`, dataset: { app: id }, 'aria-label': meta.name, onclick: () => id === 'launcher' ? this.launcher() : this.showApp(id) }, el('img', { src: icon(meta.icon), alt: '', width: 58, height: 58 }), el('span', { class: 'dock-label', text: meta.name }));
      if (id !== 'launcher') node.addEventListener('contextmenu', e => {
        e.preventDefault(); this.showMenu([{ label: meta.name, caption: true }, ...running.map(w => ({ label: w.title.textContent, action: () => this.restore(w) })), null, { label: '打开', action: () => this.showApp(id) }, { label: this.hiddenApps.has(id) ? '显示应用' : '隐藏应用', disabled: !running.length, action: () => this.hiddenApps.has(id) ? this.showApp(id) : this.hideApp(id) }, { label: id === 'music' ? '退出音乐' : '关闭应用窗口', disabled: !running.length, action: () => { for (const w of running) this.close(w); if (id === 'music') this.player?.stop(); } }], e.clientX, e.clientY - 160);
      });
      return id === 'trash' ? [el('div', { class: 'dock-separator', 'aria-hidden': 'true' }), node] : [node];
    }));
  }
  renderMenubar() {
    const active = this.windows.get(this.active), app = active?.app || 'finder', name = APPS[app]?.name || '访达';
    const trigger = (label, id, cls = '') => el('button', { class: `menu-trigger ${cls}`, 'aria-label': id === 'apple' ? '苹果菜单' : null, 'aria-haspopup': 'menu', 'aria-expanded': 'false', dataset: { menu: id }, onclick: e => this.toggleTopMenu(id, e.currentTarget) }, label);
    this.elements.menubar.replaceChildren(trigger(symbol('apple.logo'), 'apple', 'apple-trigger'), trigger(name, 'application', 'menu-app-name'), trigger('内容', 'content'), trigger('显示', 'view'), trigger('窗口', 'window'), trigger('帮助', 'help', 'menu-optional'), el('div', { class: 'menu-status' }, el('span', { class: 'status-hint', text: '陈石 · 法与 AI' }), el('button', { class: 'tool-button', 'aria-label': '搜索文章', title: '搜索文章', onclick: () => this.searchArticles() }, symbol('magnifyingglass')), el('button', { class: 'status-time', id: 'clock', onclick: () => this.open('calendar'), 'aria-label': '打开日历' })));
    this.updateClock();
  }
  updateClock() { const clock = document.getElementById('clock'); if (clock) clock.textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
  toggleTopMenu(id, anchor) {
    if (this.openMenuId === id) return this.closeMenu();
    const w = this.windows.get(this.active), app = w?.app || 'finder';
    const menus = {
      apple: [{ label: '关于陈石的桌面', action: () => this.open('notes', { articleId: 'about' }) }, null, { label: '外观与壁纸…', action: () => this.open('appearance') }, { label: '应用…', action: () => this.launcher() }, null, { label: this.showingDesktop ? '返回窗口' : '显示桌面', action: () => this.revealDesktop() }, { label: '整理桌面图标', action: () => this.organizeDesktop() }, { label: '恢复初始窗口布局', action: () => this.resetLayout() }, null, { label: '返回普通主页', action: () => location.assign('/') }],
      application: [{ label: `关于${APPS[app]?.name || '访达'}`, action: () => this.help() }, null, { label: `隐藏${APPS[app]?.name || '访达'}`, disabled: !w, action: () => this.hideApp(app) }, { label: '显示所有应用', action: () => { this.hiddenApps.clear(); for (const x of this.windows.values()) this.updateWindowFlags(x); this.focusNext(); } }],
      content: [{ label: '所有文章', action: () => this.open('notes', { category: 'all', articleId: this.data.articles[0].id }) }, { label: '我的作品', action: () => this.open('finder', { folder: 'works' }) }, { label: '关于陈石', action: () => this.browse('/about.html', '关于陈石') }, { label: '公开相簿', action: () => this.open('photos') }, null, { label: '搜索文章…', action: () => this.searchArticles() }, { label: '在浏览器中打开博客', action: () => this.browse('/', '陈石 · 法与 AI') }],
      view: [{ label: '应用总览', action: () => this.launcher() }, { label: '外观与壁纸…', action: () => this.open('appearance') }, { label: '显示桌面／返回窗口', action: () => this.revealDesktop() }],
      window: [{ label: '最小化', shortcut: '⌘M', disabled: !w, action: () => this.minimize(w) }, { label: '缩放／还原', disabled: !w, action: () => this.toggleGeometry(w) }, { label: '进入／退出全屏', disabled: !w, action: () => this.toggleGeometry(w, 'fullscreen') }, { label: '关闭窗口', disabled: !w, action: () => this.close(w) }, null, ...[...this.windows.values()].map(x => ({ label: `${x.id === this.active ? '✓ ' : ''}${APPS[x.app].name}${x.minimized ? '（已最小化）' : ''}`, action: () => this.restore(x) }))],
      help: [{ label: '桌面使用说明', action: () => this.help() }, { label: '打开完整博客', action: () => this.browse('/', '陈石 · 法与 AI') }],
    };
    const rect = anchor.getBoundingClientRect(); this.showMenu(menus[id], rect.left, 31, anchor); this.openMenuId = id; anchor.classList.add('is-open'); anchor.setAttribute('aria-expanded', 'true');
  }
  showMenu(items, x, y, trigger = null) {
    this.closeMenu(); this.menuReturnFocus = trigger || document.activeElement;
    const menu = el('div', { class: 'popup-menu', role: 'menu' });
    for (const item of items) {
      if (!item) { menu.append(el('div', { class: 'menu-rule', role: 'separator' })); continue; }
      if (item.caption) { menu.append(el('div', { class: 'menu-caption', text: item.label })); continue; }
      menu.append(el('button', { class: 'menu-item', role: 'menuitem', disabled: !!item.disabled, onclick: () => { this.closeMenu(); item.action?.(); } }, item.label, item.shortcut ? el('span', { class: 'menu-shortcut', text: item.shortcut }) : null));
    }
    this.elements['menu-layer'].replaceChildren(menu);
    const rect = menu.getBoundingClientRect(); menu.style.left = `${clamp(x, 5, innerWidth - rect.width - 5)}px`; menu.style.top = `${clamp(y, 31, innerHeight - rect.height - 8)}px`;
    queueMicrotask(() => menu.querySelector('button:not(:disabled)')?.focus());
    menu.addEventListener('keydown', e => {
      const buttons = [...menu.querySelectorAll('button:not(:disabled)')], current = buttons.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length; buttons[next]?.focus(); }
      if (e.key === 'Escape') { e.preventDefault(); this.closeMenu(true); }
    });
  }
  closeMenu(restoreFocus = false) { this.elements['menu-layer'].replaceChildren(); for (const b of this.elements.menubar.querySelectorAll('.is-open')) { b.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); } this.openMenuId = null; if (restoreFocus) this.menuReturnFocus?.focus?.(); }
  showOverlay(node, label) {
    this.dismissOverlay(); this.returnFocus = document.activeElement;
    const backdrop = el('div', { class: 'overlay-backdrop' }, node); node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); node.setAttribute('aria-label', label);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) this.dismissOverlay(); }); this.elements['overlay-layer'].append(backdrop);
    queueMicrotask(() => node.querySelector('input,button,a')?.focus());
  }
  dismissOverlay() { if (this.elements['overlay-layer'].childElementCount) { this.elements['overlay-layer'].replaceChildren(); this.returnFocus?.focus?.(); } }
  launcher() {
    if (this.elements['overlay-layer'].querySelector('.app-launcher')) return this.dismissOverlay();
    const grid = el('div', { class: 'launcher-grid' }), search = el('input', { class: 'launcher-search', placeholder: '搜索应用', 'aria-label': '搜索站内应用' });
    const fill = () => grid.replaceChildren(...Object.entries(APPS).filter(([id, a]) => id !== 'trash' && a.name.includes(search.value.trim())).map(([id, a]) => el('button', { class: 'launcher-app', onclick: () => { this.dismissOverlay(); this.showApp(id); } }, el('img', { src: icon(a.icon), alt: '', width: 64, height: 64 }), a.name)));
    search.addEventListener('input', fill); search.addEventListener('keydown', e => { if (e.key === 'Enter') grid.querySelector('button')?.click(); }); fill();
    this.showOverlay(el('div', { class: 'app-launcher' }, el('div', { class: 'launcher-heading' }, el('h2', { text: '应用' }), tool('xmark', '关闭应用总览', () => this.dismissOverlay())), search, grid), '应用总览');
  }
  quickLook(src, title) { this.showOverlay(el('div', { class: 'quick-look' }, el('div', { class: 'quick-look-header' }, title, tool('xmark', '关闭快速预览', () => this.dismissOverlay())), el('img', { src, alt: title })), '快速预览'); }
  help() {
    const body = el('div', { class: 'note-prose' }, el('h2', { text: '欢迎来到陈石的桌面' }), el('p', { class: 'profile-intro', text: '双击桌面上的文件夹开始浏览。备忘录收录全部文章，照片里是公开配图，日历按发布日期整理文章。拖动标题栏移动窗口，拖动窗口边缘调整大小。' }), el('p', { class: 'profile-intro', text: '黄色按钮最小化窗口，点击程序坞图标恢复；绿色按钮进入或退出全屏。苹果菜单可以更换壁纸、整理图标和显示桌面。这里的所有内容均来自陈石的公开博客。' }), el('button', { class: 'soft-button primary', text: '开始阅读', onclick: () => { this.dismissOverlay(); this.open('notes', { articleId: this.data.articles[0].id, category: 'all' }); } }));
    this.showOverlay(el('div', { class: 'quick-look' }, el('div', { class: 'quick-look-header' }, '桌面使用说明', tool('xmark', '关闭使用说明', () => this.dismissOverlay())), body), '桌面使用说明');
  }
  searchArticles() {
    if (innerWidth <= 480) {
      const results = el('div', { class: 'mobile-search-results' }), input = el('input', { class: 'launcher-search', placeholder: '搜索文章标题与摘要', 'aria-label': '搜索文章标题与摘要' });
      const fill = () => { const query = input.value.trim().toLowerCase(); const matches = this.data.articles.filter(a => !query || `${a.title} ${a.excerpt}`.toLowerCase().includes(query)); results.replaceChildren(...matches.slice(0, 30).map(a => el('button', { class: 'note-item', onclick: () => this.readArticle(a.id) }, el('strong', { text: a.title }), el('p', { text: a.date })))); if (!matches.length) results.append(el('p', { text: '没有找到匹配文章。' })); };
      input.addEventListener('input', fill); fill();
      this.showOverlay(el('div', { class: 'app-launcher' }, el('div', { class: 'launcher-heading' }, el('h2', { text: '搜索文章' }), tool('xmark', '关闭搜索', () => this.dismissOverlay())), input, results), '搜索文章');
      return;
    }
    const w = this.open('notes', { category: 'all', query: '' }); setTimeout(() => w.tools.querySelector('input')?.focus(), 0);
  }
  resetLayout() { for (const w of [...this.windows.values()]) this.close(w); this.hiddenApps.clear(); this.open('finder', { folder: 'works' }, { rect: { x: 80, y: 116, width: 700, height: 474 } }); this.open('notes', { articleId: 'about', category: 'all' }, { rect: { x: Math.max(12, innerWidth * .19), y: 64, width: 1020, height: 660 } }); }
  applyPreferences() { document.body.dataset.theme = ['dark', 'light'].includes(this.preferences.theme) ? this.preferences.theme : 'dark'; const wall = WALLPAPERS.some(w => w.id === this.preferences.wallpaper) ? this.preferences.wallpaper : DEFAULT_WALLPAPER; this.elements.wallpaper.style.backgroundImage = `url("${this.preferences.customWallpaper || `assets/wallpapers/${wall}.jpg`}")`; }
  async copy(text) { try { await navigator.clipboard.writeText(text); this.toast('链接已复制'); } catch { this.toast('暂时无法复制，请从地址栏选择并复制链接。'); } }
  toast(message) { clearTimeout(this.toastTimer); this.elements.toast.textContent = message; this.elements.toast.classList.add('is-visible'); this.toastTimer = setTimeout(() => this.elements.toast.classList.remove('is-visible'), 2800); }
  bindGlobalEvents() {
    document.addEventListener('pointerdown', e => { if (!e.target.closest('.popup-menu,.menu-trigger')) this.closeMenu(); });
    this.elements.desktop.addEventListener('pointerdown', e => { if (e.target === this.elements.desktop || e.target === this.elements.windows) { this.selected = null; this.selectDesktop(); } });
    this.elements.desktop.addEventListener('contextmenu', e => { if (e.target.closest('.window,.desktop-item')) return; e.preventDefault(); this.showMenu([{ label: '浏览全部文章', action: () => this.open('notes', { category: 'all' }) }, { label: '浏览我的作品', action: () => this.open('finder', { folder: 'works' }) }, null, { label: '整理图标', action: () => this.organizeDesktop() }, { label: '更换壁纸…', action: () => this.open('appearance') }, { label: '显示桌面／返回窗口', action: () => this.revealDesktop() }], e.clientX, e.clientY); });
    let dockFrame;
    this.elements.dock.addEventListener('pointermove', event => { cancelAnimationFrame(dockFrame); const x = event.clientX; dockFrame = requestAnimationFrame(() => { const rect = this.elements.dock.getBoundingClientRect(); for (const item of this.elements.dock.querySelectorAll('.dock-item')) { const distance = Math.abs(x - (rect.left + item.offsetLeft + item.offsetWidth / 2)); const factor = Math.max(0, 1 - distance / 115); const scale = 1 + (Number(this.preferences.dockScale) - 1) * factor * factor; item.style.transform = reducedMotion() ? '' : `scale(${scale})`; } }); });
    this.elements.dock.addEventListener('pointerleave', () => { cancelAnimationFrame(dockFrame); for (const item of this.elements.dock.querySelectorAll('.dock-item')) item.style.transform = ''; });
    window.addEventListener('resize', () => { for (const w of this.windows.values()) { w.rect = this.fitRect(w.rect); this.applyRect(w); } this.buildDesktop(); this.closeMenu(); this.scheduleSave(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (this.elements['overlay-layer'].childElementCount) return this.dismissOverlay(); if (this.elements['menu-layer'].childElementCount) return this.closeMenu(true); const w = this.windows.get(this.active); if (w?.props.photoIndex !== undefined && w.props.photoIndex !== null) { w.props.photoIndex = null; w.refresh(); } else if (w?.mode === 'fullscreen') this.toggleGeometry(w, 'fullscreen'); return; }
      if (this.elements['overlay-layer'].childElementCount && e.key === 'Tab') {
        const focusable = [...this.elements['overlay-layer'].querySelectorAll('button:not(:disabled),input,a[href]')]; const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.target.closest('input,textarea,[contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); this.minimize(this.windows.get(this.active)); }
      if (e.key === ' ' && this.selected) { e.preventDefault(); const item = this.elements['desktop-icons'].querySelector(`[data-content-id="${this.selected}"]`); item?.dispatchEvent(new MouseEvent('dblclick')); }
    });
  }
}
