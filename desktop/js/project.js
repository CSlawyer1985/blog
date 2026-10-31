import { loadBlogContent } from './data.js';
import { el } from './ui.js';
const main = document.getElementById('project');
try {
  const data = await loadBlogContent();
  const item = data.projects.find(p => p.id === new URLSearchParams(location.search).get('id'));
  if (!item) throw new Error('作品已移动或暂未发布');
  document.title = `${item.title} · ${data.author.name}`;
  main.replaceChildren(el('p', { class: 'eyebrow', text: `${data.author.name}的作品 · ${String(item.order).padStart(2, '0')}` }),
    el('img', { class: 'project-cover', src: item.image, alt: item.title }),
    el('h1', { text: item.title }), el('p', { class: 'project-english', text: item.english }),
    el('p', { text: item.description }), el('a', { class: 'project-link', href: item.url, target: '_blank', rel: 'noopener noreferrer', text: '访问项目官网 ↗' }),
    el('p', { class: 'project-url', text: item.url }));
} catch (error) {
  main.replaceChildren(el('h1', { text: '作品暂时无法打开' }), el('p', { text: error.message }), el('a', { href: '/#project-gallery', target: '_top', text: '返回普通主页查看作品' }));
}
