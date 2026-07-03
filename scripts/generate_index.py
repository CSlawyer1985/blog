"""
索引生成器 — 从 Article 列表生成 data/articles.json + data/site.json
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import SITE, AUTHOR, CATEGORIES


def generate_articles_index(articles: list) -> dict:
    """生成文章索引（仅含元数据，不含全文 HTML）"""
    index = {
        "updated": "",
        "total": len(articles),
        "articles": []
    }

    for a in articles:
        index["articles"].append({
            "id": a["id"],
            "title": a["title"],
            "date": a["date"],
            "date_str": a["date_str"],
            "category_id": a["category_id"],
            "category_label": a["category_label"],
            "char_count": a["char_count"],
            "read_time": a["read_time"],
            "excerpt": a["excerpt"],
            "has_cover": a["has_cover"],
            "slug": a["slug"],
        })

    if articles:
        index["updated"] = articles[0]["date"]

    return index


def generate_site_json(articles: list) -> dict:
    """生成站点元数据（含动态统计）"""
    from datetime import datetime

    # 分类统计
    category_counts = {}
    for a in articles:
        cid = a["category_id"]
        category_counts[cid] = category_counts.get(cid, 0) + 1

    categories = []
    for cat in CATEGORIES:
        count = category_counts.get(cat["id"], 0)
        if count > 0:
            categories.append({
                "id": cat["id"],
                "label": cat["label"],
                "count": count
            })

    return {
        "site": SITE,
        "author": AUTHOR,
        "stats": {
            "total_articles": len(articles),
            "total_chars": sum(a["char_count"] for a in articles),
            "honor_count": len(AUTHOR["honors"]),
            "categories": categories,
            "updated": datetime.now().isoformat()
        }
    }


def write_json(data: dict, path: str):
    """写入 JSON 文件并验证"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(path)
    print(f"  → {path} ({size:,} bytes)")


if __name__ == '__main__':
    from scripts.extract_articles import scan_articles

    articles = scan_articles()
    print(f"\n生成索引: {len(articles)} 篇文章")

    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')

    # 生成 articles.json（仅元数据）
    articles_index = generate_articles_index(articles)
    write_json(articles_index, os.path.join(data_dir, 'articles.json'))

    # 生成 site.json（站点元数据 + 动态统计）
    site_data = generate_site_json(articles)
    write_json(site_data, os.path.join(data_dir, 'site.json'))
