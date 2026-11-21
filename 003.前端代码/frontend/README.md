# 轻记 · 前端原型

轻记个人记账 Web 应用的前端交互原型，对应 PRD v1.1.1。原型覆盖登录门禁、明细、统计、记账、设置、账号安全、分类管理、数据备份和隐私说明，并统一了页面之间的导航。

> 这是**前端原型**：账号与账本保存在浏览器本地，不连接真实认证或云同步服务。正式实现需要服务端认证（Argon2id / bcrypt、HttpOnly Cookie、限流、CSRF）与数据库。

## 运行

```bash
cd frontend
python3 -m http.server 8000
```

打开 <http://localhost:8000>。

- 必须通过 HTTP 访问，不要直接双击 HTML；Web Crypto 与 `localStorage` 在 `file://` 下行为不一致。
- 首次访问账本页会自动跳转到登录页。
- 先注册账号，再使用刚注册的用户名和密码登录；未注册或密码错误的账号无法进入。

## 认证行为（原型）

| 能力 | 行为 |
| --- | --- |
| 注册 | 用户名 2–20 位，支持中文/字母/数字/下划线；密码 8–64 位，需包含字母和数字 |
| 密码存储 | 使用浏览器 Web Crypto 的 PBKDF2-SHA256（随机盐）派生后存于 `localStorage`；不保存明文密码 |
| 登录 | 必须匹配本地已注册账号；错误统一提示「用户名或密码不正确」 |
| 会话 | `localStorage` 保存 30 天会话；刷新保持登录 |
| 门禁 | 未登录访问 `index.html`、`stats.html`、`record.html`、`settings.html`、`account.html`、`data.html`、`categories.html` 会跳转 `login.html?next=...` |
| 退出 | 清除会话，保留本地账号与账本；重新登录可继续 |
| 找回密码 | 使用注册时生成的恢复码重置；原型中可在「账号与安全」查看恢复码 |
| 注销 | 删除本地账号和会话；账本数据目前仅为示例 |

**安全声明**：本地 `localStorage` 方案仅用于原型演示，不具备生产安全性；正式版本必须改为服务端认证，并把恢复码哈希保存在服务端。

## 页面地图

| 页面 | 文件 | 认证 | 说明 |
| --- | --- | --- | --- |
| 登录 | `login.html` | 公开 | 用户名 + 密码；支持 `?next=` 回跳 |
| 注册 | `register.html` | 公开 | 用户名、密码、确认密码、隐私同意 |
| 找回密码 | `forgot-password.html` | 公开 | 用户名 + 恢复码 + 新密码 |
| 明细 | `index.html` | 需要登录 | 月度概览、预算、账目列表 |
| 统计 | `stats.html` | 需要登录 | 月/年、支出/收入、环形图、排行、趋势 |
| 记一笔 | `record.html` | 需要登录 | 金额、分类、日期、备注、快捷金额 |
| 我的 | `settings.html` | 需要登录 | 账号、数据、分类、隐私与退出 |
| 账号与安全 | `account.html` | 需要登录 | 修改密码、恢复码、退出、注销 |
| 数据与备份 | `data.html` | 需要登录 | 导出、导入、复制备份、存储状态、清除 |
| 分类管理 | `categories.html` | 需要登录 | 支出/收入分类、增删改、隐藏 |
| 隐私说明 | `privacy.html` | 公开 | 数据边界、账号、备份与风险说明 |

## 目录结构

```text
frontend/
├── index.html                  明细
├── stats.html                  统计
├── record.html                 记一笔
├── settings.html               我的
├── account.html                账号与安全
├── data.html                   数据与备份
├── categories.html             分类管理
├── login.html                  登录
├── register.html               注册
├── forgot-password.html        找回密码
├── privacy.html                隐私说明
├── assets/
│   ├── css/
│   │   ├── tokens.css          设计 Token（颜色/圆角/阴影/字体）
│   │   ├── base.css            Reset、排版、通用工具
│   │   ├── layout.css          顶栏、底部导航、页脚、认证页布局
│   │   ├── components.css      按钮、卡片、表单、弹层、Toast
│   │   └── pages.css           明细/统计/记账/设置等页面样式
│   ├── js/
│   │   ├── auth.js             本地认证、会话、登录门禁
│   │   ├── layout.js           共享顶栏、导航、页脚注入
│   │   └── main.js             页面交互、图表、弹层、表单
│   ├── icons.svg                SVG Symbol 图标库
│   └── img/peach.svg            品牌小桃
├── docs/
│   ├── design-tokens.md        视觉规范与 Token
│   └── page-map.md             页面/导航/交互地图
└── README.md
```

原始 Stitch 页面已移出 `frontend/`，保存在：

```text
003.前端代码/_archive/stitch-original/
```

## 开发约定

- 所有页面都在 `frontend/` 根目录，资源使用 `assets/...` 相对路径。
- 脚本加载顺序固定：`auth.js` → `layout.js` → `main.js`，全部 `defer`。
- 公共壳层由 `layout.js` 注入，页面只负责 `<main>` 内容与 `body` 的 `data-*` 配置。
- 新增受保护页面：在 `auth.js` 的 `PROTECTED` 中加入文件名，并在 `layout.js` 的导航中按需增加入口。
- 视觉样式优先复用 `tokens.css` 与组件类，不在 HTML 中写内联样式；例外仅限一次性布局微调。
- 图标统一使用 `assets/icons.svg` 中的 `<symbol>`，不要混用 emoji 与 Material Symbols。
- 生产化时，将本地认证替换为真实 API；不要把密码或恢复码明文提交到任何存储。
