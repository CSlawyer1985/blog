# Foldbook 实现与验证

日期：2026-10-26。分支：`codex/foldable-macbook`，基线 `1a9b59d`。未提交、推送或部署。

## 2026-10-29 华为真机反馈修复

用户在华为 Pura X 真机（多个浏览器）实测发现两个问题，本次修复：

1. **首页 About me 板块在折叠屏宽度错位**。根因有二：621–1099px 区间各板块页边距不一致（hero 24px、About 沿用桌面左轨 104px）；且 621–959px 时 About 右列宽度容不下三圆环流程的 min-content（3×92px+2×44px=364px），第三个圆环被 `.about` 的 overflow:hidden 裁切。修复：compact 区间（621–1099px）统一 about/writing/speak/build/contact/project-gallery 左右边距为 24px，与 hero、project-gallery 原有 24px 对齐；621–959px 时 About 降为上下堆叠（沿用 ≤620px 的 blueprint 比例与标注偏移），≥960px 恢复双列，≥1100px 桌面左轨不变。已验证 669/1064/1440/375 四档。

2. **无铰链 API 设备永远不出现 Mac 桌面**。华为浏览器（ArkWeb 系）及实测的多个浏览器均不暴露 Device Posture API 与 Viewport Segments API，原自动进入条件（posture folded + 两段式分区）永不满足。用户明确需求：180° 展平不加载桌面样式，仅铰链角度 <180°（半折）呈现；且手动进入后应呈现笔记本形态（上屏+键盘触控板）。但在无 API 的浏览器里平放与半折完全不可区分，无法自动实现"只认半折"。经用户确认改为：触屏 + coarse pointer + 中大屏（≥621×480，含 iPad 各姿态与折叠屏展开态；手机竖屏宽 <621、手机横屏高 <480、电脑指针精细均排除）显示"桌面模式"悬浮按钮，点击即切到 `?foldbook=preview` 笔记本形态（53/47 模拟分区）；平放状态不自动加载任何桌面样式。有 API 的浏览器（Chrome 129+ posture / 139+ segments）仍走原自动路径。曾实现过单屏 `fb-single` 形态与 `?foldbook=flat` 参数，用户确认不需要，已移除。

配套改动：入口脚本新增手动入口 pill；全站 247 个 HTML 入口脚本版本号升至 `20261029-nav`。iPad 反馈追加两项：左侧三条竖线（`.rail`，fixed 48px）在 861–1099px 与 24px 边距的内容重叠，隐藏断点从 860px 提至 1099px（≥1100px 桌面左轨 104px 中正常显示）；联系栏仅保留两种形态——621–1099px 移动版堆叠、≥1100px 一行四列（邮箱格内换行可接受，用户明确不采用中间宽度的两列田字格方案，曾实现后移除）（home.css 版本号升至 `20261029-cbar`，base.css 升至 `20261029-rail`）。

真机反馈追加三项（2026-10-29 晚）：① 点击"桌面模式"需同时全屏浏览器——全屏依赖用户手势，改为 pill 原位挂载（sessionStorage `foldbook-manual` 标记会话，站内导航保持）并在同一手势内 requestFullscreen；菜单栏新增全屏/退出全屏开关（后续页面手势失效时可手动补开），退出时清标记并退出全屏。② 站内链接整页跳转导致"闪现普通模式再变桌面"——桌面内容区拦截同源跨页链接，以 iframe 在博客窗口内打开（窗口标题同步、新增"首页"按钮回到原视图），零跳转零闪现；同页锚点（顶部菜单、查看文章/作品）一律原生滚动不进 iframe。③ iframe 内页面因 sessionStorage 同源共享读取 manual 标记而在窗口内再挂桌面（嵌套）——入口脚本加顶层窗口守卫，`window.top !== window.self` 直接不运行。曾实现过单屏 `fb-single` 形态与 `?foldbook=flat` 参数，用户确认不需要，已移除。

验证：`node tests/foldbook.cjs`、`node tests/homepage-static.cjs`、python 27 项、`scratch/foldbook-flat-verify.mjs` Playwright 30 项（触控回归/全屏进入与退出/pill 无跳转进入/iframe 打开文章且无嵌套/菜单锚点原位滚动/iPad 横竖屏/rail 显隐/contact 栏堆叠与四列/鼠标与手机环境无 pill）全部通过。真机（Pura X、iPad）由用户实测确认 pill 与进入流程正常。

铰链 API 支持现状（2026-10 查证）：仅 Chromium 系，Chrome 125 起 origin trial、129 起 Device Posture 默认开启、139 起 Viewport Segments 默认开启（安卓折叠屏真机）；Firefox/Safari 无实现信号；华为 ArkWeb、鸿蒙 NEXT 均不支持。Web 平台无原始铰链角度传感器 API（安卓原生 TYPE_HINGE_ANGLE 不暴露给 Web）。

## 体验

项目目录运行 `python3 -m http.server 8765`，访问 `http://127.0.0.1:8765/?foldbook=preview`。触控板：单指移动，轻点点击，双指滚动，双指轻点右键；光标移到窗口标题栏后按住 350ms 再滑动可拖动窗口。上屏也保留直接触摸和鼠标操作。程序坞打开博客、搜索、便签。

点击搜索或便签输入框，再用下半屏键盘输入。中英文键切换；中文输入完整拼音后点候选或空格提交，数字 1—5 选词，箭头按钮翻候选页。词库是基础本地词库，并非系统输入法；未知拼音可按回车原样输入。便签通过 localStorage 保存；窗口和逐页阅读位置通过 sessionStorage 保存，不联网传输。

## 结构与边界

- 保留原生静态页面、Python 生成方式及 Cloudflare Pages 配置；247 个现有页面/模板仅新增入口脚本标签，已逐一与 Git 基线比对。
- `js/foldbook-entry.js` 仅负责能力检测；完整模块、CSS、拼音词库按需加载。无需框架、iframe 或修改响应头。
- 自动进入要求半折且存在两个上下排列的有效分区。支持 JS 分区和 CSS env() 回退。不按 UA、屏幕比例或触摸能力猜测机型。
- 普通手机保留原来的 620px 汉堡菜单断点；桌面外壳内强制显示完整横向导航，即使宽度落入该断点。展开后恢复现有响应式布局，669px 等宽度原本就显示完整导航。
- 预览参数在站内跨页面导航时保留；真实自动模式在新页重新检测硬件，未将普通站改成 SPA。开机标记用于跨站内导航保留连续会话。
- 卸载恢复原节点顺序和阅读位置。加载失败保留普通博客；初始化失败执行恢复。
- 虚拟键盘支持具有文本选区 API 的 text/search/url/tel/password 和 textarea；其他控件交给原生交互。中文候选不调用系统输入法。第三方跨域播放器的内部不受虚拟触控板控制。
- 双击派发 dblclick 事件，不模拟浏览器原生文本选择；双指右键显示本实现菜单，不调用操作系统菜单。方向键上/下按当前文本起点/终点处理，非原生逐行导航。

## 验证记录

- `node tests/foldbook.cjs`：几何状态判定、拼音候选通过。
- `node tests/homepage-static.cjs`：首页/模板、作品与链接、SEO 等已有检查通过。
- `python3 -m unittest discover -s tests -p 'test_*.py'`：27 项通过。
- `tests/foldbook.browser.js`：22 项浏览器断言通过，覆盖展开/左右半折/上下半折、拼音与编辑、窗口状态、导航、还原和375/1440普通页面。
- `tests/foldbook-touch.browser.js`：8 项通过，使用 Chromium CDP 触控事件验证双指滚动、右键、回顶部、程序坞点击、按住拖窗、最大化几何与600px完整导航。
- 浏览器桌面检查与最终触控检查分别完成三轮通过；触控检查早期发现隐藏窗口坐标被覆盖，已修复并增加恢复位置断言。
- CSS 加载失败：普通首页仍存在，无桌面覆盖层。
- `git diff --check` 通过。247 个已有文件去除入口标签后与 HEAD 内容完全一致；未修改文章、SEO、原CSS和部署头。
- 浏览器控制台观察到已有哔哩哔哩播放器 fingerprint report 错误；未观察到 Foldbook 自身控制台错误。
- 取得并查看首页、文章页、普通375/1440视口截图。独立代码审查提出的窗口偏移、右键目标、输入类型和异常恢复问题已修复；阅读位置改为按路径保存。

## 尚未验证

Android 折叠屏和 iPhone Duo 真机、Safari 实验接口、实际 CSS env() 硬件分区数值、真机浏览器工具栏与软键盘、原生文本选择和第三方播放器控制。浏览器模拟通过不等于真机通过。

## 恢复

正式站未发布，无线上回滚需求。已有文件的改动均为单行入口；移除此入口即可关闭功能。新模块独立于现有内容；保留未跟踪的原有工作资料，不清理、不覆盖。

## 展开内屏布局调整

用户在本会话明确选择：621px 以上采用紧凑 PC 布局。新增621—1099px首页左右两列，620px及以下保留原有上下布局与汉堡菜单；1100px以上原有PC规则保留。已检查375、620、621、669、768、1099、1100、1440px，无页面横向溢出。669px显示左文右图与完整导航。原样式备份：`backups/hero-responsive-before-compact.css`；恢复此文件内容即可撤回这一响应式调整。首页与首次生成模板同步更新样式版本号。

## Dock 与下半屏比例调整

Dock 改为独立彩色图标、上浮名称和底部指示点。鼠标和虚拟光标共用距离放大曲线，中心最大1.65倍，相邻图标渐弱；减少动态效果时禁用放大。通过触控板实际拖动虚拟光标到搜索图标，读取到中心1.63倍、邻居约1.12倍，并取得截图。

键盘宽约机身88%，触控板约机身56%（不含机身边距时），键盘与掌托区域接近等高，去掉掌托说明文字和150px高度上限。669×902px实测键盘宽553px，触控板349×178px。参照MacBook Pro官方俯视布局作屏幕适配，不宣称精确硬件尺寸。

`node tests/foldbook.cjs`（含距离放大/减少动态效果）、`node tests/homepage-static.cjs`、`git diff --check`通过。

## 苹果官网图像校准（替代前述硬件比例版本）

参考页面：https://www.apple.com/macbook-pro/specs/

- 俯视原图：https://www.apple.com/v/macbook-pro/specs/d/images/specs/14-inch/keyboard_14_inch__n0iptd9xeluu_large.jpg
- 展开正面原图：https://www.apple.com/v/macbook-pro/specs/d/images/specs/14-inch/macbook_pro_14_inch__fjlrd633eki2_large.jpg

已查看两张原图，按画面估算键盘约机身宽89%、触控板约42%，并非厂商公布尺寸。六行错列键盘、窄功能键行、两侧扬声器孔、短端轴黑色铰链凹槽、屏幕窄黑边与较厚底边、机身前沿开盖凹口均据图重做。机身上下分区尺寸仍服从折叠屏硬件，无法复刻真实笔记本的投影角度；此前56%触控板方案被替代。官网图片只作设计参考，不嵌入生产页面。

浏览器新版六行键盘实测输入 nihao→你好；模块语法、距离曲线、首页静态检查通过。新增功能键/修饰键向输入控件派发按键事件，不声称控制设备音量或亮度。
