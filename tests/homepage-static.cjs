const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html'), about = read('about.html');
assert.equal(html, read('templates/home.html'), 'first-build fallback matches the approved homepage');
assert(html.includes('商事律师 × AI Builder'));
assert(html.includes('Commercial Lawyer × AI Builder'));
assert(!/noindex|preview-dock|previews\/|data-portrait-preview|AI\+法律先行者/.test(html), 'no preview-only or obsolete identity residue');
assert(html.includes('<title>陈石 · 法与AI</title>'));
assert(html.includes('<link rel="canonical" href="https://chenshi.ai/">'));
assert.equal((html.match(/class="project-item /g) || []).length, 8);
assert.equal((html.match(/class="channel"/g) || []).length, 6);
assert.equal((about.match(/class="proj-item"/g) || []).length, 10);
for (const url of ['https://dsh.chenshi.ai/', 'https://memoball.chenshi.ai/', 'https://skill.chenshi.ai/', 'https://learn-agent.legalagi.cn/', 'https://rule.chenshi.ai/']) {
  assert(html.includes('href="' + url + '"'));
  assert(about.includes('href="' + url + '"'));
}
for (const repo of ['claude-for-legal-ZH','contract-review-pro','china-lawyer-analyst','excellent-judgment-doc-skill','legalwiki']) {
  assert(about.includes('href="https://github.com/CSlawyer1985/' + repo + '"'), 'retain original repo ' + repo);
}
for (const [name, source] of [['index.html', html], ['about.html', about]]) {
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, name + ': unique IDs');
  for (const [, raw] of source.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = raw.replaceAll('&amp;', '&');
    if (/^(?:https?:|mailto:|data:|\/\/)/.test(url)) continue;
    if (url.startsWith('#')) { if (url.length > 1) assert(ids.includes(url.slice(1)), name + ': anchor ' + url); continue; }
    const local = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, '');
    if (local) assert(fs.existsSync(path.join(root, local)), name + ': resource ' + local);
  }
}
for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
const data = JSON.parse(read('data/site.json'));
assert.equal(data.site.description, '商事律师 × AI Builder — 个人博客');
assert.deepEqual(data.author.dual_identity, ['商事律师', 'AI Builder']);
assert(!read('css/portfolio.css').includes('preview-dock'));
console.log('PASS: homepage/template, identity, 8 projects, 6 channels, 10 about entries, preserved repos, local assets, anchors, SEO');
