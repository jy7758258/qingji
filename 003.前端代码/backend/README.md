# 轻记 · 账号认证后端

Spring Boot 3 + Spring Security + MyBatis 实现的账号认证与账本 API。账号写入 `identity_*`，账目写入 `ledger_*`，前端明细/统计从本服务读取。

## 技术栈

| 组件 | 版本/说明 |
| --- | --- |
| Java | 17（本机 Corretto 17.0.10） |
| Maven | 3.10.1 |
| Spring Boot | 3.3.5 |
| Spring Security | 6.x |
| MyBatis | 3.0.x Starter |
| MySQL | 9.7（容器 `qingji-mysql`，127.0.0.1:3307） |
| 密码哈希 | Argon2id（Spring Security `Argon2PasswordEncoder`） |
| 会话 | 服务端 `identity_sessions` + HttpOnly Cookie |

> 本机默认 `java`/`mvn` 指向 Java 8；运行前需要设置 `JAVA_HOME` 到 JDK 17。

## 运行

```bash
cd 003.前端代码/backend
export JAVA_HOME="/Users/admin/Library/Java/JavaVirtualMachines/corretto-17.0.10/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
export DB_PASSWORD='<你的本地 MySQL 密码>'

mvn spring-boot:run
# 或
mvn -DskipTests package
java -jar target/qingji-backend-0.0.1-SNAPSHOT.jar
```

服务默认监听 `http://127.0.0.1:8080`。

### 前置条件

1. MySQL 容器已启动：

   ```bash
   docker start qingji-mysql
   ```

2. 已执行 `004.数据库脚本（数据库管理员 DBA）/schema.mysql.sql`。
3. 数据库连接默认使用：
   - 主机 `127.0.0.1:3307`
   - 数据库 `qingji`
   - 用户 `qingji`
   - 密码：通过 `DB_PASSWORD` 环境变量注入（不写入仓库）

## 配置

配置文件：`src/main/resources/application.yml`。生产环境建议全部通过环境变量覆盖。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | 后端端口 |
| `DB_URL` | `jdbc:mysql://127.0.0.1:3307/qingji...` | JDBC URL |
| `DB_USERNAME` | `qingji` | 数据库用户 |
| `DB_PASSWORD` | 无默认值 | 数据库密码；本地运行时必须设置 |
| `APP_CORS_ORIGINS` | `http://localhost:8000,...` | 允许的前端来源，逗号分隔 |
| `SESSION_COOKIE_NAME` | `QJ_SESSION` | 会话 Cookie 名 |
| `SESSION_COOKIE_SECURE` | `false` | 生产 HTTPS 必须设为 `true` |
| `SESSION_TTL_DAYS` | `30` | 会话有效期 |
| `SESSION_COOKIE_SAME_SITE` | `Lax` | Cookie SameSite |

## API

所有响应错误统一为：

```json
{
  "error": {
    "code": "unauthorized",
    "message": "请先登录"
  }
}
```

### `POST /api/auth/register`

请求：

```json
{
  "username": "xiaolin",
  "password": "Pass1234"
}
```

成功 `201`：创建账号、恢复码与 30 天会话，`Set-Cookie: QJ_SESSION=...; HttpOnly; SameSite=Lax`。

```json
{
  "user": {
    "id": "uuid",
    "username": "xiaolin",
    "createdAt": "2026-11-23T06:14:51.625"
  },
  "recoveryCode": "BHM2-LS8R-SFWU-TXFR"
}
```

`recoveryCode` 只返回一次，服务端只保存 SHA-256 哈希。

### `POST /api/auth/login`

成功 `200`，返回公开用户信息并设置会话 Cookie。失败统一 `401`「用户名或密码不正确」；15 分钟内同一用户名 + IP 失败 5 次返回 `429`。

### `GET /api/auth/me`

需要 Cookie。返回当前用户；未登录 `401`。

### `POST /api/auth/logout`

需要 Cookie。吊销当前会话并清除 Cookie，返回 `204`。

### `POST /api/auth/password`

需要 Cookie。

```json
{
  "currentPassword": "Pass1234",
  "newPassword": "NewPass123"
}
```

修改密码，吊销其他会话，返回 `204`。

### `POST /api/auth/recover`

公开接口。

```json
{
  "username": "xiaolin",
  "recoveryCode": "BHM2-LS8R-SFWU-TXFR",
  "newPassword": "NewPass123"
}
```

验证恢复码哈希后更新密码并吊销该用户全部会话，返回 `204`。

## 账本 API

以下接口需要登录 Cookie。

### `GET /api/ledger/categories`

返回当前账号可见的一级分类。首次访问会通过数据库过程 `ledger_bootstrap_user` 初始化 19 个默认分类。

### `GET /api/ledger/transactions?from=2026-11-01&to=2026-11-30`

按日期范围返回当前账号的账目，包含分类名称、图标和颜色。参数可省略，默认当前自然月。

### `POST /api/ledger/transactions`

```json
{
  "type": "expense",
  "amountCents": 2850,
  "categoryId": "uuid",
  "note": "午餐",
  "occurredOn": "2026-11-23"
}
```

成功 `201` 返回账目；`occurredOn` 省略时使用上海时区的当天。金额单位为分，分类必须属于当前用户且类型一致。

## 安全实现

- **密码**：Argon2id 编码，不保存明文；未知用户也执行一次 dummy 哈希，降低通过耗时枚举用户名的可能。
- **会话**：随机 32 字节 Token，数据库只保存 SHA-256 哈希；Cookie `HttpOnly`，默认 `SameSite=Lax`。
- **恢复码**：随机 16 位（4–4–4–4），数据库只保存哈希。
- **限流**：登录失败写入 `identity_auth_attempts`；同一用户名 + IP 15 分钟 5 次失败后返回 429。
- **Origin 防护**：写请求如果带 `Origin`/`Referer`，必须命中 `APP_CORS_ORIGINS`；与 SameSite Cookie 配合使用。
- **事务**：注册的用户、恢复码、会话在同一事务中写入。
- **错误**：不返回数据库异常；统一 JSON。
- **CORS**：只允许配置的前端来源，并允许 credentials。
- **SQL**：MyBatis 参数绑定，不拼 SQL。

> 当前为了本地 HTTP 开发使用 `Secure=false`。生产必须启用 HTTPS、`SESSION_COOKIE_SECURE=true`，并把 CORS 限定到正式域名。生产还建议把 CSRF 防护升级为令牌方案、增加 TLS/审计/密钥管理与独立数据库账号。

## 目录结构

```text
backend/
├── pom.xml
├── src/main/java/com/qingji/backend/
│   ├── QingjiBackendApplication.java
│   ├── auth/
│   │   ├── controller/AuthController.java
│   │   ├── dto/                    请求与响应
│   │   ├── mapper/                 MyBatis Mapper
│   │   ├── model/                  UserRow / SessionRow / AuthPrincipal
│   │   ├── security/               Session 过滤器、Origin 校验、401 入口
│   │   └── service/AuthService.java
│   ├── ledger/
│   │   ├── controller/LedgerController.java
│   │   ├── dto/                    分类与账目响应
│   │   ├── mapper/                 Ledger Mapper
│   │   └── service/LedgerService.java
│   ├── common/                     ApiException / ApiError / 全局异常
│   └── config/                     AppProperties / SecurityConfig
├── src/main/resources/application.yml
└── src/test/                       预留测试目录
```

## 与前端的关系

- 前端：`003.前端代码/frontend`，运行在 `http://localhost:8000`。
- 前端 `assets/js/auth.js` 调用本服务 `/api/auth/*`，使用 `credentials: 'include'`。
- 本服务同时提供 `identity` 认证与 `ledger` 账目接口。
- 前端明细、统计、记一笔已改为调用 `/api/ledger/*`；账本不再使用浏览器本地存储。
- 账号注销、账目导出/导入的真实文件接口暂未实现；前端相关按钮仍为演示。
- 云同步（多设备）仍属于后续版本。

## 当前验证

- 注册 → 自动登录 → `/api/auth/me` → 退出 → 重新登录。
- 错误密码返回 401；找回密码使用恢复码重置后可用新密码登录。
- 分类初始化 19 条；创建账目写入 `ledger_transactions`；明细/统计读取接口数据。
- 前端 Playwright 端到端测试通过，移动端无横向溢出。
- 测试用户已清理；数据库保留了用户自己创建的账号。
