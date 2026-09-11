# Hero 肖像维护约束

2026-09-11 用户确认。正式实现：`index.html#hero`、`css/hero-responsive.css`、`js/hero-portrait.js`。

- 身份介绍：商事律师 × AI Builder；英文 Commercial Lawyer × AI Builder。
- ≥1100px左右两列，共用照片/按钮底线；窄屏顺序为CS、介绍、按钮、肖像、About。手机正文20px，不把整块文字等比缩小。
- 使用原始1472×1068肖像比例，Canvas按图片实际位置与尺寸映射。禁止恢复18px固定偏移。
- 必须基于原版 `js/main.js` 的粒子IIFE，不得以“清晰照片+少量装饰点”的重写效果替代。保持原颜色映射、核心alpha=1、晕边alpha=.08、底图opacity=.42、原入场/轻飘/鼠标扰动节奏。
- 原采样网格step乘以max(1,900/图片宽度)^1.3；粒径、晕边与轻飘幅度乘以图片宽度/900。缩小图片同时减少密度和粒径，不通过改变透明度适配。
- 原左侧0.62倍宽度的Canvas是入场空间，不是肖像偏移。图像采样坐标取采样像素中心。
- `data-portrait-responsive` 使正式首页只初始化新适配脚本；原 `data-portrait` 入口仍保留在共用main.js中，不应同时命中。
- 系统减少动效时隐藏粒子并显示清晰底图。不得新增播放/暂停按钮。

检查：`node tests/hero-original.cjs`保护原渲染器，仅允许已确认的几何缩放差异；`tests/hero-layout.browser.js`和`tests/hero-density.browser.js`是Playwright函数文件，在本地8765静态服务器上检查实际页面。

每次修改后检查宽屏、窄屏、DPR2手机仿真，以及鼠标交互。截图见`docs/portfolio/screenshots/`。生产首页更新时同步`templates/home.html`首次构建回退模板。
