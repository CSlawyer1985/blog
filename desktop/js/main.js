import { DesktopOS } from './shell.js';
import { registerApps } from './apps.js';
import { loadBlogContent } from './data.js';

try {
  const data = await loadBlogContent();
  const os = new DesktopOS(data);
  registerApps(os);
  os.start();
  // A small observable contract for UI regression checks, containing no private app data.
  window.desktopStatus = () => ({ activeApp: os.windows.get(os.active)?.app || null,
    windows: [...os.windows.values()].map(w => ({ app: w.app, id: w.id, mode: w.mode, minimized: w.minimized,
      hidden: os.hiddenApps.has(w.app), rect: { ...w.rect }, title: w.title.textContent })),
    showingDesktop: os.showingDesktop, articleCount: data.articles.length, projectCount: data.projects.length });
} catch (error) {
  const startup = document.getElementById('startup');
  startup.replaceChildren();
  const text = document.createElement('p'); text.textContent = `桌面暂时无法打开：${error.message}`;
  const link = document.createElement('a'); link.href = '/'; link.textContent = '直接阅读完整博客';
  startup.append(text, link);
}
