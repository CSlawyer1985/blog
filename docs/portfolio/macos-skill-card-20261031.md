# macOS 桌面网页 Skill 首页作品卡片验收 · 2026-10-31

结论：本次局部修改通过本地验收；未提交、未推送、未发布（仅在用户明确要求时发布）。按用户要求在作品栏目新增开源项目卡片，配图与交互沿用既有卡片体系。

## 内容与变更

- 核实来源：[macos-desktop-web-skill 仓库](https://github.com/CSlawyer1985/macos-desktop-web-skill)（2026-10-31 经网页抓取核实）。正式名 macOS Desktop Web Skill，开源的 macOS 仿真桌面网页设计 Skill（原生窗口、Dock、菜单与内容应用），实站案例为本站 `/desktop`。卡片链接按用户指定指向 GitHub 仓库。
- 首页与首次生成回退模板同步新增第 12 张作品卡片；总数 01—12，关于页 `#open-source-projects` 同步条目（共 14 条）。第 12 张自然进入第四行，未拉宽末行。
- 8 秒 SVG/CSS 功能叙事：网页页签飞出托付 → 菜单栏与三扇窗口级联打开 → Dock 升起、应用块依次就位（朱红块收尾）→ 字幕「把网站，开成一张桌面」→ 原位淡出复位。复用现有 IntersectionObserver 可见性管理器，无新增 JS、依赖或全局监听器。
- CSS 增加专属 `dsk-*` 类与关键帧并提升缓存版本（`?v=20261031-desktop`）；修改 `index.html`、`templates/home.html`、`about.html`、`css/portfolio.css`、`tests/homepage-static.cjs`、`docs/portfolio/prompts.md`。
- 桌面版 `/desktop` 经运行时核实自动读取 12 个作品（适配器读取 `a.project-link`，无需改动）。

## 配图说明（占位稿，非正式图）

- **本会话宿主无内置 imagegen**，按 inkpeg 先例以 PIL 程序绘制同族占位稿：折页网页立牌（朱红页签）→ 石墨导轨 → 炭面微缩桌面屏。生成脚本 `scratch/desktop-skill-placeholder-20261031.py`；原始图 `sources/desktop-skill.png`，网页资产 `assets/portfolio/desktop-skill.webp`（1200×800，约 6KB）。
- 底图与 600×400 SVG 动效层按 2 倍坐标对齐（屏面 472–798 × 232–514），后续用 imagegen 按已记录的完整正式提示词（`prompts.md` §desktop-skill）生成后原路径替换，无需改动静效层。正式提示词已写明与 DSH 卡片的区分（交接关系、空屏、无键盘/主机）。
- 占位稿为 inkpeg 同级扁平风格，非 imagegen 实拍质感；与正式图混排的观感差异由用户确认是否接受，或待 imagegen 可用时替换。

## 验证

- `node tests/homepage-static.cjs`：通过。12 张作品、6 个渠道、14 条关于页条目、原仓库保留（含 macos-desktop-web-skill）、资源路径、锚点、SEO JSON。
- 浏览器实测（本地 http.server :8341 + agent-browser/Chromium，沙箱外执行，依据 `local-gpu-browser-env.md`）：24 项通过，0 项失败，2 项已知误报排除。
  - 布局 1440/1024/768/375px 分别 3/3/2/1 列，无横向溢出；图片实际加载 1200×800；标题与用途中英文均自然换行（`dsk-1440/1024/768/375.png` 于 `output/playwright/`）。
  - 动效实测推进（11 条 running 动画时钟递增）、5.9 秒相位各层可见、第 0 秒复位帧全部隐藏、离屏暂停、reduced-motion 隐藏动效层且停播。
  - hover 图像与 SVG 同比例缩放对齐，操作提示与角标出现，标题转朱红；键盘聚焦可见，Enter 实际打开 GitHub 仓库新标签。
  - 英文模式 375/1440px 无溢出；关于页新条目存在且不溢出。
- 两处误报均为已知项：悬停箭头 2px 位移计入 scrollWidth（ADG 验收同类），指针移开后 380/380 相等；自动化切换标签后 `document.hidden=false`，隐藏标签暂停维持未实测（与 ADG 相同限制，未改播放管理器）。

## 视觉复核

| 检查域 | 本次结果 |
|---|---|
| 风格 | 通过：暖纸、石墨、朱红；与原卡片并排同一套 |
| 排版 | 通过：复用字体与字号；中英文自然换行无截断 |
| 色彩 | 通过：同族配色；字幕/标签浅底深字 |
| 间距 | 通过：三列网格，第 12 项自然进入末行 |
| 动效 | 通过：功能叙事（托付→级联→就绪）；仅 transform/opacity |
| 组件 | 通过：整卡语义化外链，3:2、懒加载、有尺寸与替代文字 |
| 交互 | 通过：hover、active、visited、键盘焦点沿用现有样式 |
| 代码 | 通过：专属 dsk 类与关键帧，无新增 JS/依赖 |
| 可访问性与适配 | 本次范围通过：键盘与减少动效已实测，不声称全站 WCAG 认证 |
| 整体 | 可交付（占位底图待替换为 imagegen 正式图） |

[桌面最终效果](screenshots/macos-skill-card-20261031.png)（受控暂停于 5.9 秒叙事相位捕获，验证后已恢复播放） · [手机效果](screenshots/macos-skill-mobile-20261031.png)

## 备份与回退

修改前已逐文件备份并经 SHA-256 校验：`scratch/macos-skill-card-20261031-095648/backup/`（含 `SHA256SUMS.txt`）。按原相对路径恢复六个文件即可回退源码与提示词；新增图片与截图如需清理，按用户规则移入废纸篓，不永久删除。会话前未提交改动（docs/、output/ 等未跟踪文件）未触碰。

## 边界声明

- 未执行 `build.py` 全站生成（局部修改规则）；sitemap/atom/llms.txt 不受本卡片影响。
- 静图无法表达"网页开成桌面"的因果次序，动效为概念叙事，不代表真实产品运行检测。
- 占位底图与 inkpeg 卡片同属"待 imagegen 替换"状态；正式提示词与替换路径已记录于 `prompts.md`。
