"""
共享工具函数 — slug 生成、日期解析、文章分类器
"""

import re
import os
from datetime import datetime


def slugify(text: str) -> str:
    """将中文标题转为 URL-safe slug（保留中文）"""
    # 移除 Markdown 链接和图片语法
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', r'\1', text)
    # 保留中文字符、字母、数字，其余替换为连字符
    text = re.sub(r'[^\w一-鿿]+', '-', text)
    text = text.strip('-')
    # 合并多个连字符
    text = re.sub(r'-{2,}', '-', text)
    return text or 'untitled'


def parse_article_dir(dirname: str) -> dict:
    """从目录名解析日期和主题键

    目录名格式: YYYYMMDD_topic_key 或 YYYYMMDD_主题
    返回: {"date": "YYYY-MM-DD", "date_str": "YYYY年MM月DD日", "topic": "..."}
    """
    date_str = dirname[:8]
    topic = dirname[9:] if len(dirname) > 9 and dirname[8] == '_' else ''
    try:
        dt = datetime.strptime(date_str, '%Y%m%d')
        return {
            "date": dt.strftime('%Y-%m-%d'),
            "date_str": f"{dt.year}年{dt.month}月{dt.day}日",
            "topic": topic
        }
    except ValueError:
        return {"date": "", "date_str": "", "topic": topic}


def classify_article(title: str, body_first_500: str, categories: list) -> str:
    """基于标题和正文前 500 字的关键词匹配，返回分类 ID

    首条关键词匹配制。未匹配返回 'uncategorized'。
    """
    text = f"{title} {body_first_500}"
    for cat in categories:
        for kw in cat["keywords"]:
            if kw.lower() in text.lower():
                return cat["id"]
    return "uncategorized"


def extract_title_and_body(md_path: str) -> dict:
    """从 Markdown 文件提取标题、正文、作者简介

    返回: {
        "title": str,
        "body_md": str,        # 不含标题的正文 Markdown
        "bio_md": str,         # 作者简介 Markdown（如有）
        "has_cover": bool,     # 是否有封面图
        "cover_alt": str       # 封面图 alt 文本
    }
    """
    with open(md_path, 'r', encoding='utf-8') as f:
        raw = f.read()

    lines = raw.split('\n')
    title = ''
    body_start = 0

    # 提取标题（第一个 # 开头的行）
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('# '):
            title = stripped[2:].strip()
            body_start = i + 1
            break

    if not title:
        title = os.path.splitext(os.path.basename(md_path))[0]

    body = '\n'.join(lines[body_start:])

    # 检测封面图（正文开头的 ![cover] 或 ![...] 图片）
    has_cover = False
    cover_alt = ''
    cover_match = re.match(r'!\[([^\]]*)\]\(([^\)]+)\)', body.strip())
    if cover_match:
        has_cover = True
        cover_alt = cover_match.group(1)

    # 分离作者简介（最后一个 --- 之后，或 > **作者简介：** 之后）
    bio_md = ''
    main_body = body

    # 先尝试 --- 分隔
    parts = body.rsplit('\n---\n', 1)
    if len(parts) == 2:
        main_body, bio_md = parts[0], parts[1]
    else:
        # 尝试 > **作者简介：** 或 > **作者简介** 标记
        bio_match = re.search(
            r'\n(?:>\s*\*{0,2}作者简介[：:]\*{0,2}.*)',
            body
        )
        if bio_match:
            split_pos = bio_match.start()
            main_body = body[:split_pos]
            bio_md = body[split_pos:]

    return {
        "title": title,
        "body_md": main_body.strip(),
        "bio_md": bio_md.strip(),
        "has_cover": has_cover,
        "cover_alt": cover_alt
    }


def count_chars(text: str) -> int:
    """统计中文字符数（不含英文、数字、标点、空白）"""
    return len(re.findall(r'[一-鿿]', text))


def estimate_read_time(char_count: int) -> int:
    """估算阅读时间（分钟），按中文 400 字/分钟"""
    return max(1, round(char_count / 400))


def extract_excerpt(md_text: str, max_chars: int = 120) -> str:
    """从 Markdown 正文提取摘要（前 max_chars 个中文字符）"""
    # 去掉 Markdown 语法
    clean = re.sub(r'[#*\->`\[\]\(\)!]', '', md_text)
    clean = re.sub(r'\s+', '', clean)
    # 去掉封面图
    clean = re.sub(r'封面.*', '', clean)
    chars = re.findall(r'[一-鿿]', clean)
    excerpt = ''.join(chars[:max_chars])
    return excerpt


# ── 简易 Markdown → HTML 转换器 ──────────────────

def md_to_html(md_text: str) -> str:
    """将 Markdown 转换为 HTML（覆盖博客文章常用语法）

    支持: 标题(h2-h4)、段落、行内粗体/斜体/代码/链接/图片、
          无序列表(含一级嵌套)、有序列表、代码块(fenced)、
          ```svg 代码块直渲染、管道表格、引用块、水平线
    """
    lines = md_text.split('\n')
    html_lines = []
    i = 0
    in_code_block = False
    code_block_lines = []
    code_lang = ''
    in_blockquote = False
    # 列表栈：[(list_type, indent), ...]，open_li 记录各层是否有未闭合 <li>
    list_stack = []
    open_li = []

    def close_one_list():
        """闭合最内层列表（含未闭合的 <li>）"""
        if open_li and open_li[-1]:
            html_lines.append('</li>')
            open_li[-1] = False
        if list_stack:
            html_lines.append(f'</{list_stack[-1][0]}>')
            list_stack.pop()
            open_li.pop()

    def flush_list():
        """闭合所有列表"""
        while list_stack:
            close_one_list()

    def flush_blockquote():
        nonlocal in_blockquote
        if in_blockquote:
            html_lines.append('</blockquote>')
            in_blockquote = False

    def add_list_item(list_type: str, indent: int, text: str):
        """按缩进层级写入列表项，支持嵌套"""
        if not list_stack or indent > list_stack[-1][1]:
            html_lines.append(f'<{list_type}>')
            list_stack.append((list_type, indent))
            open_li.append(False)
        else:
            while list_stack and list_stack[-1][1] > indent:
                close_one_list()
            if list_stack and list_stack[-1][1] == indent and list_stack[-1][0] != list_type:
                close_one_list()
                html_lines.append(f'<{list_type}>')
                list_stack.append((list_type, indent))
                open_li.append(False)
        if open_li and open_li[-1]:
            html_lines.append('</li>')
        html_lines.append(f'<li>{text}')
        open_li[-1] = True

    def inline_format(text: str) -> str:
        """处理行内格式"""
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', text)
        text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
        # 图片必须在链接之前——否则 ![alt](url) 会被链接规则吃掉
        text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',
                      r'<img src="\2" alt="\1" loading="lazy">', text)
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
        text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)
        return text

    def split_table_row(row: str) -> list:
        row = row.strip()
        if row.startswith('|'):
            row = row[1:]
        if row.endswith('|'):
            row = row[:-1]
        return [c.strip() for c in row.split('|')]

    def parse_alignment(sep_row: str) -> list:
        aligns = []
        for cell in split_table_row(sep_row):
            c = cell.replace(' ', '')
            if c.startswith(':') and c.endswith(':'):
                aligns.append('center')
            elif c.startswith(':'):
                aligns.append('left')
            elif c.endswith(':'):
                aligns.append('right')
            else:
                aligns.append(None)
        return aligns

    def is_separator_row(row: str) -> bool:
        cells = split_table_row(row)
        if not cells:
            return False
        return all(re.fullmatch(r':?-+:?', c.replace(' ', '')) for c in cells)

    def emit_table(block: list):
        aligns = parse_alignment(block[1])

        def align_attr(idx: int) -> str:
            if idx < len(aligns) and aligns[idx]:
                return f' style="text-align:{aligns[idx]}"'
            return ''

        out = ['<table>', '<thead>', '<tr>']
        for ci, cell in enumerate(split_table_row(block[0])):
            out.append(f'<th{align_attr(ci)}>{inline_format(cell)}</th>')
        out.append('</tr>')
        out.append('</thead>')
        out.append('<tbody>')
        for data_row in block[2:]:
            out.append('<tr>')
            for ci, cell in enumerate(split_table_row(data_row)):
                out.append(f'<td{align_attr(ci)}>{inline_format(cell)}</td>')
            out.append('</tr>')
        out.append('</tbody>')
        out.append('</table>')
        html_lines.extend(out)

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 代码块
        if stripped.startswith('```'):
            if in_code_block:
                if code_lang.lower() == 'svg':
                    svg_content = '\n'.join(code_block_lines).strip()
                    html_lines.append(f'<figure class="article-svg">{svg_content}</figure>')
                else:
                    code_html = '\n'.join(code_block_lines)
                    code_html = code_html.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    if code_lang:
                        html_lines.append(
                            f'<pre class="code-block"><code class="language-{code_lang}">'
                            f'{code_html}</code></pre>')
                    else:
                        html_lines.append(
                            f'<pre class="code-block"><code>{code_html}</code></pre>')
                code_block_lines = []
                code_lang = ''
                in_code_block = False
            else:
                flush_list()
                flush_blockquote()
                code_lang = stripped[3:].strip()
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue

        # 空行
        if not stripped:
            flush_list()
            flush_blockquote()
            i += 1
            continue

        # 水平线
        if stripped in ('---', '***', '___'):
            flush_list()
            flush_blockquote()
            html_lines.append('<hr>')
            i += 1
            continue

        # 管道表格：连续 | 行 + 第二行分隔行
        if stripped.startswith('|') and '|' in stripped[1:]:
            block = []
            j = i
            while j < len(lines) and lines[j].strip().startswith('|'):
                block.append(lines[j].strip())
                j += 1
            if len(block) >= 2 and is_separator_row(block[1]):
                flush_list()
                flush_blockquote()
                emit_table(block)
            else:
                flush_list()
                flush_blockquote()
                for row in block:
                    html_lines.append(f'<p>{inline_format(row)}</p>')
            i = j
            continue

        # 标题
        heading_match = re.match(r'^(#{1,4})\s+(.+)$', stripped)
        if heading_match:
            flush_list()
            flush_blockquote()
            level = len(heading_match.group(1))
            text = inline_format(heading_match.group(2))
            html_lines.append(f'<h{level} id="{_heading_id(text)}">{text}</h{level}>')
            i += 1
            continue

        # 引用块
        if stripped.startswith('> '):
            if not in_blockquote:
                flush_list()
                html_lines.append('<blockquote>')
                in_blockquote = True
            bq_text = inline_format(stripped[2:])
            html_lines.append(f'<p>{bq_text}</p>')
            i += 1
            continue
        elif in_blockquote:
            flush_blockquote()

        # 无序列表（含缩进嵌套）
        ul_match = re.match(r'^(\s*)[-*+]\s+(.+)$', line)
        if ul_match:
            indent = len(ul_match.group(1))
            text = inline_format(ul_match.group(2).strip())
            add_list_item('ul', indent, text)
            i += 1
            continue

        # 有序列表（含缩进嵌套）
        ol_match = re.match(r'^(\s*)\d+[.)]\s+(.+)$', line)
        if ol_match:
            indent = len(ol_match.group(1))
            text = inline_format(ol_match.group(2).strip())
            add_list_item('ol', indent, text)
            i += 1
            continue

        # 普通段落
        if list_stack or in_blockquote:
            flush_list()
            flush_blockquote()
        text = inline_format(stripped)
        html_lines.append(f'<p>{text}</p>')
        i += 1

    # 清理未闭合的块
    flush_list()
    flush_blockquote()

    return '\n'.join(html_lines)


def _heading_id(text: str) -> str:
    """从标题文本生成 HTML id"""
    # 去掉 HTML 标签
    clean = re.sub(r'<[^>]+>', '', text)
    # 保留中文和字母数字，其余替换
    clean = re.sub(r'[^\w一-鿿-]', '', clean)
    return clean or 'section'

