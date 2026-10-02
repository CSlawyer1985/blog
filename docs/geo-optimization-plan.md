# chenshi.ai GEO 优化计划

> 依据：2026-10-02 全站盘点（sitemap 全部 217 个 URL 机器检测 + 关键页人工复核），全部问题已定位到源码具体位置。盘点数据归档于 `docs/geo-audit-2026-10-02-matrix.tsv`。
> 部署：Cloudflare Pages，推送 `main` 自动构建发布。
> 背景：geo.new 当日对 `/about` 单页测得 63/100；全站盘点显示文章页技术底座远好于该分数，但存在一个影响全部 209 篇文章的构建管线 bug。

## 执行状态（2026-10-02）

- **批次一、二、三已部署并线上验证**。geo.new 复测 `/about`：63 → 71。
- 批次三按 geo.new 复测要求将 HSTS 一步提到 `max-age=31536000`（未含 includeSubDomains）。
- geo.new 复测新增项处理：about 页 answer-first 开头、日期信号、面包屑、skip link、署名、meta 长度、封面尺寸已修；**待用户输入**：sameAs 补充主页清单、是否公开联系邮箱、是否起草隐私页。
- 明确不修（附理由）：Moz DA（内容营销长期项）、DOM 规模（作品集设计代价大于收益）、链接密度（卡片结构即链接，重构损害交互）、疑问式标题（两个 h3 是书名/项目名，不可改写）。
- 内容侧遗留：分水岭一文 `../input/image.png` 引用 404，需在写作区把图移入 `output/` 并改相对引用。

---

## 批次一：管线级修复（预估半天，全站受益）

### 1.1 修复 extract_excerpt 字符过滤 bug ⭐ 全计划最高优先级

**现象**：208/209 篇文章的描述文本丢失全部阿拉伯数字、英文字母和标点。同一份损坏数据污染四个出口：

| 出口 | 位置 |
|---|---|
| meta description | `generate_seo.py:294` |
| JSON-LD `description` | `generate_seo.py:145` |
| atom.xml `summary` | `generate_seo.py:424` |
| llms.txt 摘要 | `generate_seo.py:469-470` |

典型损坏：「7月1日起」→「月日起」、「99%的法律人都在用AI」→ 描述里没有"99%"和"AI"、"500件上诉" →「件上诉」。AI 引擎的引用决策高度依赖这些摘要，语义残缺直接压低全站可引用性。

**根因**：`scripts/utils.py:209` `extract_excerpt()`：

```python
chars = re.findall(r'[一-鿿]', clean)   # 只保留汉字，数字/字母/标点全丢
excerpt = ''.join(chars[:max_chars])
```

**修法要点**：

```python
# 先把 Markdown 链接替换为纯锚文本，避免放宽字符集后 URL 漏进摘要
clean = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', md_text)
# …既有去语法、去空白、去封面逻辑…
# 保留 CJK + 数字 + 拉丁字母 + 中文标点 + 常用符号
chars = re.findall(r'[一-鿿0-9A-Za-z，。：；、！？“”‘’（）《》〈〉—…·%‰]', clean)
excerpt = ''.join(chars)[:max_chars]
# 建议追加：在 。！？； 处收尾截断，避免句子断在半截
```

**回归测试**（新增 `tests/test_excerpt.py`，对齐现有 tests/ 惯例）：

- 锚点断言：含「7月1日」「99%」「AI」「500」的真实段落，excerpt 必须保留这些字符串。
- 全量断言：209 篇重建后，meta description 含中文标点的比例 ≥95%；原文字含数字的文章描述必须含数字。
- 体积确认：excerpt 变长后重跑 `generate_seo.py`，确认 atom.xml 单条体积与 llms-full.txt 的 max_bytes 降级逻辑不受影响（`generate_seo.py:479`）。

### 1.2 关闭软 404

**现象**：任意不存在的 URL（含 `/articles/xxx.html` 变体）返回 200 + 首页外壳（canonical 指首页）。canonical 写对了所以无重复内容惩罚，但浪费抓取预算、掩盖真实 404 信号。

**根因**：Cloudflare Pages 在产物含根 `index.html` 且无 `404.html` 时自动启用 SPA 兜底。

**修法**：构建新增 `404.html`（用现有页面模板渲染极简 404：返回首页链接 + `<meta name="robots" content="noindex">`）。`404.html` 一旦存在，SPA 兜底自动失效。

**验证**：`curl -sI https://chenshi.ai/not-exist-xyz/` 返回 404；既有规范 URL 仍 200；trailing-slash 308 行为不变。

### 1.3 规范 URL 统一（三处同源修正）

`/about.html` 308 跳转到 `/about`，但三处引用都指向跳转 URL：

| 位置 | 现状 | 改为 |
|---|---|---|
| `generate_seo.py:92` Person.url | `/about.html` | `/about` |
| `generate_seo.py:366` sitemap 条目 | `/about.html` | `/about` |
| `generate_seo.py:457` llms.txt 关于陈石链接 | `/about.html` | `/about` |

这也是 geo.new 报告 ACC-19（URL 不在 sitemap）的根源。改后全站 grep 构建产物，`about.html` 只应出现在 CF 的 pretty-URL 自动跳转行为里，不应出现在任何我们生成的链接和 schema 中。

---

## 批次二：模板级修复（预估 1–2 小时）

### 2.1 /about 页补 head 套件

geo.new 63 分的全部技术来源。`generate_seo.py` 里 `og_tags()`（:262）和 `_person_entity()`（:75）都是现成的，生成 about 页时注入即可：

- canonical：`https://chenshi.ai/about`
- og:title / og:description / og:image（用 portrait.png 或 book-cover.png）
- Person JSON-LD（与文章页同源数据）
- 补 `<link rel="icon">`（与 2.2 同步）

### 2.2 favicon 声明

`/favicon.ico` 文件存在（200），但 217 页没有任何 `<link rel="icon">` 声明。公共 head 加一行；有余力再做 180px apple-touch-icon。

### 2.3 作者简介块打通实体链接

文章尾部作者简介（209 篇）中的「陈石」加 `<a href="/about" rel="author">`，打通署名 → 实体页的机器可读链路（geo.new EAT-03/04）。

### 2.4 侧栏盒子 h4 → h3

`templates/article.html` 与 `templates/partials/sidebar.html` 中 `toc-title` / `sidebar-title` / `related-title` 的 h4 降为 h3，消除 209/209 篇的 h2→h4 层级跳跃（geo.new CONT-05）。纯模板改动，正文结构不动。

### 2.5 修 3 篇正文 h1 多于 1

「为什么 AI 喜欢 HTML 和 JSON」（3 个 h1）、「为什么 AI 不喜欢 docx」（2）、「AI 应用的真正分水岭」（2）。在 markdown 源头把正文内 h1 降为 h2。

### 2.6 og:image / ImageObject 补尺寸

JSON-LD ImageObject 与 og:image 声明处补 `width` / `height`（按 cover 实际尺寸），提升各平台预览稳定性（geo.new IMG-04 同源问题在文章侧的预防）。

---

## 批次三：托管与安全（预估半小时，CF 控制台 + `_headers`）

### 3.1 HSTS 分阶段上线

- 第一步 `_headers` 加 `Strict-Transport-Security: max-age=300`，观察 1–2 天；
- 无异常后改 `max-age=31536000`；
- `includeSubDomains` 加之前确认 chenshi.ai 全部子域均 https（`course.legalagi.cn` 已停用注销，与本项目无关，按 AGENTS.md 约定不得恢复）。

### 3.2 补安全头

`_headers` 统一注入（版本库管理）：

- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CSP 从 `Content-Security-Policy-Report-Only` 起步，观察上报后再转正式。站点无第三方 JS 依赖，预计收紧风险低。

### 3.3 about 页图片属性（geo.new IMG-04/05）

book-cover.png 补 width/height 属性；首屏外图片 lazy-load。

---

## 批次四：内容与实体（长期，增量执行，不阻塞上线）

### 4.1 新文章 answer-first

写作模板加一条约定：正文第一段结论前置（AI 引用最友好的开头形态）；系列文开头用一句话交代系列背景。存量 209 篇不回头改。

### 4.2 sameAs 扩充

Person.sameAs 现只有 GitHub + legalagi.cn 两项。确认实名主页清单（知乎 / 公众号 / 视频号等）后加进 `_person_entity()`。

### 4.3 ContactPoint（可选）

愿意公开邮箱的话：页脚 mailto + Person.email（geo.new ENT-05/EAT-09）。

### 4.4 外部引用积累（Moz DA）

「宁波建工判决数据分析」系列（500 份判决、129 份判决、笔迹鉴定 104 件）是天然被引素材，投稿、行业引用长期积累。技术修复对此无效，不设时限。

### 4.5 季度监测

每季度重跑一次全站矩阵检测（本次盘点同款脚本逻辑）+ geo.new 重测 `/about` 和 2 篇代表作。剩余不可本地测项：Moz DA、各 AI 平台真实引用率。

---

## 执行顺序与预期收益

| 批次 | 工作量 | 修完的变化 |
|---|---|---|
| 一 | 半天 | 描述四出口恢复语义；软 404 消失；URL 信号一致——AI 引用质量的最大单项提升 |
| 二 | 1–2 小时 | `/about` 重测预期 63 → 85+；实体链路闭环 |
| 三 | 半小时 | 安全头齐全，Trust 信号补齐 |
| 四 | 持续 | 引用率与 DA 长期项 |

全站估算：78–82 → 88–92（自有口径，非 geo.new 实测）。

## 开工前置确认

1. 批次一动代码——确认后执行（按惯例先备份/走分支，改完本地构建验证再推）。
2. sameAs 候选主页清单。
3. 是否公开联系邮箱。
4. CSP 转正式前需确认无内嵌第三方资源遗漏。
