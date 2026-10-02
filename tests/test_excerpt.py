"""extract_excerpt 回归测试

背景（2026-10-02 GEO 盘点）：旧实现用 re.findall(r'[一-鿿]', ...) 只保留汉字，
导致 meta description / JSON-LD description / atom summary / llms.txt 四个出口
丢失全部数字、英文字母和标点（208/209 篇受影响）。
本测试锁定修复后的行为：数字、英文字母、中文标点必须保留。
"""

import unittest

from scripts.utils import extract_excerpt


class ExcerptAnchorTests(unittest.TestCase):
    """关键锚点必须保留（对应真实文章中出现过且曾被剥掉的形态）"""

    def test_keeps_arabic_digits_and_percent(self):
        md = "调查显示99%的法律人在工作中使用AI工具，这一数字还在上升。"
        excerpt = extract_excerpt(md)
        self.assertIn("99%", excerpt)
        self.assertIn("AI", excerpt)

    def test_keeps_dates_and_document_numbers(self):
        md = "2026年7月1日起施行《超龄劳动者基本权益保障暂行规定》（人社部令第9号）。"
        excerpt = extract_excerpt(md)
        self.assertIn("2026年7月1日", excerpt)
        self.assertIn("第9号", excerpt)

    def test_keeps_counts(self):
        md = "样本覆盖500件判决，其中82%的罪名只有两个，量刑建议法院照单全收。"
        excerpt = extract_excerpt(md)
        self.assertIn("500件", excerpt)
        self.assertIn("82%", excerpt)

    def test_keeps_cjk_punctuation(self):
        md = "先说结论：这不是统计误差，而是口径问题。原因有三。"
        excerpt = extract_excerpt(md)
        self.assertIn("：", excerpt)
        self.assertIn("，", excerpt)
        self.assertIn("。", excerpt)

    def test_keeps_decimals(self):
        md = "十倍产出只换来1.2倍回报，这是分配体系的问题。"
        excerpt = extract_excerpt(md)
        self.assertIn("1.2", excerpt)

    def test_keeps_latin_words(self):
        md = "从Prompt到Harness，工具的形态在变，控制的逻辑没变。"
        excerpt = extract_excerpt(md)
        self.assertIn("Prompt", excerpt)
        self.assertIn("Harness", excerpt)


class ExcerptSafetyTests(unittest.TestCase):
    """URL 与 Markdown 语法不得漏进摘要"""

    def test_link_keeps_anchor_text_drops_url(self):
        md = "依据[民法典](https://www.pkulaw.com/civil-code)第153条的规定。"
        excerpt = extract_excerpt(md)
        self.assertIn("民法典", excerpt)
        self.assertIn("153", excerpt)
        self.assertNotIn("https", excerpt)
        self.assertNotIn("pkulaw", excerpt)

    def test_image_alt_and_url_dropped(self):
        md = "![封面](cover.png)\n\n正文从2026年说起。"
        excerpt = extract_excerpt(md)
        self.assertIn("2026年", excerpt)
        self.assertNotIn("cover.png", excerpt)

    def test_markdown_syntax_stripped(self):
        md = "# 标题\n\n**加粗**与*斜体*，还有`代码`。"
        excerpt = extract_excerpt(md)
        self.assertNotIn("#", excerpt)
        self.assertNotIn("**", excerpt)
        self.assertNotIn("`", excerpt)
        self.assertIn("加粗", excerpt)

    def test_cover_line_excluded(self):
        md = "![封面](cover.png)\n\n封面配图说明文字。\n\n真正的正文从这里开始，含2026年。"
        excerpt = extract_excerpt(md)
        self.assertNotIn("封面", excerpt)
        self.assertIn("2026年", excerpt)


class ExcerptTruncationTests(unittest.TestCase):
    """截断行为：不超长直接返回；超长优先在句末标点收尾"""

    def test_short_text_returned_whole(self):
        md = "短文本，含数字2026。"
        self.assertEqual(extract_excerpt(md), "短文本，含数字2026。")

    def test_truncation_ends_at_sentence_boundary(self):
        sentences = "".join(
            f"第{i}句这是用来填充摘要长度的内容。"
            for i in range(1, 40)
        )
        excerpt = extract_excerpt(sentences, max_chars=100)
        self.assertLessEqual(len(excerpt), 100)
        self.assertTrue(excerpt.endswith(("。", "！", "？", "；")),
                        f"截断未落在句末标点：…{excerpt[-12:]}")

    def test_truncation_fallback_hard_cut(self):
        # 无任何句末标点的超长文本：允许硬切
        md = "啊" * 300
        excerpt = extract_excerpt(md, max_chars=100)
        self.assertEqual(len(excerpt), 100)

    def test_empty_input(self):
        self.assertEqual(extract_excerpt(""), "")
        self.assertEqual(extract_excerpt(None), "")


if __name__ == "__main__":
    unittest.main()
