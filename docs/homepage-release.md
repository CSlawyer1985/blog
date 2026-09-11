# 首页与关于页更新验收

2026-09-11。用户确认样页并明确授权首页更新、提交推送；随后补充关于页右侧项目清单。

## 发布范围

- 首页身份文案改为“商事律师 × AI Builder”，中英文同步；SEO描述及配置来源同步，未全站重建文章。
- 全媒体工作站保留6个真实频道/联系入口，作品集中在Build下方的7张卡片；沿用已确认配图及SVG/CSS动效。
- 首屏“查看作品”锚点、响应式上下布局、原版粒子密度/粒径同步缩放及零固定偏移全部采用确认版本。
- 关于页原有5个仓库保留，新增DeepSeek Harness、MemoBall、法律人Skill仓库、法律Agent解构。夜校已单列，不重复。
- 正式资源迁入css/、js/和assets/portfolio/。移除样页悬浮导航及noindex，正式首页不依赖previews目录。
- 首次构建回退模板templates/home.html与index.html保持一致。现有构建器保留手工首页，本次不运行会影响文章资料的全站生成。
- PORTFOLIO_DESIGN.md、docs/portfolio/prompts.md、docs/hero-portrait.md保存后续维护约束；原始生图保留在docs/portfolio/sources/。

## 验证结果

前端review gate：**可发布**，没有发现阻断本次变更的问题。用户已确认的设计不再改写。

- node tests/homepage-static.cjs：通过。首页/模板一致、身份文案、7件作品、6个频道、9个关于页条目、原有仓库、SEO JSON、锚点及本地资源检查。
- node tests/hero-original.cjs：5组源码约束通过，仅允许用户确认的几何缩放差异。
- node --check js/hero-portrait.js、js/portfolio.js：通过。
- tests/hero-layout.browser.js：40/40通过；1440/1101/1100/1024/768/375视口。
- tests/hero-density.browser.js：6/6通过；实际绘制验证粒径随图宽同比变化、粒子alpha不变、数量与密度下降。
- tests/homepage-release.browser.js：25/25通过；3/2/1列、所有卡片图片与默认动效、实际动画变化、键盘焦点、离屏暂停、系统减少动效、查看作品锚点、中英文溢出、关于页原有与新增项目。
- 实际查看桌面/手机首页、桌面作品区、关于页桌面/手机截图。图片位于docs/portfolio/screenshots/。

以上为本机Chromium与此前DPR2触屏仿真，不宣称已进行真机Safari/Android验证或全站WCAG认证。原首页嵌入的B站第三方脚本仍有其自身fingerprint错误/警告，本次未新增第三方依赖或跟踪器。关于页原仓库的静态Star数未作为本次新增内容更新。

## 备份与回退

修改前生产基线提交：0ff31bfc7a950a3baddbd036a50b37009032a429。
本机逐文件备份：previews/release-20260911/baseline/（不推送）。首页、关于页及规则备份已核对SHA256。
发布后的回退应通过对本次发布提交执行常规git revert并推送完成；不得强推或重置整个仓库。只回退本次提交，不影响其他后续改动。

本文件记录提交前验收；Git推送结果与正式域名生效情况以交付时的实际检查为准。
