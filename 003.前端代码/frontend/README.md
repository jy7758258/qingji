# 轻记 · 前端原型

轻记个人记账 Web 应用的前端交互原型，对应 PRD v1.1.1。原型覆盖登录门禁、明细、统计、记账、设置、账号安全、分类管理、数据备份和隐私说明，并统一了页面之间的导航。

> 账号注册、登录、会话与找回密码已接入 `../backend` 的 Spring Boot + MySQL 服务；账目也通过 `/api/ledger/*` 写入 MySQL，明细页和统计页从数据库读取。

## 运行

需要先启动 MySQL 与后端，再启动前端：

```bash
# 终端 1：MySQL 容器（已启动则跳过）
docker start qingji-mysql

# 终端 2：后端（从项目根目录执行）
cd 003.前端代码/backend
export JAVA_HOME="/Users/admin/Library/Java/JavaVirtualMachines/corretto-17.0.10/Contents/Home"
export DB_PASSWORD='<你的本地 MySQL 密码>'
mvn spring-boot:run

# 终端 3：前端（从项目根目录执行）
cd 003.前端代码/frontend
python3 -m http.server 8000
```

打开 <http://localhost:8000>。

- 必须通过 HTTP 访问，不要直接双击 HTML。
- 未登录访问账本页会跳转登录页。
- 先注册账号，再使用刚注册的用户名和密码登录。
- API 默认地址为 `http://<当前主机名>:8080`，可在页面加载前设置 `window.QJ_API_BASE` 覆盖。

## 认证行为（已接入后端）

| 能力 | 行为 |
| --- | --- |
| 注册 | 用户名 2–20 位，支持中文/字母/数字/下划线；密码 8–64 位，需包含字母和数字；后端生成 Argon2id 哈希 |
| 登录 | 后端校验用户名与密码；错误统一提示「用户名或密码不正确」 |
| 会话 | 后端 `identity_sessions` + HttpOnly `QJ_SESSION` Cookie，默认 30 天；前端只缓存公开用户信息用于即时渲染 |
| 门禁 | 未登录访问账本页会跳转 `login.html?next=...`；`auth.js` 启动时调用 `/api/auth/me` 校验会话 |
| 退出 | 后端吊销当前会话并清除 Cookie；本地账本仍保留 |
| 找回密码 | 使用注册时生成的恢复码调用 `/api/auth/recover`；恢复码只在注册成功时展示一次 |
| 注销 | 后端注销接口暂未开放；账号页按钮会提示联系管理员 |
| 账本 | 通过后端写入 MySQL，按账号隔离；登录不等于多设备云同步 |

## 页面地图

| 页面 | 文件 | 认证 | 说明 |
| --- | --- | --- | --- |
| 登录 | `login.html` | 公开 | 用户名 + 密码；支持 `?next=` 回跳 |
| 注册 | `register.html` | 公开 | 用户名、密码、确认密码、隐私同意 |
| 找回密码 | `forgot-password.html` | 公开 | 用户名 + 恢复码 + 新密码 |
| 明细 | `index.html` | 需要登录 | 月度概览、数据库账目列表 |
| 统计 | `stats.html` | 需要登录 | 数据库账目、月/年、环形图、排行、趋势 |
| 记一笔 | `record.html` | 需要登录 | 金额、分类、日期、备注、快捷金额 |
| 我的 | `settings.html` | 需要登录 | 账号、数据、分类、隐私与退出 |
| 账号与安全 | `account.html` | 需要登录 | 修改密码、恢复码说明、退出；注销待接入 |
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
│   │   ├── auth.js             后端认证 API、Cookie 会话校验、登录门禁
│   │   ├── ledger.js           账本 API 客户端（分类/账目）
│   │   ├── layout.js           共享顶栏、导航、页脚注入
│   │   └── main.js             页面交互、图表、弹层、表单
│   ├── icons.svg                SVG Symbol 图标库
│   └── img/peach.svg            品牌小桃
├── docs/
│   ├── design-tokens.md        视觉规范与 Token
│   └── page-map.md             页面/导航/交互地图
└── README.md
```

后端工程位于：

```text
003.前端代码/backend/
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
- 认证与账本 API 都由 `../backend` 提供；前端不要在 localStorage 保存密码、会话 Token 或恢复码明文。
- 生产部署时必须启用 HTTPS，并将后端 `SESSION_COOKIE_SECURE` 设置为 `true`，同时把 `APP_CORS_ORIGINS` 改为正式域名。
- 登录不等于多设备云同步；但在本地运行时，账号与账目都保存在项目 MySQL 中。
