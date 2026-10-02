"""md_to_html 转换器回归测试

背景（2026-10-02 GEO 盘点批次二）：
1. 行内代码中的 <、> 未转义——`<h1>` 会被浏览器解析成真实的 h1 元素，
   破坏标题大纲（3 篇文章 h1 多于 1 的根源之一）；
2. HTML 注释（如首行 <!-- digest: ... -->）被当作正文渲染，
   并干扰首行标题剥离（分水岭一文出现重复 h1 与 "-->" 泄漏）。
"""

import unittest

from scripts.utils import extract_excerpt, md_to_html, strip_html_comments


class InlineCodeEscapeTests(unittest.TestCase):
    def test_inline_code_escapes_angle_brackets(self):
        html = md_to_html("HTML 的 `<h1>` 不需要猜。")
        self.assertIn("<code>&lt;h1&gt;</code>", html)
        self.assertNotIn("<code><h1></code>", html)

    def test_inline_code_escapes_ampersand(self):
        html = md_to_html("用 `a && b` 表示与。")
        self.assertIn("<code>a &amp;&amp; b</code>", html)

    def test_inline_code_shields_markdown_markers(self):
        # 代码内的星号和链接记号不应被行内规则改写
        html = md_to_html("模式 `a**b**c` 与 `[x](y)` 都是字面量。")
        self.assertIn("<code>a**b**c</code>", html)
        self.assertIn("<code>[x](y)</code>", html)
        self.assertNotIn("<a href=\"y\">", html.split("<code>[x](y)</code>")[0].rsplit("<code>", 1)[-1])

    def test_multiple_code_spans_restore_in_order(self):
        html = md_to_html("`<div>` 和 `<span>` 都是标签。")
        self.assertIn("<code>&lt;div&gt;</code>", html)
        self.assertIn("<code>&lt;span&gt;</code>", html)


class HtmlCommentTests(unittest.TestCase):
    def test_strip_html_comments_helper(self):
        md = "<!-- digest: 摘要 -->\n\n# 标题\n\n正文。"
        self.assertNotIn("digest", strip_html_comments(md))
        self.assertIn("# 标题", strip_html_comments(md))

    def test_strip_preserves_comments_in_code_fence(self):
        md = "```html\n<!-- 注释示例 -->\n```"
        self.assertIn("<!-- 注释示例 -->", strip_html_comments(md))

    def test_md_to_html_drops_comment(self):
        html = md_to_html("<!-- digest: 摘要内容 -->\n\n正文段落。")
        self.assertNotIn("digest", html)
        self.assertIn("正文段落", html)

    def test_extract_excerpt_ignores_leading_comment(self):
        md = "<!-- digest: 注释里的摘要 -->\n\n正文第一句，含2026年。"
        excerpt = extract_excerpt(md)
        self.assertNotIn("注释里的摘要", excerpt)
        self.assertIn("2026年", excerpt)


class HeadingIntegrityTests(unittest.TestCase):
    """回归锁定：这些真实文章形态曾产生多余的 h1 元素"""

    def test_inline_h1_tag_is_not_a_heading(self):
        html = md_to_html("没人会手写 `<h1>` 标签写文章。")
        # 页面里唯一的 h1 只能来自模板；正文转换结果中不允许出现裸 <h1>
        self.assertEqual(len(__import__("re").findall(r"<h1[ >]", html)), 0)
        self.assertIn("&lt;h1&gt;", html)


if __name__ == "__main__":
    unittest.main()
