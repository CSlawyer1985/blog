"""
文章提取器 — 从文章工作区扫描所有 Markdown 文件，解析元数据并分类

扫描逻辑：
1. 遍历 ARTICLE_WORKSPACE 下所有 YYYYMMDD_topic/output/*.md
2. 使用 utils.py 提取标题、正文、摘要、分类
3. 返回 Article 对象列表
"""

import os
import re
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import ARTICLE_WORKSPACE, CATEGORIES
from scripts.utils import (
    parse_article_dir, extract_title_and_body,
    classify_article, count_chars, estimate_read_time,
    extract_excerpt, slugify
)


def scan_articles(workspace: str = None) -> list:
    """扫描文章工作区，返回 Article dict 列表（按日期倒序）"""
    if workspace is None:
        workspace = ARTICLE_WORKSPACE

    articles = []

    if not os.path.isdir(workspace):
        print(f"[WARN] 文章工作区不存在: {workspace}")
        return articles

    for dirname in sorted(os.listdir(workspace), reverse=True):
        dirpath = os.path.join(workspace, dirname)
        if not os.path.isdir(dirpath):
            continue

        # 跳过非文章目录
        if dirname.startswith('.') or dirname in ('scratch', 'output'):
            continue

        # 查找 output/ 子目录
        output_dir = os.path.join(dirpath, 'output')
        if not os.path.isdir(output_dir):
            continue

        # 查找 .md 文件
        md_files = [f for f in os.listdir(output_dir)
                    if f.endswith('.md') and not f.endswith('_wechat.md')]

        for mdfile in md_files:
            md_path = os.path.join(output_dir, mdfile)
            try:
                article = process_article(md_path, dirname)
                if article:
                    # 只收录有封面图的文章
                    if article['has_cover']:
                        articles.append(article)
            except Exception as e:
                print(f"[WARN] 处理文章失败: {md_path} — {e}")

    # 按日期倒序
    articles.sort(key=lambda a: a['date'], reverse=True)
    return articles


def process_article(md_path: str, dirname: str) -> dict:
    """处理单篇文章，返回结构化 dict"""
    # 解析目录名获取日期
    dir_info = parse_article_dir(dirname)
    if not dir_info['date']:
        return None

    # 提取标题和正文
    content = extract_title_and_body(md_path)
    title = content['title']
    body_md = content['body_md']
    bio_md = content['bio_md']
    has_cover = content['has_cover']

    # 字符统计
    char_count = count_chars(body_md)
    read_time = estimate_read_time(char_count)

    # 分类
    body_first_500 = body_md[:500] if body_md else ''
    category_id = classify_article(title, body_first_500, CATEGORIES)

    # 查找分类标签
    category_label = '未分类'
    for cat in CATEGORIES:
        if cat['id'] == category_id:
            category_label = cat['label']
            break

    # 摘要
    excerpt = extract_excerpt(body_md, 150)

    # 生成 slug
    slug = f"{dir_info['date']}-{slugify(title)}"

    # 检查是否有微信公众号 HTML 版本
    has_wechat = any(
        f.endswith('_wechat.html')
        for f in os.listdir(os.path.dirname(md_path))
    )

    # 查找封面图
    cover_path = None
    output_dir = os.path.dirname(md_path)
    for ext in ['.png', '.jpg', '.jpeg', '.webp']:
        candidate = os.path.join(output_dir, f'cover{ext}')
        if os.path.isfile(candidate):
            cover_path = candidate
            break

    # has_cover 综合判定：md 正文引用了封面图，或 output 目录存在 cover 文件
    # 后者覆盖正文未引用图片但实际有封面文件的情况（如 WorkBuddy 文章正文以摘要引用开头）
    has_cover = has_cover or cover_path is not None

    return {
        'id': slug,
        'title': title,
        'date': dir_info['date'],
        'date_str': dir_info['date_str'],
        'category_id': category_id,
        'category_label': category_label,
        'char_count': char_count,
        'read_time': read_time,
        'excerpt': excerpt,
        'has_cover': has_cover,
        'has_wechat': has_wechat,
        'has_bio': bool(bio_md.strip()),
        'slug': slug,
        'source_path': md_path,
        'cover_path': cover_path,
        'topic': dir_info['topic'],
    }


if __name__ == '__main__':
    articles = scan_articles()
    print(f"共扫描到 {len(articles)} 篇文章")
    for a in articles[:5]:
        print(f"  [{a['date']}] [{a['category_label']}] {a['title']} ({a['char_count']}字)")
