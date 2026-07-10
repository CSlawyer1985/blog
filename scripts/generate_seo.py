"""
SEO / GEO 文件生成器

集中两类逻辑：
  1. JSON-LD 结构化数据构建（Person / WebSite / BlogPosting / BreadcrumbList / CollectionPage）
     —— 在 generate_pages.py 中调用，渲染为 <script type="application/ld+json"> 注入模板
  2. 站点级 SEO/GEO 文件生成（sitemap.xml / atom.xml / robots 之外的 / llms.txt / llms-full.txt）
     —— 在 build.py Phase 5 中调用

设计说明：
  - 模板引擎 SimpleTemplate 无 json 过滤器，所有 JSON-LD 在本模块用 json.dumps(ensure_ascii=False)
    预构建为完整 <script> 块字符串，模板侧用 {{ var|safe }} 注入，避免中文引号转义错误。
  - 采用 @graph 形式，同一页多个实体放在一个 JSON-LD 块中，通过 @id 互相引用，对解析器最稳健。
  - canonical 域名统一从 config.SITE['base_url'] 派生（已修正为 https://legalagi.cn）。
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from html import escape as html_escape
from xml.sax.saxutils import escape as xml_escape

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SITE

BASE_URL = SITE.get("base_url", "https://legalagi.cn").rstrip("/")
SITE_NAME = SITE.get("name", "")
SITE_DESC = SITE.get("description", "")
DEFAULT_OG = BASE_URL + SITE.get("default_og_image", "/assets/portrait.png")

# 中国时区（UTC+8），用于 feed 时间戳
CST = timezone(timedelta(hours=8))

# llms-full.txt 体积上限：超过则正文降级为摘要，避免单文件过大
LLMS_FULL_MAX_BYTES = 2_000_000


# ════════════════════════════════════════════════════════════
#  URL 工具
# ════════════════════════════════════════════════════════════

def article_url(slug: str) -> str:
    return f"{BASE_URL}/articles/{slug}/"


def category_url(category_id: str) -> str:
    return f"{BASE_URL}/categories/{category_id}/"


def cover_url(article: dict) -> str:
    """文章封面绝对 URL；无封面时回退到站点默认分享图"""
    if article.get("has_cover"):
        ext = ".png"
        cp = article.get("cover_path") or ""
        if cp.lower().endswith((".jpg", ".jpeg", ".webp")):
            ext = "." + cp.rsplit(".", 1)[-1].lower()
        return f"{BASE_URL}/articles/{article['slug']}/cover{ext}"
    return DEFAULT_OG


# ════════════════════════════════════════════════════════════
#  JSON-LD 实体构建（返回 dict，不含 @context）
# ════════════════════════════════════════════════════════════

def _split_firm(title: str):
    """从 '浙江海泰律师事务所副主任、高级合伙人' 拆出机构与职务"""
    marker = "律师事务所"
    if marker in title:
        idx = title.index(marker) + len(marker)
        return title[:idx], title[idx:].lstrip("、，, ")
    return None, title


def _person_entity(author: dict) -> dict:
    title = author.get("title", "")
    firm, job_title = _split_firm(title)
    dual = author.get("dual_identity", [])
    knows_about = list(dual) + ["建设工程", "房地产法律", "AI 法律应用", "法律科技"]

    same_as = []
    if SITE.get("github"):
        same_as.append(SITE["github"])
    ai_school = author.get("ai_school") or {}
    if ai_school.get("url"):
        same_as.append(ai_school["url"])

    person = {
        "@type": "Person",
        "@id": f"{BASE_URL}/#person",
        "name": author.get("name", SITE_NAME),
        "url": f"{BASE_URL}/about.html",
        "image": DEFAULT_OG,
        "description": author.get("bio_short", SITE_DESC),
        "jobTitle": job_title or title,
        "knowsAbout": knows_about,
        "nationality": {"@type": "Country", "name": "中国"},
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "宁波",
            "addressRegion": "浙江",
            "addressCountry": "CN",
        },
        "sameAs": same_as,
    }
    if firm:
        person["worksFor"] = {"@type": "Organization", "name": firm}
    if author.get("department"):
        person["department"] = author["department"]

    honors = author.get("honors") or []
    awards = [h.get("full") or h.get("title") for h in honors if h.get("full") or h.get("title")]
    if awards:
        person["award"] = awards

    return person


def _website_entity(author: dict) -> dict:
    return {
        "@type": "WebSite",
        "@id": f"{BASE_URL}/#website",
        "name": SITE_NAME,
        "alternateName": "legalAGI.cn",
        "url": BASE_URL + "/",
        "description": SITE_DESC,
        "inLanguage": "zh-CN",
        "image": DEFAULT_OG,
        "publisher": {"@id": f"{BASE_URL}/#person"},
        "author": {"@id": f"{BASE_URL}/#person"},
    }


def _article_entity(article: dict) -> dict:
    url = article_url(article["slug"])
    ent = {
        "@type": "BlogPosting",
        "@id": url + "#article",
        "headline": article["title"],
        "name": article["title"],
        "url": url,
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "datePublished": article["date"],
        "dateModified": article["date"],
        "description": article.get("excerpt", ""),
        "image": {
            "@type": "ImageObject",
            "url": cover_url(article),
        },
        "inLanguage": "zh-CN",
        "author": {"@id": f"{BASE_URL}/#person"},
        "publisher": {"@id": f"{BASE_URL}/#person"},
    }
    if article.get("category_label"):
        ent["articleSection"] = article["category_label"]
    if article.get("read_time"):
        ent["timeRequired"] = f"PT{article['read_time']}M"
    return ent


def _breadcrumb_entity(crumbs) -> dict:
    """crumbs: list of (name, url)"""
    items = []
    for i, (name, url) in enumerate(crumbs, 1):
        items.append({
            "@type": "ListItem",
            "position": i,
            "name": name,
            "item": url,
        })
    return {
        "@type": "BreadcrumbList",
        "@id": f"{BASE_URL}/#breadcrumb",
        "itemListElement": items,
    }


def _collection_entity(name: str, url: str, description: str) -> dict:
    return {
        "@type": "CollectionPage",
        "@id": url + "#collection",
        "name": name,
        "url": url,
        "description": description,
        "inLanguage": "zh-CN",
        "isPartOf": {"@id": f"{BASE_URL}/#website"},
        "author": {"@id": f"{BASE_URL}/#person"},
    }


def _render(entities) -> str:
    """实体列表 → 完整 <script type="application/ld+json"> 块"""
    if isinstance(entities, dict):
        graph = {"@context": "https://schema.org", **entities}
    else:
        graph = {"@context": "https://schema.org", "@graph": entities}
    body = json.dumps(graph, ensure_ascii=False, indent=2)
    return f'<script type="application/ld+json">\n{body}\n  </script>'


# ════════════════════════════════════════════════════════════
#  页面级 JSON-LD（模板调用入口）
# ════════════════════════════════════════════════════════════

def build_homepage_jsonld(site_data: dict) -> str:
    """首页（WebSite + Person）"""
    author = site_data["author"]
    return _render([_website_entity(author), _person_entity(author)])


def build_article_jsonld(article: dict, site_data: dict) -> str:
    """文章页（BlogPosting + Person + BreadcrumbList）"""
    author = site_data["author"]
    crumbs = [
        ("首页", BASE_URL + "/"),
        (article.get("category_label", "文章"), category_url(article["category_id"])),
        (article["title"], article_url(article["slug"])),
    ]
    return _render([
        _article_entity(article),
        _person_entity(author),
        _breadcrumb_entity(crumbs),
    ])


def build_category_jsonld(category: dict, site_data: dict) -> str:
    """分类页（CollectionPage + BreadcrumbList + Person）"""
    author = site_data["author"]
    url = category_url(category["id"])
    desc = f"{category['label']} — 共 {category.get('count', 0)} 篇文章"
    crumbs = [
        ("首页", BASE_URL + "/"),
        (category["label"], url),
    ]
    return _render([
        _collection_entity(category["label"], url, desc),
        _breadcrumb_entity(crumbs),
        _person_entity(author),
    ])


def build_all_articles_jsonld(site_data: dict) -> str:
    """全部文章页（CollectionPage + BreadcrumbList）"""
    stats = site_data.get("stats", {})
    url = f"{BASE_URL}/articles/"
    desc = f"全部文章 — 共 {stats.get('total_articles', 0)} 篇"
    crumbs = [
        ("首页", BASE_URL + "/"),
        ("全部文章", url),
    ]
    return _render([
        _collection_entity("全部文章", url, desc),
        _breadcrumb_entity(crumbs),
    ])


# ════════════════════════════════════════════════════════════
#  Open Graph / Twitter 标签片段（模板内联用）
#  返回可直接嵌入 <head> 的多行 HTML 字符串
# ════════════════════════════════════════════════════════════

def og_tags(title, description, url, image, og_type="website", extra=""):
    """生成 Open Graph + Twitter Card 标签（多行字符串）。
    属性值经 html_escape 转义，确保标题/摘要中的引号不破坏标签。"""
    esc = html_escape
    lines = [
        f'    <meta property="og:type" content="{og_type}">',
        f'    <meta property="og:site_name" content="{esc(SITE_NAME)}">',
        f'    <meta property="og:title" content="{esc(title)}">',
        f'    <meta property="og:description" content="{esc(description)}">',
        f'    <meta property="og:url" content="{url}">',
        f'    <meta property="og:image" content="{image}">',
        f'    <meta property="og:locale" content="{SITE.get("locale", "zh_CN")}">',
        f'    <meta name="twitter:card" content="summary_large_image">',
        f'    <meta name="twitter:title" content="{esc(title)}">',
        f'    <meta name="twitter:description" content="{esc(description)}">',
        f'    <meta name="twitter:image" content="{image}">',
    ]
    if extra:
        lines.append(extra)
    return "\n".join(lines)


def _rss_link():
    return f'    <link rel="alternate" type="application/atom+xml" title="{html_escape(SITE_NAME)}" href="{SITE.get("rss_path", "/atom.xml")}">'


def article_meta_head(article: dict, site_data: dict) -> str:
    """文章页 <head> SEO 区块：canonical + RSS + OG/Twitter + JSON-LD。
    供模板 {{ article_meta|safe }} 注入。"""
    url = article_url(article["slug"])
    img = cover_url(article)
    title = article["title"]
    desc = article.get("excerpt", "")
    author_name = site_data.get("author", {}).get("name", "")
    og = og_tags(
        title, desc, url, img, og_type="article",
        extra=(f'    <meta property="article:published_time" content="{article["date"]}">\n'
               f'    <meta property="article:author" content="{html_escape(author_name)}">\n'
               f'    <meta property="article:section" content="{html_escape(article.get("category_label", ""))}">'),
    )
    return (
        f'    <link rel="canonical" href="{url}">\n'
        f"{_rss_link()}\n"
        f"{og}\n"
        f"{build_article_jsonld(article, site_data)}"
    )


def category_meta_head(category: dict, site_data: dict) -> str:
    """分类页 <head> SEO 区块。"""
    url = category_url(category["id"])
    label = category["label"]
    count = category.get("count", 0)
    desc = f"{label} — 共 {count} 篇文章"
    og = og_tags(label, desc, url, DEFAULT_OG)
    return (
        f'    <link rel="canonical" href="{url}">\n'
        f"{_rss_link()}\n"
        f"{og}\n"
        f"{build_category_jsonld(category, site_data)}"
    )


def all_articles_meta_head(site_data: dict) -> str:
    """全部文章页 <head> SEO 区块。"""
    url = f"{BASE_URL}/articles/"
    stats = site_data.get("stats", {})
    desc = f"全部文章 — 共 {stats.get('total_articles', 0)} 篇"
    og = og_tags("全部文章", desc, url, DEFAULT_OG)
    return (
        f'    <link rel="canonical" href="{url}">\n'
        f"{_rss_link()}\n"
        f"{og}\n"
        f"{build_all_articles_jsonld(site_data)}"
    )


def homepage_meta_head(site_data: dict) -> str:
    """首页 <head> SEO 区块（用于 index.html 手工注入或脚本同步）。"""
    url = BASE_URL + "/"
    og = og_tags(SITE_NAME, SITE_DESC, url, DEFAULT_OG)
    return (
        f'    <link rel="canonical" href="{url}">\n'
        f"{_rss_link()}\n"
        f"{og}\n"
        f"{build_homepage_jsonld(site_data)}"
    )


# ════════════════════════════════════════════════════════════
#  sitemap.xml
# ════════════════════════════════════════════════════════════

def generate_sitemap(articles: list, site_data: dict, out_dir: str):
    """生成 sitemap.xml（首页 + 分类 + 全部文章 + 关于 + 全部文章详情页）"""
    today = datetime.now(CST).date().isoformat()
    urls = []

    # 首页
    urls.append((BASE_URL + "/", today, "daily", "1.0"))
    # 全部文章页
    urls.append((f"{BASE_URL}/articles/", today, "weekly", "0.9"))
    # 关于页
    if os.path.isfile(os.path.join(out_dir, "about.html")):
        urls.append((f"{BASE_URL}/about.html", today, "monthly", "0.5"))
    # 分类页
    for cat in site_data.get("stats", {}).get("categories", []):
        urls.append((category_url(cat["id"]), today, "weekly", "0.6"))
    # 文章详情页（articles 已按日期倒序）
    for a in articles:
        urls.append((article_url(a["slug"]), a["date"], "monthly", "0.7"))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod, freq, prio in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{xml_escape(url)}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{freq}</changefreq>")
        lines.append(f"    <priority>{prio}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")

    path = os.path.join(out_dir, "sitemap.xml")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → sitemap.xml ({len(urls)} URLs)")


# ════════════════════════════════════════════════════════════
#  Atom feed (atom.xml)
# ════════════════════════════════════════════════════════════

def generate_rss(articles: list, site_data: dict, out_dir: str, limit: int = 20):
    """生成 atom.xml，取最近 limit 篇文章"""
    author = site_data.get("author", {})
    author_name = author.get("name", SITE.get("author", ""))
    updated = datetime.now(CST).strftime("%Y-%m-%dT%H:%M:%S%z")
    # 2026-07-10T...+0800 → +08:00
    updated = updated[:-2] + ":" + updated[-2:]

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<feed xmlns="http://www.w3.org/2005/Atom">',
             f'  <title>{xml_escape(SITE_NAME)}</title>',
             f'  <link rel="alternate" type="text/html" hreflang="zh" href="{BASE_URL}/"/>',
             f'  <link rel="self" type="application/atom+xml" href="{BASE_URL}/atom.xml"/>',
             f'  <id>{BASE_URL}/</id>',
             f'  <updated>{updated}</updated>',
             f'  <author><name>{xml_escape(author_name)}</name></author>',
             f'  <subtitle>{xml_escape(SITE_DESC)}</subtitle>']

    for a in articles[:limit]:
        url = article_url(a["slug"])
        pub = a["date"] + "T00:00:00+08:00"
        lines.append("  <entry>")
        lines.append(f"    <title>{xml_escape(a['title'])}</title>")
        lines.append(f'    <link rel="alternate" type="text/html" href="{url}"/>')
        lines.append(f"    <id>{url}</id>")
        lines.append(f"    <published>{pub}</published>")
        lines.append(f"    <updated>{pub}</updated>")
        if a.get("category_label"):
            lines.append(f'    <category term="{xml_escape(a["category_label"])}"/>')
        lines.append(f"    <summary>{xml_escape(a.get('excerpt', ''))}</summary>")
        lines.append("  </entry>")

    lines.append("</feed>")

    path = os.path.join(out_dir, "atom.xml")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → atom.xml ({min(len(articles), limit)} entries)")


# ════════════════════════════════════════════════════════════
#  llms.txt + llms-full.txt（GEO）
# ════════════════════════════════════════════════════════════

def generate_llms_txt(articles: list, site_data: dict, out_dir: str):
    """生成 llms.txt —— 站点根 Markdown 导航文件（Jeremy Howard 2024.09 提案）"""
    stats = site_data.get("stats", {})
    author = site_data.get("author", {})

    # 按分类分组
    by_cat = {}
    for a in articles:
        by_cat.setdefault(a["category_label"], []).append(a)

    lines = [
        f"# {SITE_NAME}",
        "",
        f"> {SITE_DESC} 作者：{author.get('name', '')}，{author.get('title', '')}。",
        f"> 共 {stats.get('total_articles', len(articles))} 篇文章，聚焦 AI+法律方法论与建设工程法律实务。",
        "",
        "## 核心页面",
        "",
        f"- [关于陈石]({BASE_URL}/about.html): {author.get('bio_short', '')}",
        f"- [全部文章]({BASE_URL}/articles/): {stats.get('total_articles', len(articles))} 篇",
        f"- [RSS 订阅]({BASE_URL}/atom.xml): Atom feed",
        "",
        "## 重点文章（按分类）",
        "",
    ]

    for cat_label, arts in by_cat.items():
        lines.append(f"### {cat_label}")
        lines.append("")
        for a in arts:
            excerpt = (a.get("excerpt") or "").replace("\n", " ").strip()
            lines.append(f"- [{a['title']}]({article_url(a['slug'])}): {excerpt}")
        lines.append("")

    path = os.path.join(out_dir, "llms.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → llms.txt ({len(articles)} articles)")


def generate_llms_full_txt(articles: list, site_data: dict, out_dir: str,
                           max_bytes: int = LLMS_FULL_MAX_BYTES) -> bool:
    """生成 llms-full.txt —— 全站文章纯文本合集，便于 AI 一次性抓取。

    超过 max_bytes 时正文降级为摘要（标题 + URL + excerpt），避免单文件过大。
    返回是否实际生成（体积过大且无内容时返回 False）。
    """
    author = site_data.get("author", {})
    header = [
        f"# {SITE_NAME} — 全文合集",
        "",
        f"> {SITE_DESC}",
        f"> 作者：{author.get('name', '')}，{author.get('title', '')}",
        f"> 站点：{BASE_URL}/",
        "",
        "---",
        "",
    ]
    parts = list(header)
    total = sum(len(s.encode("utf-8")) for s in parts)
    full_mode = True

    for a in articles:
        url = article_url(a["slug"])
        if full_mode:
            body = _read_article_text(a.get("source_path"))
        else:
            body = a.get("excerpt", "")

        block = [f"## {a['title']}", "", f"URL: {url}", f"日期: {a['date']} | 分类: {a.get('category_label', '')}", ""]
        if body:
            block.append(body)
        block.append("")
        block.append("---")
        block.append("")

        chunk = "\n".join(block)
        chunk_size = len(chunk.encode("utf-8"))
        if full_mode and total + chunk_size > max_bytes:
            # 切换到摘要模式
            full_mode = False
            body = a.get("excerpt", "")
            chunk = "\n".join([f"## {a['title']}", "", f"URL: {url}",
                               f"日期: {a['date']} | 分类: {a.get('category_label', '')}", "",
                               body, "", "---", ""])
            chunk_size = len(chunk.encode("utf-8"))

        parts.append(chunk)
        total += chunk_size

    path = os.path.join(out_dir, "llms-full.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    mode_note = "全文" if full_mode else "摘要（超体积上限降级）"
    print(f"  → llms-full.txt ({total // 1024}KB, {mode_note})")
    return True


def _read_article_text(source_path: str) -> str:
    """读取文章 Markdown，去掉首行 H1 标题，返回纯文本正文"""
    if not source_path or not os.path.isfile(source_path):
        return ""
    try:
        with open(source_path, "r", encoding="utf-8") as f:
            content = f.read()
        lines = content.split("\n")
        # 去掉首个 H1（标题已在 llms 结构中单独列出）
        if lines and lines[0].startswith("# "):
            lines = lines[1:]
        # 去掉文末作者简介分隔之后的作者简介（常见于本工作区文章）
        text = "\n".join(lines).strip()
        return text
    except Exception:
        return ""


# ════════════════════════════════════════════════════════════
#  统一入口（build.py 调用）
# ════════════════════════════════════════════════════════════

def generate_all(articles: list, site_data: dict, out_dir: str, llms_full: bool = True):
    """生成全部站点级 SEO/GEO 文件"""
    generate_sitemap(articles, site_data, out_dir)
    generate_rss(articles, site_data, out_dir)
    generate_llms_txt(articles, site_data, out_dir)
    if llms_full:
        generate_llms_full_txt(articles, site_data, out_dir)


def inject_index_meta(site_data: dict, index_path: str):
    """将首页 SEO head 注入 index.html 的 <!-- SEO_HEAD_BEGIN/END --> 标记之间。

    index.html 是手工设计的（generate_pages.py 仅首次生成后保留），因此用标记区
    让 SEO head 随构建自动更新，避免手工维护导致陈旧。
    """
    if not os.path.isfile(index_path):
        print("  [SKIP] index.html 不存在，跳过首页 SEO 注入")
        return

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    begin = "<!-- SEO_HEAD_BEGIN -->"
    end = "<!-- SEO_HEAD_END -->"
    if begin not in content or end not in content:
        print("  [SKIP] index.html 未找到 SEO_HEAD 标记，跳过注入")
        return

    meta = homepage_meta_head(site_data)
    before = content[:content.index(begin)]
    after = content[content.index(end) + len(end):]
    new_content = f"{before}{begin}\n{meta}\n  {end}{after}"

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("  → index.html SEO head 已注入")


if __name__ == "__main__":
    # 独立测试：扫描文章并生成全部文件
    from scripts.extract_articles import scan_articles
    from scripts.generate_index import generate_site_json

    arts = scan_articles()
    sd = generate_site_json(arts)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    generate_all(arts, sd, project_root)
