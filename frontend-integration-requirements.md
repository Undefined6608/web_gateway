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
- 系统状态：维护、正常、已关闭
- 是否需要 VPN
- 是否为公司内部网络
- 系统负责人
- 页面、后端、数据开发人员
- 线上地址、测试地址
- 地址最近检测状态、HTTP 状态码、响应耗时、检测时间和失败原因
- 地址重新检测按钮

交互要求：

- 首次进入页面调用 `GET /api/systems`。
- 地址本身可点击，并使用新窗口打开；外链应设置 `rel="noopener noreferrer"`。
- 点击重新检测后禁用当前按钮并显示加载状态，调用检测接口后只更新对应地址。
- 收到 `429` 时提示操作频繁，至少 10 秒后才允许再次点击。
- `closed` 系统仍可展示，但视觉上应明确标记为已关闭。
- 展示页面不得调用账号管理接口，不得出现密码字段。

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
- 退出登录

账号安全要求：

- 密码输入框必须使用 `type="password"`。
- 编辑账号时密码留空表示不修改密码。
- 后端不会返回密码或密码密文，前端不得尝试回填原密码。
- 密码只能通过 HTTPS 提交；生产环境禁止使用明文 HTTP。

## 3. 字段字典

### 3.1 系统状态

| API 值          | 中文显示 |
| --------------- | -------- |
| `normal`      | 正常     |
| `maintenance` | 维护     |
| `closed`      | 已关闭   |

### 3.2 地址类型

| API 值     | 中文显示 |
| ---------- | -------- |
| `online` | 线上地址 |
| `test`   | 测试地址 |

每个系统的每种地址最多一条。

### 3.3 地址检测状态

| API 值        | 中文显示 | 建议表现 |
| ------------- | -------- | -------- |
| `unknown`   | 未检测   | 中性状态 |
| `healthy`   | 正常     | 成功状态 |
| `unhealthy` | 异常     | 错误状态 |

### 3.4 开发类型

| API 值      | 中文显示 |
| ----------- | -------- |
| `page`    | 页面     |
| `backend` | 后端     |
| `data`    | 数据     |

## 4. 通用响应结构

### 4.1 错误响应

```json
{
  "error": "invalid_input",
  "message": "invalid lifecycle_status"
}
```

| HTTP 状态 | `error`          | 前端处理                       |
| --------- | ------------------ | ------------------------------ |
| `400`   | `invalid_input`  | 展示字段或表单错误             |
| `401`   | `unauthorized`   | 清除 JWT 并跳转登录页          |
| `404`   | `not_found`      | 提示数据不存在并刷新列表       |
| `409`   | `conflict`       | 提示名称或角色等数据重复       |
| `429`   | `rate_limited`   | 禁止重复检测并稍后重试         |
| `500`   | `internal_error` | 展示通用错误，不显示服务端细节 |

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
    "requires_vpn": true,
    "is_internal_network": true,
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

该接口不会查询 `system_accounts`，响应中不会出现账号密码。

### 6.2 获取系统详情

```http
GET /api/systems/{id}
```

响应对象结构与列表中的单个系统一致。

### 6.3 重新检测地址

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
  "requires_vpn": true,
  "is_internal_network": true,
  "lifecycle_status": "normal",
  "owner_id": 10,
  "description": "订单管理系统"
}
```

`owner_id`、`description` 可以为 `null`。成功返回 `201` 和完整系统对象。

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
    "role_name": "管理员",
    "account_name": "system-admin",
    "is_enabled": true,
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
  "role_name": "管理员",
  "account_name": "system-admin",
  "password": "external-system-password",
  "is_enabled": true
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
  "role_name": "管理员",
  "account_name": "system-admin",
  "password": null,
  "is_enabled": true
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
  "url": "https://example.com"
}
```

- 只允许 `http` 或 `https` URL。
- 同一系统、同一地址类型已存在时执行更新。
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
- 展示页面所有请求和状态管理中均不存在密码字段。
- 管理账号列表无法看到原密码、密文或管理员密码哈希。
- 新增和修改地址后能看到自动检测结果。
- 点击重新检测时有加载、成功、失败和限频反馈。
- 系统状态、开发类型、地址类型均使用本文档规定的 API 值。
- 所有删除操作在前端二次确认。
- 所有 `204` 响应均不执行 JSON 解析。
