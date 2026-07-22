import os
import tempfile
import unittest

from scripts.utils import extract_title_and_body, md_to_html


class CoverDedupTests(unittest.TestCase):
    def test_extract_removes_all_consecutive_leading_covers(self):
        markdown = """# 测试文章

![封面](cover.png)

![封面](cover.png)

![封面](cover.png)

正文第一段。
"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", encoding="utf-8", delete=False
        ) as temp_file:
            temp_file.write(markdown)
            temp_path = temp_file.name

        try:
            article = extract_title_and_body(temp_path)
        finally:
            os.unlink(temp_path)

        self.assertTrue(article["has_cover"])
        self.assertEqual(article["cover_alt"], "封面")
        self.assertEqual(article["body_md"], "正文第一段。")

    def test_html_removes_all_consecutive_leading_covers(self):
        markdown = """![封面](cover.png)

![封面](cover.png)

![封面](cover.png)

正文第一段。
"""

        html = md_to_html(markdown)

        self.assertNotIn('src="cover.png"', html)
        self.assertIn("正文第一段。", html)

    def test_html_keeps_cover_named_image_after_body_text(self):
        markdown = """正文第一段。

![正文配图](cover-detail.png)
"""

        html = md_to_html(markdown)

        self.assertIn('src="cover-detail.png"', html)

    def test_html_removes_standard_cover_after_intro_text(self):
        markdown = """>文章摘要。

![封面](cover.png)

正文第一段。
"""

        html = md_to_html(markdown)

        self.assertNotIn('src="cover.png"', html)
        self.assertIn("文章摘要。", html)
        self.assertIn("正文第一段。", html)


if __name__ == "__main__":
    unittest.main()
