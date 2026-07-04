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
import subprocess

# 确保项目根目录在 path 中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.extract_articles import scan_articles
from scripts.generate_index import generate_articles_index, generate_site_json, write_json
from scripts.generate_pages import generate_all
from config import ARTICLE_WORKSPACE

# ── 图片压缩配置 ──
PNGQUANT_BIN = "/opt/homebrew/bin/pngquant"
COVER_QUALITY = "65-80"       # 文章封面：平衡质量与体积
ASSET_QUALITY = "70-90"       # 头像/二维码等关键素材：更高质量
COVER_MAX_WIDTH = 1400        # 封面最大宽度（2x retina，实际显示 ≤700px）


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
    """从文章工作区复制封面图到博客输出目录，并自动压缩"""
    count = 0
    compressed = 0
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

                # 先缩放到合理尺寸，再压缩
                if ext == '.png':
                    before = os.path.getsize(dest)
                    resize_image(dest, COVER_MAX_WIDTH)
                    if compress_image(dest, COVER_QUALITY):
                        after = os.path.getsize(dest)
                        saved = (before - after) / before * 100
                        print(f"  📷 {a['slug'][:50]}... 压缩: {before//1024}KB → {after//1024}KB ({saved:.0f}%)")
                        compressed += 1
                break

    if compressed:
        print(f"  ✅ 已压缩 {compressed} 张封面图")
    return count


def resize_image(path: str, max_width: int) -> bool:
    """用 Pillow 缩放图片到指定最大宽度（保持比例）。

    Args:
        path: 图片文件路径
        max_width: 最大宽度（像素），超过此宽度才缩放

    Returns:
        True 如果进行了缩放，False 如果跳过
    """
    if not os.path.isfile(path):
        return False

    try:
        from PIL import Image
        img = Image.open(path)
        if img.width <= max_width:
            return False  # 已经够小，跳过

        # 计算新高度（保持比例）
        ratio = max_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_width, new_h), Image.LANCZOS)
        img.save(path, optimize=True)
        return True
    except Exception as e:
        print(f"  ⚠️  缩放失败: {path} — {e}")
        return False


def compress_image(path: str, quality: str = COVER_QUALITY) -> bool:
    """用 pngquant 压缩 PNG 图片，原地替换。

    Args:
        path: 图片文件路径
        quality: 质量范围，如 "65-80"

    Returns:
        True 如果压缩成功，False 如果跳过或失败
    """
    if not os.path.isfile(path):
        return False

    ext = os.path.splitext(path)[1].lower()
    if ext != '.png':
        return False  # 非 PNG 跳过（后续可扩展 WebP 转换）

    if not os.path.isfile(PNGQUANT_BIN):
        print(f"  ⚠️  pngquant 未安装 ({PNGQUANT_BIN})，跳过压缩")
        return False

    # 在临时目录生成压缩版，压缩成功则原地替换
    tmp = path + '.tmp'
    try:
        subprocess.run(
            [PNGQUANT_BIN, f'--quality={quality}', '--speed', '1',
             '--force', '--output', tmp, path],
            check=True, capture_output=True
        )
        # 验证压缩后文件有效且比原文件小
        if os.path.isfile(tmp) and os.path.getsize(tmp) > 0:
            if os.path.getsize(tmp) < os.path.getsize(path):
                os.replace(tmp, path)
                return True
            else:
                os.remove(tmp)  # 没变小，保留原文件
                return False
        return False
    except subprocess.CalledProcessError as e:
        print(f"  ⚠️  压缩失败: {path} — {e.stderr.decode() if e.stderr else e}")
        # 清理临时文件
        if os.path.isfile(tmp):
            os.remove(tmp)
        return False


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


def compress_existing():
    """压缩博客输出目录中所有已有 PNG 图片（articles/ 和 assets/）"""
    import glob
    project_root = os.path.dirname(os.path.abspath(__file__))
    patterns = [
        os.path.join(project_root, 'articles', '**', '*.png'),
        os.path.join(project_root, 'assets', '*.png'),
    ]
    files = []
    for pat in patterns:
        files.extend(glob.glob(pat, recursive=True))

    # 区分封面和素材
    cover_files = [f for f in files if '/articles/' in f]
    asset_files = [f for f in files if '/assets/' in f]

    total_before = sum(os.path.getsize(f) for f in files)
    compressed = 0

    print(f"共找到 {len(files)} 张图片（{len(cover_files)} 张封面 + {len(asset_files)} 张素材）")
    print(f"压缩前总大小: {total_before/1024/1024:.1f} MB\n")

    for f in cover_files:
        before = os.path.getsize(f)
        quality = COVER_QUALITY
        resize_image(f, COVER_MAX_WIDTH)  # 先缩放到合理尺寸
        if compress_image(f, quality):
            after = os.path.getsize(f)
            saved = (before - after) / before * 100
            print(f"  {os.path.relpath(f, project_root)}: {before//1024}KB → {after//1024}KB ({saved:.0f}%)")
            compressed += 1

    for f in asset_files:
        before = os.path.getsize(f)
        quality = ASSET_QUALITY  # 头像等素材用更高质量
        if compress_image(f, quality):
            after = os.path.getsize(f)
            saved = (before - after) / before * 100
            print(f"  {os.path.relpath(f, project_root)}: {before//1024}KB → {after//1024}KB ({saved:.0f}%)")
            compressed += 1

    total_after = sum(os.path.getsize(f) for f in files)
    print(f"\n  ✅ 已压缩 {compressed} 张")
    print(f"  总大小: {total_before/1024/1024:.1f}MB → {total_after/1024/1024:.1f}MB "
          f"({(total_before - total_after)/total_before*100:.0f}%)")


if __name__ == '__main__':
    if '--stats' in sys.argv or '-s' in sys.argv:
        show_stats()
    elif '--compress' in sys.argv or '-c' in sys.argv:
        compress_existing()
    else:
        build()
