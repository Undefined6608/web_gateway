# 前端对接需求文档

本文档对应当前后端已实现的 HTTP API，用于指导展示页面和管理页面开发。

## 1. 基础约定

- API Base URL：与后端同源时为空；本地开发默认 `http://127.0.0.1:8001`。
- 数据格式：请求和响应均使用 `application/json`。
- 时间格式：MySQL `DATETIME(3)` 序列化为无时区 ISO 时间，例如 `2026-07-20T18:30:00.123`。
- 当前列表接口暂不分页，前端按完整数组处理。
- 后端目前未开启跨域。前后端分离开发时，应通过 Vite/Webpack/Next.js 开发代理转发 `/api` 和 `/health`。
- 管理接口统一使用 JWT Bearer Token：

```http
Authorization: Bearer <access_token>
```

## 2. 页面需求

### 2.1 展示页面

展示全部系统，至少包含：

- 系统名称
- 系统排序值（数值越小越靠前）
- 系统状态：维护、正常、已关闭
- 系统负责人
- 页面、后端、数据开发人员
- 线上地址、测试地址
- 每个地址各自的 VPN、公司内网、公网和备注
- 地址最近检测状态、HTTP 状态码、响应耗时、检测时间和失败原因
- 地址重新检测按钮
- 每条地址右侧的“查看账号密码”按钮
- 系统开启 `colorful_border` 时的炫彩重点边框

交互要求：

- 首次进入页面调用 `GET /api/systems`。
- 地址本身可点击，并使用新窗口打开；外链应设置 `rel="noopener noreferrer"`。
- 点击重新检测后禁用当前按钮并显示加载状态，调用检测接口后只更新对应地址。
- 收到 `429` 时提示操作频繁，至少 10 秒后才允许再次点击。
- `closed` 系统仍可展示，但视觉上应明确标记为已关闭。
- 普通展示查询不得调用账号管理接口，也不得出现密码字段；只有用户主动点击某条地址右侧的“查看账号密码”并通过管理员二次认证后，才可短暂展示该地址启用账号的明文密码。

查看账号密码交互：

- 每条地址右侧显示按钮；点击后保存当前地址的 `endpoint_id`。
- 已存在有效管理员 JWT 时直接请求并展示结果，不打开二次认证弹窗。
- 未登录但当前标签页保存有未过期的临时查看令牌时，直接携带令牌请求，不打开二次认证弹窗。
- 只有 JWT 和临时令牌均不存在时才打开弹窗；弹窗显示当前地址类型、URL 和备注，并要求输入本程序的管理员用户名和密码。
- 临时验证不会签发 JWT，也不会让用户进入管理页面。
- 验证成功后只显示当前地址所有启用账号的角色、账号、密码和备注。
- 返回空数组时显示“当前地址暂无可用账号”，不要继续请求同一系统的其他地址。
- 密码默认遮罩，可提供单次显示和复制按钮。
- 管理员密码不得写入前端状态持久层、浏览器存储、URL、日志或埋点。
- 临时查看令牌及过期时间最多保存到当前标签页的 `sessionStorage`，禁止使用 `localStorage`；退出管理登录时也应一并清除临时查看令牌。
- 返回的系统密码不得写入 `localStorage`、`sessionStorage`、IndexedDB、Service Worker Cache 或前端日志。
- 关闭弹窗、切换系统或离开页面时立即清除明文数据；建议最多显示 60 秒后自动清除。
- 认证失败显示通用错误，不区分用户名不存在或密码错误。
- 收到 `429` 时提示失败次数过多，5 分钟后再试。

### 2.2 管理登录页面

- 用户名、密码均必填。
- 登录成功后保存 JWT，并进入管理页面。
- 推荐将 JWT 保存在内存或 `sessionStorage`，不要保存在 `localStorage`。
- 所有管理请求自动附加 `Authorization` 请求头。
- 任意管理接口返回 `401` 时，清除本地 JWT 并跳转登录页。
- 当前没有刷新令牌接口；JWT 到期后需要重新登录。

### 2.3 管理页面

至少提供以下管理能力：

- 系统新增、编辑、删除
- 负责人选择
- 页面、后端、数据开发人员配置
- 线上地址、测试地址配置和重新检测
- 多角色账号新增、编辑、启用/停用、删除
- 人员新增、编辑、删除
- Excel 模板下载、系统数据导入和导出
- 退出登录

账号安全要求：

- 密码输入框必须使用 `type="password"`。
- 编辑账号时密码留空表示不修改密码。
- 后端不会返回密码或密码密文，前端不得尝试回填原密码。
- 密码只能通过 HTTPS 提交；生产环境禁止使用明文 HTTP。

## 3. 字段字典

### 3.1 系统状态

| API 值        | 中文显示 |
| ------------- | -------- |
| `normal`      | 正常     |
| `maintenance` | 维护     |
| `closed`      | 已关闭   |

### 3.2 地址类型

| API 值   | 中文显示 |
| -------- | -------- |
| `online` | 线上地址 |
| `test`   | 测试地址 |

线上地址和测试地址都可以有多个。

### 3.3 地址检测状态

| API 值      | 中文显示 | 建议表现 |
| ----------- | -------- | -------- |
| `unknown`   | 未检测   | 中性状态 |
| `healthy`   | 正常     | 成功状态 |
| `unhealthy` | 异常     | 错误状态 |

### 3.4 开发类型

| API 值    | 中文显示 |
| --------- | -------- |
| `page`    | 页面     |
| `backend` | 后端     |
| `data`    | 数据     |

## 4. 通用响应结构

### 4.1 错误响应

```json
{
  "error": "invalid_input",
  "message": "系统状态无效"
}
```

| HTTP 状态 | `error`          | 前端处理                       |
| --------- | ---------------- | ------------------------------ |
| `400`     | `invalid_input`  | 展示字段或表单错误             |
| `401`     | `unauthorized`   | 清除 JWT 并跳转登录页          |
| `404`     | `not_found`      | 提示数据不存在并刷新列表       |
| `409`     | `conflict`       | 提示名称或角色等数据重复       |
| `423`     | `account_locked` | 提示账号已封禁，15 分钟后重试  |
| `429`     | `rate_limited`   | 禁止重复检测并稍后重试         |
| `500`     | `internal_error` | 展示通用错误，不显示服务端细节 |

### 4.2 删除响应

删除和注销成功均返回 `204 No Content`，前端不要尝试解析 JSON。

## 5. 认证接口

### 5.1 管理员登录

```http
POST /api/auth/login
```

请求：

```json
{
  "username": "admin",
  "password": "administrator-password"
}
```

成功响应：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "user": {
    "id": 1,
    "username": "admin",
    "display_name": "管理员"
  }
}
```

管理员密码只以 Argon2id 哈希保存。前端无法也不应获取密码哈希。

### 5.2 退出登录

```http
POST /api/admin/auth/logout
Authorization: Bearer <access_token>
```

成功返回 `204`。后端会删除 Redis 会话并在 MySQL 中标记撤销，现有 JWT 立即失效。

## 6. 展示接口

### 6.1 获取系统列表

```http
GET /api/systems
```

成功响应：

```json
[
  {
    "id": 1,
    "name": "订单系统",
    "sort_order": 10,
    "colorful_border": true,
    "lifecycle_status": "normal",
    "owner_id": 10,
    "description": "订单管理系统",
    "created_at": "2026-07-20T18:00:00.000",
    "updated_at": "2026-07-20T18:00:00.000",
    "owner": {
      "id": 10,
      "name": "负责人"
    },
    "developers": [
      {
        "person": {
          "id": 11,
          "name": "开发人员"
        },
        "developer_type": "backend"
      }
    ],
    "endpoints": [
      {
        "id": 20,
        "system_id": 1,
        "endpoint_type": "online",
        "url": "https://example.com",
        "requires_vpn": true,
        "is_internal_network": true,
        "is_public_network": false,
        "remark": "生产环境入口",
        "check_status": "healthy",
        "last_http_status": 200,
        "last_response_time_ms": 83,
        "last_checked_at": "2026-07-20T18:10:00.000",
        "last_error": null,
        "created_at": "2026-07-20T18:00:00.000",
        "updated_at": "2026-07-20T18:10:00.000"
      }
    ]
  }
]
```

该接口不会查询 `system_accounts`，响应中不会出现账号密码。列表按 `sort_order` 升序返回；排序值相同时按系统名称和 ID 升序返回。

### 6.2 获取系统详情

```http
GET /api/systems/{id}
```

响应对象结构与列表中的单个系统一致。

### 6.3 查看当前地址账号密码

```http
POST /api/endpoints/{endpoint_id}/accounts/reveal
```

鉴权优先级由前端按以下顺序选择，不要同时发送多种凭证：

1. 已登录管理员：请求头传 `Authorization: Bearer <access_token>`，请求体传 `{}`。
2. 未登录但已有临时令牌：请求头传 `X-Credential-Reveal-Token: <token>`，请求体传 `{}`。
3. 首次查看或临时令牌已失效：请求体传管理员账号密码。

首次验证请求：

```json
{
  "username": "admin",
  "password": "administrator-password"
}
```

首次验证成功响应头：

```http
X-Credential-Reveal-Token: <random-token>
X-Credential-Reveal-Expires-In: 1800
```

前端收到响应后记录绝对过期时间：

```ts
const token = response.headers.get("X-Credential-Reveal-Token");
const expiresIn = Number(
  response.headers.get("X-Credential-Reveal-Expires-In") ?? "0",
);

if (token && expiresIn > 0) {
  sessionStorage.setItem("credentialRevealToken", token);
  sessionStorage.setItem(
    "credentialRevealExpiresAt",
    String(Date.now() + expiresIn * 1000),
  );
}
```

再次查看其他地址：

```http
POST /api/endpoints/{endpoint_id}/accounts/reveal
X-Credential-Reveal-Token: <token>
Content-Type: application/json

{}
```

成功响应：

```json
[
  {
    "id": 30,
    "endpoint_id": 20,
    "role_name": "管理员",
    "account_name": "system-admin",
    "password": "external-system-password",
    "remark": "生产管理员账号"
  }
]
```

接口只返回当前地址下的已启用账号。`endpoint_id` 必须来自用户点击的地址对象，禁止传系统 ID。响应设置为不可缓存，前端仍必须在弹窗关闭、地址切换或 60 秒超时后主动清除账号密码响应对象。

临时令牌固定 30 分钟过期，每次使用不会延长时间，并且只允许调用此查看接口。使用临时令牌收到 `401` 时，立即清除 `credentialRevealToken` 和 `credentialRevealExpiresAt`，然后打开验证弹窗；不要自动重放管理员原始密码。使用 JWT 收到 `401` 时，按统一登录失效流程处理。页面初始化时如果本地过期时间已到，也要先清除临时令牌。

### 6.4 重新检测地址

```http
POST /api/endpoints/{endpoint_id}/check
```

请求无 Body。成功返回更新后的地址对象。后端限制同一地址 10 秒内只能检测一次；请求超时为 5 秒。

## 7. 系统管理接口

以下接口均需要 JWT。

### 7.1 获取管理系统列表和详情

```http
GET /api/admin/systems
GET /api/admin/systems/{id}
```

响应与公开系统接口一致，同样不包含账号密码。账号元数据通过独立账号接口获取。

### 7.2 新增系统

```http
POST /api/admin/systems
```

请求：

```json
{
  "name": "订单系统",
  "sort_order": 10,
  "colorful_border": true,
  "lifecycle_status": "normal",
  "owner_id": 10,
  "description": "订单管理系统"
}
```

`sort_order` 为非负整数，数值越小展示越靠前；`colorful_border` 控制是否显示炫彩重点边框。两个字段省略时分别默认为 `0` 和 `false`。`owner_id`、`description` 可以为 `null`。成功返回 `201` 和完整系统对象。

### 7.3 更新和删除系统

```http
PUT /api/admin/systems/{id}
DELETE /api/admin/systems/{id}
```

更新请求与新增请求相同，成功返回更新后的系统对象。删除系统会级联删除地址、账号和开发人员关系。

## 8. 人员管理接口

### 8.1 查询人员

```http
GET /api/admin/people
```

响应：

```json
[
  {
    "id": 10,
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800000000",
    "created_at": "2026-07-20T18:00:00.000",
    "updated_at": "2026-07-20T18:00:00.000"
  }
]
```

### 8.2 新增或更新人员

```http
POST /api/admin/people
PUT /api/admin/people/{id}
```

请求：

```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800000000"
}
```

`email`、`phone` 可以为 `null`。新增成功返回 `201`，更新成功返回 `200`。

### 8.3 删除人员

```http
DELETE /api/admin/people/{id}
```

人员仍被系统或开发关系引用时可能删除失败，前端应提示先解除关联。

## 9. 开发人员配置接口

```http
PUT /api/admin/systems/{id}/developers
```

该接口为全量覆盖，前端必须提交当前系统完整的开发人员列表：

```json
[
  {
    "person_id": 11,
    "developer_type": "page"
  },
  {
    "person_id": 12,
    "developer_type": "backend"
  },
  {
    "person_id": 13,
    "developer_type": "data"
  }
]
```

提交空数组表示清空全部开发人员。成功返回更新后的完整系统对象。

## 10. 系统账号接口

### 10.1 查询账号元数据

```http
GET /api/admin/systems/{id}/accounts
```

响应：

```json
[
  {
    "id": 30,
    "system_id": 1,
    "endpoint_id": 20,
    "role_name": "管理员",
    "account_name": "system-admin",
    "is_enabled": true,
    "remark": "生产管理员账号",
    "created_at": "2026-07-20T18:00:00.000",
    "updated_at": "2026-07-20T18:00:00.000"
  }
]
```

响应中永远没有 `password` 或 `password_ciphertext`。

### 10.2 新增账号

```http
POST /api/admin/systems/{id}/accounts
```

请求：

```json
{
  "endpoint_id": 20,
  "role_name": "管理员",
  "account_name": "system-admin",
  "password": "external-system-password",
  "is_enabled": true,
  "remark": "生产管理员账号"
}
```

`is_enabled` 省略时默认为 `true`。后端使用 AES-256-GCM 加密后保存，成功返回 `201` 和不含密码的账号元数据。

### 10.3 更新账号

```http
PUT /api/admin/systems/{system_id}/accounts/{account_id}
```

请求：

```json
{
  "endpoint_id": 20,
  "role_name": "管理员",
  "account_name": "system-admin",
  "password": null,
  "is_enabled": true,
  "remark": "生产管理员账号"
}
```

- `password: null`：保留原密码。
- `password: "new-password"`：使用新随机 nonce 重新加密后覆盖。

### 10.4 删除账号

```http
DELETE /api/admin/systems/{system_id}/accounts/{account_id}
```

成功返回 `204`。

## 11. 地址管理接口

### 11.1 新增或更新地址

```http
POST /api/admin/systems/{id}/endpoints
```

请求：

```json
{
  "endpoint_type": "online",
  "url": "https://example.com",
  "requires_vpn": true,
  "is_internal_network": true,
  "is_public_network": false,
  "remark": "生产环境入口"
}
```

- 只允许 `http` 或 `https` URL。
- 新增时不传 `endpoint_id`，每次都会创建一条新地址。
- 编辑时传当前地址的 `endpoint_id`，后端只更新该地址；线上和测试地址均可配置多条，编辑时必须传该字段。
- `requires_vpn`、`is_internal_network`、`is_public_network` 是三个独立布尔属性，分别表示需要 VPN、公司内网、公网；它们与地址类型无关。
- VPN、公司内网、公网和备注均属于当前地址，不属于整个系统。
- 删除地址会同时删除关联账号，前端必须明确提示并二次确认。
- 保存成功后后端立即请求一次该地址，并返回包含检测结果的地址对象。
- 前端提交后应保持按钮加载状态，因为请求最长可能等待约 5 秒。

### 11.2 删除地址

```http
DELETE /api/admin/systems/{system_id}/endpoints/{endpoint_id}
```

成功返回 `204`。

## 12. 前端验收标准

- 未登录访问管理页面时跳转登录页。
- 登录后刷新当前标签页仍可保持登录。
- JWT 过期、注销或 Redis 会话不存在时自动退出。
- 展示页面的普通列表和详情请求、持久化状态中均不存在密码字段。
- 展示页只有二次认证弹窗的临时内存状态可以持有明文密码，关闭或超时后必须清除。
- 管理账号列表无法看到原密码、密文或管理员密码哈希。
- 新增和修改地址后能看到自动检测结果。
- 点击重新检测时有加载、成功、失败和限频反馈。
- 系统状态、开发类型、地址类型均使用本文档规定的 API 值。
- 所有删除操作在前端二次确认。
- 所有 `204` 响应均不执行 JSON 解析。
- 导入功能使用 `multipart/form-data` 的 `file` 字段，限制 `.xlsx` 文件且前端限制文件大小不超过 10 MB。
- 下载模板中的状态、是/否、地址类型和开发类型为固定下拉；系统名称和人员标识为动态关联下拉。新版 Excel 支持输入关键字搜索，旧版 Excel 可能只能展开选择。
- 前端文件类型检查只用于改善体验，不能代替后端安全校验；不要尝试在浏览器执行工作簿宏、公式或外部链接。
- 导入前提示会覆盖/新增系统数据，导入失败时展示后端返回的 Sheet、行号和中文错误信息。
- 导入成功后刷新系统列表；地址检测结果可在稍后自动更新。
- 导出文件不包含任何外部系统密码，账号 Sheet 的密码列为空属于正常安全行为。
