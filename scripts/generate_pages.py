"""
Jinja2 模板渲染器 — 从模板 + 数据 → 写入静态 HTML 文件
"""

import os
import re
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── 简易模板引擎（避免 Jinja2 依赖） ────────────────────

class SimpleTemplate:
    """轻量模板引擎，支持 {{ var }}、{% if %}、{% for %}、{% include %}"""

    def __init__(self, template_dir: str):
        self.template_dir = template_dir
        self._cache = {}

    def render(self, template_name: str, context: dict) -> str:
        """渲染模板文件"""
        content = self._load(template_name)
        return self._process(content, context)

    def _load(self, name: str) -> str:
        if name not in self._cache:
            path = os.path.join(self.template_dir, name)
            if not os.path.isfile(path):
                raise FileNotFoundError(f"Template not found: {path}")
            with open(path, 'r', encoding='utf-8') as f:
                self._cache[name] = f.read()
        return self._cache[name]

    def _process(self, content: str, context: dict) -> str:
        # 处理 {% include 'file' %}
        content = self._resolve_includes(content)

        # 处理 {% for item in list %}...{% endfor %}
        content = self._resolve_for(content, context)

        # 处理 {% if var %}...{% endif %}
        content = self._resolve_if(content, context)

        # 处理 {{ var }} 和 {{ var.key }}
        content = self._resolve_vars(content, context)

        return content

    def _resolve_includes(self, content: str) -> str:
        def replace_include(match):
            filename = match.group(1).strip("'\"")
            return self._load(filename)
        return re.sub(r'\{%\s*include\s+([\'"][^\'"]+[\'"])\s*%\}',
                      replace_include, content)

    def _resolve_for(self, content: str, context: dict) -> str:
        pattern = r'\{%\s*for\s+(\w+)\s+in\s+(\w+(?:\.\w+)*)\s*%\}(.*?)\{%\s*endfor\s*%\}'
        def replace_for(match):
            var_name = match.group(1)
            list_path = match.group(2)
            body = match.group(3)
            items = self._resolve_path(list_path, context)
            if not items:
                return ''
            result = []
            for item in items:
                item_ctx = dict(context)
                item_ctx[var_name] = item
                # 也放入循环变量可直接访问的属性
                if isinstance(item, dict):
                    item_ctx.update({f'{var_name}_{k}': v for k, v in item.items()})
                result.append(self._process(body, item_ctx))
            return ''.join(result)
        return re.sub(pattern, replace_for, content, flags=re.DOTALL)

    def _resolve_if(self, content: str, context: dict) -> str:
        # 简单 if: {% if var %}...{% endif %}
        pattern = r'\{%\s*if\s+(\w+(?:\.\w+)*)\s*%\}(.*?)\{%\s*endif\s*%\}'
        def replace_if(match):
            var_path = match.group(1)
            body = match.group(2)
            val = self._resolve_path(var_path, context)
            return body if val else ''
        return re.sub(pattern, replace_if, content, flags=re.DOTALL)

    def _resolve_vars(self, content: str, context: dict) -> str:
        # 先处理 {{ var|safe }}（不转义 HTML）
        pattern_safe = r'\{\{\s*([\w.]+)\s*\|\s*safe\s*\}\}'
        content = re.sub(pattern_safe, lambda m: str(
            self._resolve_path(m.group(1), context) or ''
        ), content)

        # 再处理 {{ var }}
        pattern = r'\{\{\s*([\w.]+)\s*\}\}'
        def replace_var(match):
            var_path = match.group(1)
            val = self._resolve_path(var_path, context)
            return str(val) if val is not None else ''
        return re.sub(pattern, replace_var, content)

    def _resolve_path(self, path: str, context: dict):
        """解析 a.b.c 路径"""
        parts = path.split('.')
        val = context
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            elif isinstance(val, list) and p.isdigit():
                val = val[int(p)]
            else:
                return None
        return val


# ── 页面生成 ───────────────────────────────────

def extract_toc(body_html: str) -> list:
    """从正文 HTML 提取 h2/h3 目录（供文章页锚点导航使用）

    仅当存在至少一个 h2 时返回目录，否则返回空列表（模板不渲染 TOC）。
    """
    toc = []
    for m in re.finditer(r'<h([23]) id="([^"]+)">(.*?)</h\1>', body_html, re.DOTALL):
        text = re.sub(r'<[^>]+>', '', m.group(3)).strip()
        toc.append({'level': m.group(1), 'id': m.group(2), 'text': text})
    if not any(t['level'] == '2' for t in toc):
        return []
    return toc


def generate_all(articles: list, site_data: dict, articles_index: dict):
    """生成所有静态 HTML 页面"""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_dir = os.path.join(project_root, 'templates')

    tpl = SimpleTemplate(template_dir)

    # 首页 — 使用手工设计的 index.html（sac-ai.com 风格），不再从模板生成
    # 如果 index.html 不存在（首次构建），则从模板生成
    index_path = os.path.join(project_root, 'index.html')
    if not os.path.isfile(index_path):
        print("\n生成首页（首次）...")
        home_html = tpl.render('home.html', {
            'site': site_data['site'],
            'author': site_data['author'],
            'stats': site_data['stats'],
            'articles': articles_index['articles'],
            'latest_articles': articles_index['articles'][:6],
            'honors': site_data['author']['honors'],
        })
        write_html(home_html, index_path)
    else:
        print("\n保留现有首页（手工设计）...")

    # 文章详情页
    print(f"生成 {len(articles)} 个文章详情页...")
    from scripts.utils import md_to_html
    from scripts.generate_seo import article_meta_head, category_meta_head, all_articles_meta_head

    for i, a in enumerate(articles):
        # 读取原始 Markdown 并转换为 HTML
        body_html = ''
        try:
            with open(a['source_path'], 'r', encoding='utf-8') as f:
                md_content = f.read()
            # 去掉第一行标题（已在模板中显示）
            lines = md_content.split('\n')
            if lines and lines[0].startswith('# '):
                md_content = '\n'.join(lines[1:])
            body_html = md_to_html(md_content)
        except Exception as e:
            print(f"  [WARN] 转换失败 {a['title'][:30]}...: {e}")
            body_html = '<p>文章内容无法加载。</p>'

        # Build same-category article list for sidebar (cap at 20)
        same_cat = [art for art in articles_index['articles']
                    if art['category_id'] == a['category_id']][:20]
        # 移动端底部同类推荐（排除当前文章，取 3 篇）
        related = [art for art in same_cat if art['slug'] != a['slug']][:3]
        # 上一篇（更新）/ 下一篇（更旧）——articles 按日期倒序
        prev_article = None
        if i > 0:
            pa = articles[i - 1]
            prev_article = {'slug': pa['slug'], 'title': pa['title'], 'date_str': pa['date_str']}
        next_article = None
        if i + 1 < len(articles):
            na = articles[i + 1]
            next_article = {'slug': na['slug'], 'title': na['title'], 'date_str': na['date_str']}
        ctx = {
            'site': site_data['site'],
            'author': site_data['author'],
            'article': a,
            'stats': site_data['stats'],
            'body_html': body_html,
            'toc': extract_toc(body_html),
            'prev_article': prev_article,
            'next_article': next_article,
            'related_articles': related,
            'all_categories': site_data['stats']['categories'],
            'sidebar_active': a['category_id'],
            'sidebar_articles': same_cat,
            'sidebar_articles_title': a['category_label'],
            'current_slug': a['slug'],
            'article_meta': article_meta_head(a, site_data),
        }
        try:
            html = tpl.render('article.html', ctx)
            out_dir = os.path.join(project_root, 'articles', a['slug'])
            write_html(html, os.path.join(out_dir, 'index.html'))
        except Exception as e:
            print(f"  [WARN] 文章 {a['title'][:30]}... 渲染失败: {e}")
        if (i + 1) % 20 == 0:
            print(f"  ... {i + 1}/{len(articles)}")

    # 全部文章页
    print("生成全部文章页...")
    all_articles_html = tpl.render('all-articles.html', {
        'site': site_data['site'],
        'author': site_data['author'],
        'stats': site_data['stats'],
        'articles': articles_index['articles'],
        'all_categories': site_data['stats']['categories'],
        'sidebar_active': 'all',
        'sidebar_articles': None,
        'sidebar_articles_title': '',
        'current_slug': '',
        'all_articles_meta': all_articles_meta_head(site_data),
    })
    out_dir = os.path.join(project_root, 'articles')
    write_html(all_articles_html, os.path.join(out_dir, 'index.html'))

    # 分类列表页
    print("生成分类页...")
    categories = site_data['stats']['categories']
    for cat in categories:
        cat_articles = [a for a in articles_index['articles']
                        if a['category_id'] == cat['id']]
        ctx = {
            'site': site_data['site'],
            'author': site_data['author'],
            'category': cat,
            'articles': cat_articles,
            'stats': site_data['stats'],
            'all_categories': categories,
            'sidebar_active': cat['id'],
            'sidebar_articles': None,
            'sidebar_articles_title': '',
            'current_slug': '',
            'category_meta': category_meta_head(cat, site_data),
        }
        html = tpl.render('category.html', ctx)
        out_dir = os.path.join(project_root, 'categories', cat['id'])
        write_html(html, os.path.join(out_dir, 'index.html'))

    print("  → 完成")


def write_html(html: str, path: str):
    """写入 HTML 文件"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)


if __name__ == '__main__':
    from scripts.extract_articles import scan_articles
    from scripts.generate_index import generate_articles_index, generate_site_json

    articles = scan_articles()
    articles_index = generate_articles_index(articles)
    site_data = generate_site_json(articles)

    generate_all(articles, site_data, articles_index)
