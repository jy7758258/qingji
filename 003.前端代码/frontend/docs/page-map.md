# 轻记 · 页面与交互地图

## 1. 页面结构

```text
登录 login.html ──── 注册 register.html
   │                    │
   │                    └── 隐私说明 privacy.html
   ├── 找回密码 forgot-password.html
   │
   └── 登录成功
         │
         ▼
明细 index.html ── 统计 stats.html
   │                 │
   ├── 记一笔 record.html
   │
   └── 我的 settings.html
         ├── 账号与安全 account.html
         ├── 数据与备份 data.html
         ├── 分类管理 categories.html
         └── 隐私说明 privacy.html
```

## 2. 认证门禁

`assets/js/auth.js` 在页面脚本中最先执行：

- `PROTECTED`：`index.html`、`stats.html`、`record.html`、`settings.html`、`account.html`、`data.html`、`categories.html`
- `AUTH_PAGES`：`login.html`、`register.html`、`forgot-password.html`
- 未登录访问受保护页面 → `login.html?next=<encoded-file>`。
- 已登录访问登录/注册/找回密码 → `index.html`。
- `privacy.html` 公开，可从注册页直接查看。
- `next` 只接受白名单页面，防止开放重定向。

## 3. 本地演示认证

> 仅原型使用；生产必须替换为服务端认证。

```text
注册
  ├─ 校验用户名（2–20 位，中文/字母/数字/下划线）
  ├─ 校验密码（8–64 位，字母 + 数字）
  ├─ 生成随机盐 + PBKDF2-SHA256 密码哈希
  ├─ 生成 16 位恢复码
  ├─ 写入 localStorage: qingji_demo_accounts_v1
  └─ 创建 30 天会话 → 进入明细

登录
  ├─ 用户名 NFKC / 去空格 / 不区分大小写匹配
  ├─ 使用保存的盐重新派生密码哈希并比较
  ├─ 成功：写入 qingji_demo_session_v1 → next 或明细
  └─ 失败：统一提示「用户名或密码不正确」

退出
  └─ 删除会话，保留账号与本地账本

找回密码
  ├─ 用户名 + 恢复码 + 新密码
  ├─ 恢复码不匹配 → 统一错误
  └─ 更新密码哈希并清除会话 → 回到登录

注销
  └─ 删除本地账号与会话（原型）
```

存储键：

| key | 内容 |
| --- | --- |
| `qingji_demo_accounts_v1` | 账号对象：用户名、注册时间、盐、密码哈希、恢复码 |
| `qingji_demo_session_v1` | 30 天演示会话 |
| `qingji_demo_privacy` | 隐私模式偏好 |
| `qingji_demo_backup_reminder` | 备份提醒偏好 |
| `qingji_demo_flash` | 跨页面一次性提示 |

## 4. 页面职责

| 页面 | 主要区域 | 交互 |
| --- | --- | --- |
| `index.html` | 月度概览、预算、连续记录、账目列表 | 点击账目进入记账页；预算链接统计；顶部搜索/记一笔 |
| `stats.html` | 月度/年度、支出/收入、环形图、排行、趋势 | 切换数据；点击分类回明细；数据表可展开 |
| `record.html` | 金额、分类、日期、备注、快捷金额 | 切换收支、选择分类、快捷加金额、保存回明细 |
| `settings.html` | 账号卡、隐私承诺、快捷导航、设置列表 | 账号/分类/数据/退出/清除数据 |
| `account.html` | 用户名、注册时间、修改密码、恢复码、注销 | 打开密码/恢复码弹层，退出与注销确认 |
| `data.html` | 存储状态、导出、导入、复制备份、提醒、清除 | 文件选择、剪贴板、确认弹层 |
| `categories.html` | 支出/收入分类、二级分类 | 切换类型、新增、编辑、隐藏、删除自定义分类 |
| `login.html` | 用户名 + 密码 | 本地账号校验、密码显示切换、`next` 回跳 |
| `register.html` | 用户名 + 密码 + 确认密码 + 隐私同意 | 注册按钮受隐私勾选控制 |
| `forgot-password.html` | 用户名 + 恢复码 + 新密码 | 重置本地密码 |
| `privacy.html` | 数据边界与风险说明 | 返回登录 / 注册 |

## 5. 共享脚本

| 文件 | 职责 |
| --- | --- |
| `assets/js/auth.js` | 本地账号、PBKDF2 哈希、会话、登录门禁、`next` 白名单 |
| `assets/js/layout.js` | 注入顶栏、移动端底部导航、悬浮按钮、页脚；读取当前用户显示头像 |
| `assets/js/main.js` | 通用 Toast/弹层/表单、搜索、统计图表、记账、分类、备份、账号弹层 |
| `assets/css/tokens.css` | 颜色、圆角、阴影、字体、图表色板 |
| `assets/css/base.css` | Reset、排版、焦点、工具类 |
| `assets/css/layout.css` | 页面壳层与响应式导航 |
| `assets/css/components.css` | 按钮、卡片、表单、列表、弹层、Toast |
| `assets/css/pages.css` | 各页面专属布局与移动端适配 |

## 6. 每个 HTML 的固定结构

```html
<body data-layout="app|sub|record|auth"
      data-page="home|stats|record|settings|account|data|categories|login|register|forgot|privacy"
      data-active="home|stats|settings"
      data-title="子页面标题"
      data-back="返回页面">
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header id="site-header"></header>
  <main id="main" class="page">…</main>
  <nav id="mobile-nav"></nav>
  <footer id="site-footer"></footer>
  <div id="modal-root"></div>
  <div id="toast-root" class="toast-root" aria-live="polite"></div>
  <script src="assets/js/auth.js" defer></script>
  <script src="assets/js/layout.js" defer></script>
  <script src="assets/js/main.js" defer></script>
</body>
```

新增页面时：

1. 复制固定结构并设置 `data-*`。
2. 若是受保护页面，加入 `auth.js` 的 `PROTECTED`。
3. 若是主导航页面，加入 `layout.js` 的 `navItems`。
4. 在 `main.js` 的 `init()` 中按需增加页面初始化。
5. 同步更新 `README.md` 和本文件。

## 7. 原型范围

- 已实现前端交互：登录门禁、注册、登录、找回、退出、搜索弹层、统计切换、记账保存、分类增删改、备份/导入/复制演示、账号弹层。
- 未连接真实后端：账号与账本存储在本机 `localStorage`，备份导入/导出为演示交互。
- PRD 中但原型未实现的页面/能力：云端同步、PWA 安装、预算详情页、资金账户与转账、周期记账、智能洞察、多币种。
- 正式实现时，认证必须迁移到服务端；账本数据应继续与认证数据分离，并补齐服务端限流、CSRF、HttpOnly Cookie 和密码找回审核。
