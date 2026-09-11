# 网站域名与部署架构

## 首页作品卡片规范（按任务必读）

新增、修改首页作品卡片，或调整其配图、动效、布局和平台入口前，必须完整读取项目根 `PORTFOLIO_DESIGN.md`，再读取其中指定的正式首页、CSS/JS 与 `docs/portfolio/prompts.md`。该文件是用户已认可的卡片设计与扩展约束的唯一内容源，适用于所有参与本项目的模型；不得因换模型而另起风格。

2026-09-11 用户确认后已迁入 `index.html`，资源位于 `css/portfolio.css`、`js/portfolio.js`、`assets/portfolio/`。保留纸质微缩模型、暖纸/墨/朱红配色、桌面三列和按真实功能编排的默认播放动效。Hero 约束见 `docs/hero-portrait.md`；首次生成回退模板 `templates/home.html` 与首页同步。未经用户要求，不提交、推送或部署。

## 本项目定位

- 站点：陈石个人博客「陈石 · 法与 AI」
- 正式域名：`https://chenshi.ai/`
- `www` 别名：`https://www.chenshi.ai/`
- GitHub 仓库：`CSlawyer1985/blog`
- Cloudflare Pages 项目：`blog`
- 生产发布：推送 `main` 分支后，由 Cloudflare Pages 自动构建和部署

`chenshi.ai` 是本项目唯一 canonical 域名。页面 canonical、Open Graph、JSON-LD、RSS、sitemap 及站内绝对链接均应使用该域名。不要把 `legalagi.cn`、GitHub Pages 地址或 `*.pages.dev` 写成本博客 canonical。

## 整体网站体系

| 正式入口 | 用途 | GitHub 仓库 | Cloudflare Pages 项目 |
|---|---|---|---|
| `https://chenshi.ai/` | 陈石个人博客 | `CSlawyer1985/blog` | `blog` |
| `https://legalagi.cn/` | 四明山法师 AI 夜校 | `CSlawyer1985/xinchun-ai-prework` | `xinchun-ai-prework` |
| `https://learn-agent.legalagi.cn/` | Agent 结构学习页 | `CSlawyer1985/agent-structure-dashboard` | `agent-structure-dashboard` |
| `https://claude.legalagi.cn/` | Claude for Legal 中国法适配 | `CSlawyer1985/claude-for-legal-ZH` | `claude-for-legal-zh` |
| `https://wiki.legalagi.cn/` | 法律概念 Wiki | `CSlawyer1985/legalwiki` | `legalwiki` |

`course.legalagi.cn` 已停用并从 Cloudflare Pages 与 DNS 中移除。不得恢复或写入新的页面、导航、文章、模板及 SEO 数据；夜校入口统一使用 `https://legalagi.cn/`。

## 修改约束

1. 博客中的“AI 夜校”链接统一指向 `https://legalagi.cn/`。
2. 其他工具按上表使用对应 `legalagi.cn` 子域名。
3. 不要恢复 `cslawyer1985.github.io` 或 `*.pages.dev` 作为生产入口。
4. 不要关闭或删除 GitHub 仓库及原 GitHub Pages；它们保留为代码仓库和回退入口。
5. 修改域名后必须同步检查 `config.py`、`data/site.json`、模板、生成页面、`atom.xml`、`sitemap.xml` 和结构化数据。
6. 发布前确认旧域名引用已清理；推送到 GitHub `main` 后无需手动上传，Cloudflare Pages 会自动部署。
