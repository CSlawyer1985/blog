export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node && !key.startsWith('aria')) node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
export function symbol(name, cls = '') {
  const node = el('span', { class: 'symbol ' + cls, 'aria-hidden': 'true' });
  node.style.setProperty('--symbol', `url("${new URL(`../assets/native/symbol-${name}-64.png`, import.meta.url).href}")`);
  return node;
}
export const icon = (id, size = 128) => `assets/native/${id}-${id.startsWith('symbol-') ? 64 : size}.png`;
export function tool(name, label, action, attrs = {}) {
  return el('button', { class: 'tool-button', type: 'button', title: label, 'aria-label': label, onclick: action, ...attrs }, symbol(name));
}
export function emptyState(image, title, text, action) {
  return el('div', { class: 'empty-state' }, el('img', { src: icon(image), alt: '', width: 70, height: 70 }), el('h2', { text: title }), el('p', { text }), action);
}
export function formatDate(value, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date(value + 'T12:00:00'));
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = el('a', { href: url, download: name });
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export const APPS = {
  finder: { name: '访达', icon: 'finder', width: 760, height: 520 },
  notes: { name: '备忘录', icon: 'notes', width: 1020, height: 660 },
  browser: { name: '浏览器', icon: 'safari', width: 1000, height: 680 },
  photos: { name: '照片', icon: 'photos', width: 900, height: 620 },
  calendar: { name: '日历', icon: 'calendar', width: 870, height: 630 },
  music: { name: '音乐', icon: 'music', width: 760, height: 510 },
  appearance: { name: '外观', icon: 'settings', width: 690, height: 530 },
  trash: { name: '废纸篓', icon: 'trash-empty', width: 600, height: 440 },
};
