# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

「轻记」个人记账 Web 应用，按照上一级目录的 `轻记-个人记账Web应用-PRD-v1.1.md` 实现。当前版本对应 PRD 的 **v1.0 P0 范围**：本地记账闭环、分类、统计、JSON/CSV 数据备份与恢复、手机浏览器适配。

这是一个**无构建步骤、无后端、无框架依赖**的静态站点：

- 原生 HTML + CSS + 经典 JavaScript（IIFE，挂载到 `window.QJ`）。
- 数据全部保存在浏览器 **IndexedDB**，不发起任何网络请求。
- 不要擅自引入 npm、打包器、前端框架或后端；PRD 明确保持「打开网页即用、本地优先」。

## 常用命令

```bash
# 启动本地预览（macOS 双击 start.command 也可以）
cd qingji-web
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

```bash
# 仅做 JS 语法检查（项目没有 lint / build / test 脚本）
for f in js/*.js; do node --check "$f"; done
```

**必须通过 HTTP 访问**，不要直接双击 `index.html`：`file://` 下部分浏览器会禁用 IndexedDB，导致数据无法保存。

仓库内没有自动化测试套件。手工回归至少覆盖：

1. 记账 → 刷新页面，数据仍在；
2. 编辑金额/分类/日期 → 首页与统计同步；
3. 删除 → 5 秒内撤销；
4. 统计页月/年、支出/收入、分类下钻；
5. 导出 JSON → 导入恢复；
6. 390px / 320px 手机宽度，以及 1440px 桌面宽度。

如使用 Playwright 做本地验证，可直接驱动系统 Chrome（本机无需下载 Chromium）：`p.chromium.launch(channel="chrome")`。

## 架构

脚本以**固定顺序**通过 `defer` 加载（`index.html`），依赖全局 `window.QJ`：

```
index.html
  ├─ js/icons.js   → QJ.icon / QJ.mascot / QJ.peachMark，内联 SVG
  ├─ js/db.js      → QJ.db，IndexedDB、默认分类、备份/恢复
  ├─ js/charts.js  → QJ.charts.donut / trendBars / esc
  └─ js/app.js     → 路由、页面渲染、事件、弹层、Toast
```

- **`db.js`**：数据库名 `qingji`，schema v1。Object Store：`transactions`、`categories`、`settings`、`meta`。首次打开自动写入默认分类与设置。金额统一存**整数分** `amountCents`；删除使用 `deletedAt` 软删除；备份格式为 `qingji-backup` v1。
- **`app.js`**：Hash 路由 + 单视图渲染。核心路由：
  - `#/` 明细（可带 `?month=YYYY-MM`）
  - `#/record` 新建，`#/record?id=...` 编辑
  - `#/stats?month=YYYY-MM&view=month|year&type=expense|income`
  - `#/settings`、`#/settings/categories?type=...`、`#/settings/data`、`#/settings/about`
  - 路由入口 `handleRoute()` 每次重新读取 IndexedDB 快照并渲染 `#view`；各页面在渲染后绑定 `view.onclick` / `view.onkeydown`。
- **`charts.js`**：无依赖 SVG 环形图 + CSS 柱状趋势图；分类色板需经过色盲/对比度校验，不要随意换成浅粉马卡龙色。
- **`styles.css`**：设计 Token 在文件顶部（颜色、圆角、阴影、字体）；移动优先，断点 640 / 768 / 1024；小于 768px 使用底部 3 Tab + 悬浮「+」，桌面使用顶部导航和两栏首页。包含 safe-area、`dvh`、键盘视口、`prefers-reduced-motion` 处理。

### 数据与安全不变量

- 所有用户输入进入 HTML 前必须经过 `QJ.charts.esc()`；不要直接拼接备注、分类名、导入文件内容。
- 金额只以整数分计算；展示使用 `Intl.NumberFormat`。日期按**浏览器本地时区**归日/归月；过去日期的记录时间固定为本地中午。
- 分类删除必须先迁移账目；系统分类不可删除，只能隐藏。
- 备份/导入是 P0：修改数据结构时同步升级备份 `version`，并保留对旧版本的拒绝/迁移策略。
- 数据只存本机是产品承诺，不要为分析、字体或图标引入外部请求。

## 修改指引

- **新增页面**：在 `handleRoute()` 增加路径 → 在 `renderTopbar()` 补标题/返回逻辑 → 在 `renderBottomNav()` 确认 active 状态 → 写渲染函数并绑定事件 → 同步更新 PRD。
- **新增分类/图标**：在 `icons.js` 的 `ICONS` 增加 SVG，再在 `app.js` 的 `CAT_ICONS` 暴露可选图标；默认分类种子在 `db.js`。
- **修改样式**：优先使用 `:root` Token；白色小字只能放在 `--color-primary-strong`（`#C73E6D`）等深色底上，不要放在 `#F78FB3` 浅粉上。
- **弹层/提示**：复用 `openModal` / `openConfirm` / `openAlert` / `openActionSheet` / `showToast`；不要在页面里另造一套。
- **脚本保持经典脚本**：当前设计允许静态托管、无构建；改成 ES Module 前需评估 `file://`、加载顺序与部署方式。

## 范围与已知限制

- 已实现：快速记账、二级分类、账目编辑/删除/撤销、月度概览、统计（环形图/排行/趋势/下钻/数据表）、分类管理、JSON/CSV 导出、导入恢复、备份提醒、清除数据、响应式布局。
- 未实现（PRD v1.1/v1.2）：预算、账户与转账、搜索筛选、隐私模式、PWA/Service Worker、账号与云同步、周期记账、智能洞察。不要默认它们已存在。
- 无 Service Worker：刷新后离线不可用，只有已打开页面断网时可继续记账。
- 微信内置浏览器下载受限：导出走「复制备份内容」降级。
- iOS「添加到主屏幕」可能与 Safari 存储隔离：引导安装前必须先备份；这是已知风险，不要宣传为防丢失手段。
- 无痕模式/浏览器禁用 IndexedDB 时会进入错误页；不支持自动降级到内存存储。
