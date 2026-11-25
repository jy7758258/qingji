# 轻记 · uni-app 多端版

基于 `003.前端代码/frontend` 的功能与视觉，使用 uni-app（Vue 3）实现 iOS、Android、微信小程序三端。

> 原 Web 项目 `003.前端代码` 未做任何修改。账号认证与账本接口复用现有 Spring Boot 后端。

## 1. 功能范围

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 登录 | `pages/login/login` | 用户名 + 密码，启动时校验已有会话 |
| 注册 | `pages/register/register` | 用户名、密码、确认密码、隐私同意、恢复码提示 |
| 找回密码 | `pages/forgot/forgot` | 用户名 + 恢复码 + 新密码 |
| 明细 | `pages/index/index` | 本月概览、分类 Top 4、按日账目、搜索入口、记一笔入口 |
| 统计 | `pages/stats/stats` | 本月/今年、支出/收入、分类排行、趋势柱状图、小桃观察 |
| 记一笔 | `pages/record/record` | 收支切换、金额、快捷金额、分类、日期（默认今天）、备注、保存/再记一笔 |
| 我的 | `pages/settings/settings` | 账号卡、快捷入口、账号/数据/分类/隐私、隐私模式、备份提醒、退出 |
| 账号与安全 | `pages/account/account` | 账号信息、修改密码、恢复码说明、退出 |
| 数据与备份 | `pages/data/data` | 近两年账目统计、复制 JSON/CSV 备份、清除本机偏好 |
| 分类管理 | `pages/categories/categories` | 支出/收入分类只读展示 |
| 搜索 | `pages/search/search` | 近 12 个月账目搜索，支持分类/备注/日期/金额 |
| 隐私说明 | `pages/privacy/privacy` | 数据边界、账号、备份与风险说明 |

底部导航：明细 / 统计 / 我的。`pages.json` 使用自定义导航栏，顶部栏会适配状态栏高度，微信小程序为右上角胶囊预留空间。

## 2. 后端依赖

先启动 MySQL、后端和前端（后端只需启动一次）：

```bash
# 1. MySQL（已有容器）
docker start qingji-mysql

# 2. 后端
cd 003.前端代码/backend
export JAVA_HOME="/Users/admin/Library/Java/JavaVirtualMachines/corretto-17.0.10/Contents/Home"
export DB_PASSWORD='<你的本地 MySQL 密码>'
mvn spring-boot:run
```

后端默认地址：`http://127.0.0.1:8080`。

多端项目使用与 Web 相同的接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/password`
- `POST /api/auth/recover`
- `GET /api/ledger/categories`
- `GET /api/ledger/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/ledger/transactions`

## 3. 配置后端地址（必须）

编辑 [`common/config.js`](common/config.js)：

```js
export const API_BASE_URL = 'http://192.168.0.19:8080'
```

| 运行环境 | 建议地址 | 说明 |
| --- | --- | --- |
| iOS 模拟器 | `http://127.0.0.1:8080` | 模拟器可访问 Mac 本机 |
| 微信开发者工具 | `http://127.0.0.1:8080` | 需在详情中勾选“不校验合法域名” |
| Android 模拟器 | `http://10.0.2.2:8080` | Android 模拟器访问宿主机的固定地址 |
| iOS / Android 真机 | `http://<电脑局域网 IP>:8080` | 手机与电脑同一 Wi-Fi |
| 生产环境 | `https://你的域名` | 必须 HTTPS，并在微信后台配置 request 合法域名 |

> 后端默认只监听 `127.0.0.1`。真机调试时请让后端监听局域网地址，例如
> `SERVER_PORT=8080` 以外还需要在启动参数中配置监听地址；同时放行 macOS 防火墙。

## 4. 登录会话在 App / 小程序中的处理

浏览器会自动管理 HttpOnly Cookie，但 App 与微信小程序的 `uni.request` 不会自动保存服务端 Cookie。项目的处理方式：

1. 登录 / 注册成功后，从响应的 `Set-Cookie` 中提取 `QJ_SESSION=...`；
2. 保存到本机 storage（`qingji_uniapp_cookie_v1`）；
3. 后续请求通过 `Cookie` 请求头带回；
4. 退出登录或收到 `401` 时清除本地 Cookie 与公开用户缓存。

相关代码：

- [`common/request.js`](common/request.js)：请求封装、Cookie 提取与发送、401 跳转登录
- [`common/auth.js`](common/auth.js)：认证 API 与用户缓存
- [`common/ledger.js`](common/ledger.js)：账本 API 与字段标准化

> 该方案依赖微信小程序允许自定义 `Cookie` 请求头。若你的微信基础库或后端网关对 `Cookie` 做了限制，需要在后端增加 Token 方案；当前版本按要求不修改原后端。

## 5. 运行方式

### 微信小程序（HBuilderX）

1. 用 HBuilderX 打开本目录；
2. 在 `manifest.json` 的“微信小程序配置”里填写自己的 AppID（仅本地预览也可使用测试号）；
3. 运行 → 运行到小程序模拟器 → 微信开发者工具；
4. 微信开发者工具中确认“详情 → 本地设置 → 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”已勾选；
5. 若要真机预览，把 `API_BASE_URL` 改成局域网地址，并保证手机能访问后端。

### iOS / Android（HBuilderX）

1. 运行 → 运行到手机或模拟器；
2. iOS 模拟器可直接使用 `127.0.0.1`；
3. Android 模拟器把 `API_BASE_URL` 改成 `http://10.0.2.2:8080`；
4. 真机调试时改用电脑局域网 IP，并确认后端监听局域网。

### 命令行编译（可选）

HBuilderX 自带 CLI，可用于检查多端编译：

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli launch mp-weixin \
  --project "$PWD" --compile true
```

产物在 `unpackage/dist/dev/mp-weixin/`。App 产物在 `unpackage/dist/dev/app-plus/`。

### 微信开发者工具旧版本报 `wx is not defined`

如果控制台出现：

```text
ReferenceError: wx is not defined
    at vendor.js ...
(env: macOS,mp,1.06.2206090; lib: 3.18.0)
```

这是旧版微信开发者工具（例如 `1.06.2206090`）加载新基础库 `3.18.0` 时的兼容问题，不是业务代码异常。当前项目已在 `manifest.json` 中固定：

```json
"mp-weixin": {
  "libVersion": "2.24.7"
}
```

处理方式：

1. 重新编译后，在微信开发者工具打开 `详情 → 本地设置 → 调试基础库`，选择 `2.24.7`（或本机已安装的 2.2x 版本）；
2. 如果 `project.private.config.json` 把 `libVersion` 覆盖成 `3.18.0`，关闭项目后修改该文件，再重新打开；
3. 更推荐把微信开发者工具升级到较新的稳定版，再使用 `libVersion: "latest"`；
4. 修改后清理编译缓存并重新编译。

## 6. 与 Web 版的差异

功能主流程与 Web 版一致：注册、登录、找回密码、会话门禁、记一笔、明细、统计、搜索、账号密码修改、数据复制备份、隐私说明、隐私模式。

以下能力受当前后端接口限制，不能完全复刻 Web 原型中的“演示按钮”：

| 项目 | 当前多端实现 | 原因 |
| --- | --- | --- |
| 分类新增/编辑/隐藏/排序 | 只读展示 | 后端目前只有 `GET /api/ledger/categories` |
| 文件导出 / 导入 | 复制 JSON / CSV 到剪贴板 | 小程序/App 文件能力差异大，后端没有导入接口 |
| 账号注销 | 提示接口未开放 | 后端没有注销接口 |
| 云端多设备同步 | 未实现 | 当前账本为本地 MySQL，登录不等于云同步 |

这些限制与 Web 版当前真实可用能力一致；Web 原型中未接后端的演示按钮没有在多端版本中伪造成功。

## 7. 目录结构

```text
qingji-uniapp-project/
├── App.vue                    全局样式与启动入口
├── main.js                    Vue 3 入口
├── pages.json                 页面、自定义导航栏配置
├── manifest.json              App / 微信小程序配置
├── uni.scss                   轻记主题变量
├── common/
│   ├── config.js              后端地址与 storage key
│   ├── request.js             uni.request 封装、Cookie、401
│   ├── auth.js                注册/登录/会话/找回密码
│   ├── ledger.js              分类、账目、统计范围
│   └── format.js              金额/日期/分类图标与颜色
├── components/
│   ├── QjTopBar.vue           自定义顶部栏（状态栏/胶囊适配）
│   └── QjTabBar.vue           明细/统计/我的底部导航
├── pages/
│   ├── login/ register/ forgot/
│   ├── index/ stats/ record/ settings/
│   ├── account/ data/ categories/ search/ privacy/
└── static/
```

## 8. 验证记录

2026-11-24 使用 HBuilderX 5.34（Vue 3）执行微信小程序编译：

```text
项目 qingji-uniapp-project 编译成功
```

编译产出 12 个页面与 2 个公共组件。运行时需要后端、MySQL 与对应平台模拟器/开发者工具。

## 9. 安全提醒

- 不要把 MySQL 密码写进 `common/config.js` 或提交到 Git；后端继续使用 `DB_PASSWORD` 环境变量。
- 生产环境必须使用 HTTPS，并将后端 `SESSION_COOKIE_SECURE` 设为 `true`。
- 微信小程序正式发布前，必须在微信公众平台配置后端 HTTPS 域名，不能使用 `127.0.0.1` 或局域网 IP。
- 恢复码、密码、Cookie 都不要写入日志或提交到仓库。
