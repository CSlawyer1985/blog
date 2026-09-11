# 首页作品卡片设计规范

版本：portfolio-cards/v1.1 · 2026-09-11

状态：用户已认可配色、生图风格与动效方法，并明确授权迁入正式首页及推送发布。

## 1. 适用范围与唯一参考

任何模型或人工在本博客新增、替换、改造首页作品卡片之前，必须完整读取本文件，并查看现有卡片的实际渲染。此规则是对工作区默认设计规则的项目级具体化，不更改宿主权限或发布授权。

- 当前结构：`index.html` 的 `#project-gallery`；首次构建回退模板 `templates/home.html` 同步维护。
- 当前样式与动效：`css/portfolio.css`、`js/portfolio.js`。
- 已采用的生图提示词：`docs/portfolio/prompts.md`。
- 原始生图：`docs/portfolio/sources/`；网页资产：`assets/portfolio/`。
- 发布验证与截图：`docs/homepage-release.md`、`docs/portfolio/screenshots/`。
- 旧版 GIF 仅为第一版历史实验，不是当前动效的规范样本。

**新增作品必须扩展现有设计系统，不得每次重新设计整套卡片。** 不因更换模型或图像工具而改变纸质模型风格、配色、构图、三列布局或播放逻辑。本节生产路径是后续唯一基准；本地previews只是历史实验，不再作为功能维护入口。

## 2. 信息架构与交互约束

- 全媒体工作站只承载平台主页、文章列表及联系渠道；实际作品集中到 Build 比例尺下方、取得联系上方。
- 首屏“查看作品”链接到 `#project-gallery`。
- 桌面 ≥1024px 三列；640–1023px 两列；<640px 单列。第七张、将来的第十张等自然进入下一行，不擅自拉宽填满末行。
- 图片在上，编号、名称、一句真实用途在下。整张卡片是一个语义化外链，图片与标题指向同一入口。
- 图片固定 3:2；名称自然换行，禁止以省略号遮盖项目名称或关键用途。不新增多余分类按钮、统计数字或虚构状态。
- 外链用 `target="_blank" rel="noopener noreferrer"`；键盘焦点、hover 与 active 状态延续既有样式。
- 社交渠道优先直达本人主页/文章列表，不把复制名称作为最终交互。无法确认真实入口时请求用户提供分享链接；不得猜测用户 ID、用平台首页或搜索页冒充本人主页。

### 已核实的平台直达入口（2026-09-11）

- 公众号「法律AGI之路」：`https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzA4ODUyMjczMw==&action=getalbum&album_id=4515751721251586051#wechat_redirect`。这是 AI Builder 文章合集，不是全部历史消息。已在普通浏览器实际打开列表。账号标识与合集链接来自用户提供的文章 `https://mp.weixin.qq.com/s/uw-0IuHXZAexKAZbshd4Ig`。
- 公众号完整主页：`https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA4ODUyMjczMw==#wechat_redirect`。本次普通浏览器提示必须在微信客户端打开，因此样页优先使用上方合集。
- 小红书「法律 AGI 之路」：`https://www.xiaohongshu.com/user/profile/60f2c47d0000000001006147`。从用户提供的笔记作者链接识别，去掉分享参数后再次核实主页名称。不要把笔记ID当成用户ID，不保留分享校验参数。
- 知乎：`https://www.zhihu.com/people/chen-shi-43`，用户直接提供。

## 3. 视觉不可变量

| 项目 | 约束 |
|---|---|
| 底色 | 暖羊皮纸 #e9dfcf；动态小面板 #f5edde |
| 材质 | 象牙色未涂布纸、折纸/精细建筑模型、石墨金属、真实接触阴影 |
| 强调色 | 朱红 #b63c2f；小面积有功能意义的重点 |
| 视角 | 近正交 3/4 微缩静物视角，物体落在浅象牙色展台上 |
| 光照 | 左上方柔和日光，清晰但克制的环境遮蔽与接触阴影 |
| 气质 | 安静、精密、可触摸的编辑式静物；与博客现有纸/墨/朱红呼应 |
| 字体 | 复用项目已有 CJK 字体栈、衬线标题与等宽微型编号；不增加外链字体 |
| 禁止 | 紫色/蓝色科技渐变、玻璃态、霓虹、通用机器人、随机星球/星轨、emoji 主视觉、无意义漂浮粒子 |

项目主体必须来自真实用途，而不是只有名字联想。不得为了“AI 感”给所有作品画同一个球体、电脑或机械臂。必要时可沿用现有抽象主体，但必须用清楚的动态功能表达补足含义，例如 MemoBall 的球体配“输入—确认—日历”。

## 4. 生图合同

使用宿主当前可用的文生图工具；参考现有至少两张实际图片，沿用 `prompts.md` 的完整母提示词，只替换项目主体描述。若工具支持参考图，可使用已有配图约束材质和视角；不可把某个工具名当作风格保证。

每个新项目先明确：

1. 已核实的名称、网址、目标用户、一句话用途。
2. 最能说明用途的一个主体、最多两个辅助物。
3. 主体中适合承载动画的位置（黑板、文档、节点、槽位、屏幕、日历等）。
4. 3:2 图片中可保留的字幕/交互空间。

母提示词（不得随意改写核心风格）：

> Use case: stylized-concept. Create a premium editorial illustration for a Chinese lawyer and AI builder's portfolio. Landscape 3:2. A precise architectural maquette photographed on a warm parchment seamless studio background (#e9dfcf), ivory paper, graphite metal, one vermilion red (#b63c2f) detail. Analog craftsmanship, tactile uncoated paper, sophisticated miniature still life, refined realistic materials, soft directional daylight from upper left and crisp ambient occlusion, muted warm palette, no purple, no blue gradients, no cute cartoon. Orthographic 3/4 view, subject centered in middle 65% with generous clear edges. NO TEXT, NO letters, NO numbers, NO logos, NO watermark. All structures stand grounded on a shallow rectangular ivory plinth.

在母提示词后补充 `Subject: [真实功能] ... [主体、辅助物、动态承载面]`。不要把 CSS 网格、HTML 字号、动画关键帧混入生图提示词。真实 Logo 或正式产品截图不得由模型伪造。

交付原始 PNG 和 1200×800 WebP（质量约84，按实际画质调整）。逐张查看，核对主题是否正确、是否混入文字/Logo、构图与已有图是否一致。不要只检查尺寸。原始图不覆盖；重做时保留版本。把完整实际提示词追加到 `prompts.md`，标明用途与日期。

## 5. 动效合同：功能叙事，不是通用缩放

底图由模型生成；动态层用原生 SVG + CSS + 少量 JS 叠加。当前不是文生视频，也不是真实产品录屏。不要把简单缩放/摇晃当作完整卡片动效，亦不需要默认改用 GIF。

每张卡片是一段约8秒的无声循环：**起点 → 核心动作 → 可理解的结果 → 淡出复位**。新卡片先写3–4个状态，再实现。具体动作应不同，但时间节奏、材料语言、线条色、标签样式保持同族。

### 既有语义配方

| 项目 | 主体与功能叙事 |
|---|---|
| 四明山法师 AI 夜校 | 山中教室；黑板依次书写课程脉络，落到学习/实践/创造 |
| Claude for Legal ZH | 文档审阅工作台；扫描文档、逐项标记、审阅完成 |
| 法律概念 Wiki | 展开的书与知识建筑；节点依次连接，沿关系路径传递 |
| 法律人 Skill 仓库 | 模块工具托盘；选择模块、检索/审阅能力连线、组合复用 |
| MemoBall | 纸质球体；输入安排、日历承接、由人确认、写入事件；不可省略确认步骤 |
| 法律 Agent 解构 | 分层结构；输入、编排、执行及沿层间连接的信号传递 |
| DeepSeek Harness 桌面客户端 | 桌面模型；运行组件、配置、连接依次就绪，本地启动完成；状态为概念动画，不是真实运行检测 |

### 实现参数

- SVG 坐标统一 `viewBox="0 0 600 400"`，与3:2底图准确对齐；装饰层 `aria-hidden="true"`，不截获鼠标。
- 复用 `.project-item`、`.project-link`、`.project-art`、`.art-motion`、`.project-caption`；项目使用独立 slug 与专属动效类。
- 动态元素加 `.loop`；默认8s、`cubic-bezier(.22,.61,.36,1)`、无限循环、`animation-fill-mode:both`，避免延迟阶段意外露出最终状态。
- 可复用 `.draw` + `pathLength="1"` 实现路径绘制，`.pop` / `.scene-caption` 实现出现与复位；专属动作独立命名，不覆盖其他卡片。
- 特殊快速动作限于局部（例如语音条800ms），不能让整张卡片高频闪动。
- 同一屏内所有可见卡片默认播放，无需 hover，无“开启/暂停动效”按钮。IntersectionObserver 可见比例>.15时播放，离屏或浏览器标签页隐藏时暂停。
- 必须尊重系统 `prefers-reduced-motion: reduce`：新增动态层隐藏、动画和 hover 缩放关闭，仍可阅读与访问所有卡片。
- hover：整个图像与 SVG 同比例轻微放大1.025，650ms；访问提示、角标和箭头用180–200ms过渡。不要只移动底图导致动态标注错位。
- 若实际需要GIF/WebM，应从已验收的同一叙事导出，保留静态后备与离屏策略；另行测体积，不把网页默认替换成多个大GIF。

## 6. 新增作品步骤

1. 读本规范、现有 HTML/CSS/JS、完整提示词；查看两张基准图和至少两种动效。
2. 核实名称、入口和功能；缺真实用途/链接则向用户询问，不能猜。
3. 写一段主体描述与四状态动效草案；只调整新项目，不重画所有已认可资产。
4. 生图、人工视觉核对、保存 PNG 与 WebP、记录完整提示词。
5. 复制现有 article 结构，更换 slug、编号、链接、名称、用途、图片及专属 SVG。更新 `01—NN` 总数，不将全媒体频道数误改成作品数。
6. 复用播放管理器，不为每张卡片再加独立轮询/定时器/全局监听器。
7. 验证1440、1024、768、375px布局；点击整卡和首屏锚点；检查中英文换行、键盘焦点、hover、默认播放、离屏暂停、reduced-motion。
8. 同步关于页 `about.html#open-source-projects` 的缺失条目（夜校已单列，不重复；原有仓库保留）。保存最终实渲染截图和检查结论；只在用户明确要求时发布。不得为局部修改直接执行全站生成。

## 7. 验收门槛

- [ ] 新卡片与原卡片并排看仍像同一套作品。
- [ ] 不读标题也能辨认项目类别；看完动效能理解一个真实功能。
- [ ] 第0秒和复位阶段无突兀标签、闪白、错位或残影。
- [ ] 内容优先，动态标签不遮住标题与主要主体；用途不被截断。
- [ ] 链接准确，不包含凭据/会话参数；无假主页、占位“#”或把同名账号当本人。
- [ ] 所有图片加载成功；可见时确实有动画变化，不只检查CSS存在。
- [ ] 无新增第三方依赖、追踪代码或敏感数据上传。
- [ ] 规范/提示词/源码/最终截图同步，不以过时GIF作验收依据。

已知边界：现有原首页第三方视频脚本可能有自身警告，本规范不把局部作品卡片验收等同于全站WCAG或生产合规认证。
