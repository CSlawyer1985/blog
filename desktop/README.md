# Blog 桌面版

正式路径 `/desktop`，普通主页 `/` 保持默认。两者属于同一个静态 Blog，不需要第二次构建、第二套后台或单独发布。

## 内容维护

| 内容 | 继续维护的原来源 | 桌面用途 |
| --- | --- | --- |
| 文章目录 | `/data/articles.json`，由原 `build.py` 更新 | 备忘录、Finder、搜索、日历 |
| 文章正文与封面 | `/articles/{slug}/` | 阅读、下载、照片 |
| 作品 | 正式 `/index.html` 的 `.project-link` | Finder、作品相簿、仿浏览器详情 |
| 简介与身份 | 正式首页 `.hero__kicker`、`.hero__slogan`，关于页 `.pos-item`、`.book-meta`、`.ns-card` | 备忘录个人介绍 |
| 完整关于页 | `/about.html` | 仿浏览器直接打开原页面 |
| 站点资料 | `/data/site.json` | 名称、联系方式与通用资料 |
| 配图 | 原 `/assets/`、`/articles/` | 直接引用，不复制 |

入口 `js/data.js` 每次打开桌面并行读取上述公开来源，使用 `cache: no-cache` 重新验证缓存。更新 Blog 后，下次刷新或进入桌面即可读取新内容；已经打开的桌面不提供服务器推送。作品详情 `project.html?id=...` 也读取同一个适配器，没有单独维护的作品文案。

保持原更新工作流即可。原生成器会保留手工首页；回退模板 `templates/home.html` 已同步“桌面版”入口。没有改动 `build.py` 或新建桌面文章索引，也没有复制上一版独立站的 `content/blog` 快照。

如果日后重构首页／关于页的 HTML 类名，需要同步 `js/data.js` 中的选择器，并运行集成检查。不要为适配失败悄悄塞入过期内容副本。

## 界面与资源

沿用项目 `macos-desktop-web` Skill，原生资源基准为本机 macOS 26.6.2。启用 Finder、备忘录、仿 Safari、照片、文章日历、音乐、外观和应用总览；浏览器地址栏只读，外部作品官网在真实浏览器新标签打开。音乐只播放访客主动选择的本地文件，不上传文件。

默认壁纸 Sonoma；另有 Mac 蓝、金、粉，iMac 绿、橙和天空蓝，共 7 张。固定系统文件导出记录和 SHA-256 在 `assets/wallpapers/manifest.json`；98 个原生图标记录在 `assets/native/manifest.json`。没有读取私人图库、日历、备忘录或音乐库。

外观、壁纸、收藏和布局属于访客偏好，使用独立的 `chenshi.blog.desktop.*` 存储命名空间，原 Blog 的 Foldbook 状态保持独立。

## 仿浏览器与发布

`_headers` 的 `X-Frame-Options` 从 `DENY` 调整为 `SAMEORIGIN`，以允许 Blog 页面被本站桌面嵌入，继续禁止外站嵌入；report-only CSP 的 `frame-ancestors` 同步为 `'self'`。没有设置任意第三方代理，也没有改变原 Blog 页面脚本。桌面在同源 iframe 内附加站内导航／焦点监听。

普通主页上的“桌面版”链接进入 `/desktop`；苹果菜单的“返回普通主页”回到 `/`。桌面启动失败和无 JavaScript 时也可返回普通主页。`<base href="/desktop/">` 同时支持托管服务返回 `/desktop` 与 `/desktop/`。

按 [Cloudflare Pages 的页面服务规则](https://developers.cloudflare.com/pages/configuration/serving-pages/)，`.html` 会重定向到无扩展名路径；仿浏览器同时接受两种形式，包括作品详情 `/desktop/project`，已在本地模拟验证。

本地运行：在 Blog 根执行 `python3 -m http.server 8336 --bind 127.0.0.1`，访问 `http://127.0.0.1:8336/desktop`。按原 Blog 发布流程整体发布：推送 GitHub `main` 后由 Cloudflare Pages 自动部署，无单独的桌面构建步骤。

验证与备份见 `../docs/desktop/VERIFICATION.md`。
