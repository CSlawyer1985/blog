#!/usr/bin/env python3
"""
陈石 · 法与AI — 博客构建入口

用法:
    python3 build.py          # 完整构建（扫描→索引→生成页面）
    python3 build.py --stats  # 仅显示文章统计

构建产物:
    index.html                 首页
    articles/{slug}/index.html 文章详情页
    categories/{id}/index.html 分类列表页
    data/articles.json         文章元数据索引
    data/site.json             站点元数据+动态统计
"""

import sys
import os
import shutil

# 确保项目根目录在 path 中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.extract_articles import scan_articles
from scripts.generate_index import generate_articles_index, generate_site_json, write_json
from scripts.generate_pages import generate_all
from config import ARTICLE_WORKSPACE


def build():
    """完整构建流程"""
    print("=" * 60)
    print("  陈石 · 法与AI — 博客构建")
    print("=" * 60)

    # Phase 1: 扫描文章
    print("\n[1/4] 扫描文章工作区...")
    articles = scan_articles()
    print(f"  共发现 {len(articles)} 篇文章")

    if not articles:
        print("\n[ABORT] 未找到任何文章，请检查 ARTICLE_WORKSPACE 路径配置。")
        sys.exit(1)

    # 统计
    total_chars = sum(a['char_count'] for a in articles)
    categories = {}
    for a in articles:
        c = a['category_label']
        categories[c] = categories.get(c, 0) + 1

    print(f"  总字数: {total_chars:,}")
    print(f"  分类统计:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"    {cat}: {count} 篇")

    uncategorized = [a for a in articles if a['category_id'] == 'uncategorized']
    if uncategorized:
        print(f"\n  ⚠️  未分类文章 ({len(uncategorized)} 篇):")
        for a in uncategorized:
            print(f"    [{a['date']}] {a['title'][:50]}")

    # Phase 2: 生成索引
    print("\n[2/4] 生成数据索引...")
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)

    articles_index = generate_articles_index(articles)
    write_json(articles_index, os.path.join(data_dir, 'articles.json'))

    site_data = generate_site_json(articles)
    write_json(site_data, os.path.join(data_dir, 'site.json'))

    # Phase 3: 生成页面
    print("\n[3/4] 渲染 HTML 页面...")
    generate_all(articles, site_data, articles_index)

    # Phase 4: 复制文章封面图
    print("\n[4/4] 复制文章封面图...")
    cover_count = copy_cover_images(articles)
    print(f"  已复制 {cover_count} 张封面图")

    print("\n" + "=" * 60)
    print(f"  ✅ 构建完成！共生成 {len(articles)} 个文章页面")
    print(f"  本地预览: python3 -m http.server 8080")
    print("=" * 60)


def check_assets():
    """检查必要的静态资源"""
    project_root = os.path.dirname(__file__)
    checks = [
        'css/variables.css',
        'css/base.css',
        'css/components.css',
        'css/home.css',
        'css/article.css',
        'js/main.js',
        'js/home.js',
        'js/article.js',
        'templates/base.html',
        'templates/home.html',
        'templates/article.html',
        'templates/category.html',
    ]
    for path in checks:
        full = os.path.join(project_root, path)
        if not os.path.isfile(full):
            print(f"  ⚠️  缺失: {path}")


def copy_cover_images(articles: list) -> int:
    """从文章工作区复制封面图到博客输出目录"""
    count = 0
    project_root = os.path.dirname(__file__)
    workspace = ARTICLE_WORKSPACE

    for a in articles:
        source_path = a.get('source_path', '')
        if not source_path:
            continue

        # 封面图在文章 md 同目录下
        src_dir = os.path.dirname(source_path)
        dest_dir = os.path.join(project_root, 'articles', a['slug'])

        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
            src = os.path.join(src_dir, f'cover{ext}')
            if os.path.isfile(src):
                os.makedirs(dest_dir, exist_ok=True)
                dest = os.path.join(dest_dir, f'cover{ext}')
                shutil.copy2(src, dest)
                count += 1
                break

    return count


def show_stats():
    """仅显示文章统计，不构建"""
    articles = scan_articles()
    print(f"文章总数: {len(articles)}")
    total_chars = sum(a['char_count'] for a in articles)
    print(f"总字数: {total_chars:,}")
    categories = {}
    for a in articles:
        c = a['category_label']
        categories[c] = categories.get(c, 0) + 1
    print(f"\n分类统计:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} 篇")
    print(f"\n最近 5 篇:")
    for a in articles[:5]:
        print(f"  [{a['date']}] [{a['category_label']}] {a['title']}")


if __name__ == '__main__':
    if '--stats' in sys.argv or '-s' in sys.argv:
        show_stats()
    else:
        build()
