"""清理 articles/ 下无封面的过期文章目录"""
import os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.extract_articles import scan_articles

valid = {a['slug'] for a in scan_articles()}
articles_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'articles')
existing = [d for d in os.listdir(articles_dir)
            if os.path.isdir(os.path.join(articles_dir, d)) and d not in ('__pycache__',)]
stale = [d for d in existing if d not in valid]

print(f"有效文章(有封面): {len(valid)}")
print(f"现有目录: {len(existing)}")
print(f"需清理: {len(stale)}")

for d in stale:
    path = os.path.join(articles_dir, d)
    shutil.rmtree(path)
    print(f"  删除 articles/{d}/")

print(f"\n完成，清理 {len(stale)} 个目录")
