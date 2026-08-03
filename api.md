# HTTP API

管理接口使用 JWT Bearer 认证：

```http
Authorization: Bearer <access_token>
```

## 公开接口

| 方法     | 路径                                   | 用途                               |
| -------- | -------------------------------------- | ---------------------------------- |
| `GET`  | `/health/live`                       | 进程存活检查                       |
| `GET`  | `/health/ready`                      | MySQL 与 Redis 就绪检查            |
| `POST` | `/api/auth/login`                    | 管理员登录并获取 JWT               |
| `GET`  | `/api/systems`                       | 展示全部系统，不查询系统账号表     |
| `GET`  | `/api/systems/{id}`                  | 展示系统详情，不返回密码           |
| `POST` | `/api/endpoints/{endpoint_id}/accounts/reveal` | 验证管理员或使用已有授权查看当前地址账号密码 |
| `POST` | `/api/endpoints/{endpoint_id}/check` | 重新检测地址，Redis 限制 10 秒一次 |

登录请求：

```json
{
  "username": "admin",
  "password": "replace_with_a_strong_initial_password"
}
```

管理员连续 5 次验证失败后，账号会在 MySQL 中封禁 15 分钟。登录和未登录查看系统密码使用相同的失败次数；封禁期间返回 `423 Locked`：

```json
{
  "error": "account_locked",
  "message": "密码错误次数过多，账号已封禁，请在15分钟后重试"
}
```

## 管理接口

| 方法               | 路径                                                       | 用途                         |
| ------------------ | ---------------------------------------------------------- | ---------------------------- |
| `POST`           | `/api/admin/auth/logout`                                 | 注销并立即撤销 Redis 会话    |
| `GET/POST`       | `/api/admin/systems`                                     | 查询、新增系统               |
| `GET/PUT/DELETE` | `/api/admin/systems/{id}`                                | 系统详情、更新、删除         |
| `PUT`            | `/api/admin/systems/{id}/developers`                     | 全量更新开发人员关系         |
| `GET/POST`       | `/api/admin/systems/{id}/accounts`                       | 查询账号元数据、新增加密账号 |
| `PUT/DELETE`     | `/api/admin/systems/{system_id}/accounts/{account_id}`   | 更新、删除账号               |
| `POST`           | `/api/admin/systems/{id}/endpoints`                      | 新增或更新地址并立即检测     |
| `DELETE`         | `/api/admin/systems/{system_id}/endpoints/{endpoint_id}` | 删除地址                     |
| `GET/POST`       | `/api/admin/people`                                      | 查询、新增人员               |
| `PUT/DELETE`     | `/api/admin/people/{id}`                                 | 更新、删除人员               |
| `GET`             | `/api/admin/import/template`                             | 下载多 Sheet 导入模板        |
| `POST`            | `/api/admin/import`                                      | 上传 Excel 并事务导入        |
| `GET`             | `/api/admin/export`                                      | 导出当前系统数据             |

系统账号的创建请求包含明文 `password`，只允许通过 HTTPS 发送。服务收到后立即使用 AES-256-GCM 加密，查询账号接口只返回账号、角色和启用状态，永不返回密文或明文密码。

## 查看当前地址账号密码

```http
POST /api/endpoints/{endpoint_id}/accounts/reveal
Content-Type: application/json
```

未登录且尚未验证时，请求体传管理员账号密码：

```json
{
  "username": "admin",
  "password": "administrator-password"
}
```

首次验证成功后，响应头会返回一个只用于查看账号密码的临时令牌：

```http
X-Credential-Reveal-Token: <random-token>
X-Credential-Reveal-Expires-In: 1800
```

30 分钟内查看其他地址时，请求头携带该令牌，请求体传空对象：

```http
POST /api/endpoints/{endpoint_id}/accounts/reveal
X-Credential-Reveal-Token: <random-token>
Content-Type: application/json

{}
```

已登录管理员直接使用登录接口返回的 JWT，不需要再次输入账号密码，也不需要临时令牌：

```http
POST /api/endpoints/{endpoint_id}/accounts/reveal
Authorization: Bearer <access_token>
Content-Type: application/json

{}
```

路径参数必须传递用户点击的地址 `endpoint_id`。成功响应只包含该地址下已启用的账号，不会返回同一系统其他地址的账号：

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

- 临时令牌为 256 位随机值，只能调用账号密码查看接口，不能访问管理接口；Redis 只保存其 SHA-256 哈希，固定 30 分钟过期且使用时不续期。
- 临时令牌对应的管理员被停用后立即失效。令牌过期或无效时返回 `401`，前端应清除令牌并重新显示管理员验证弹窗。
- 管理员 JWT 仍使用已有 Redis 登录会话校验；已注销、已过期或已撤销的 JWT 不能查看密码。
- 此接口不会为临时验证签发 JWT，也不会改变当前登录状态。
- 连续失败超过 5 次后，Redis 限制该管理员用户名 5 分钟。
- 响应包含 `Cache-Control: no-store` 和 `Pragma: no-cache`。
- 浏览器可读取 `X-Credential-Reveal-Token` 和 `X-Credential-Reveal-Expires-In` 响应头。
- 返回内容不写入日志，日志只记录管理员 ID、系统 ID、地址 ID 和账号数量。
- 只能通过 HTTPS 调用，前端不得持久化管理员原始密码或返回的系统密码。临时令牌最多保存到当前标签页的 `sessionStorage`，禁止写入 `localStorage`、URL、日志或埋点。

## 状态值

- 系统：`maintenance`、`normal`、`closed`
- 地址类型：`online`、`test`
- 地址检测：`unknown`、`healthy`、`unhealthy`
- 开发类型：`page`、`backend`、`data`

## Excel 导入导出

### 下载模板

```http
GET /api/admin/import/template
Authorization: Bearer <access_token>
```

返回 `systems-import-template.xlsx`，包含 5 个 Sheet：

- `系统信息`：系统名称、状态、排序值、炫彩重点边框、负责人、描述
- `系统地址`：线上/测试地址、VPN、内网、公网、网址备注
- `系统账号`：系统名称、地址类型、地址、角色、账号、原始密码、启用状态、账号备注
- `人员信息`：人员标识、姓名、邮箱、电话
- `开发人员`：系统、人员标识、页面/后端/数据类型

模板已为以下字段配置数据验证下拉：

- 系统信息：系统状态、炫彩重点边框、负责人标识
- 系统地址：系统名称、地址类型、需要VPN、公司内网、公网
- 系统账号：系统名称、地址类型、是否启用
- 开发人员：系统名称、人员标识、开发类型

系统名称下拉动态引用“系统信息”，人员标识下拉动态引用“人员信息”，新增主数据后关联 Sheet 会自动使用新值。Microsoft 365 和新版 Excel 支持在数据验证下拉中输入关键字自动匹配；旧版 Excel 可以展开选择，但可能不支持搜索过滤。

### 导入

```http
POST /api/admin/import
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

文件字段名必须为 `file`，只支持 `.xlsx`，最大 10 MB。导入过程会先校验所有 Sheet 和引用关系，然后在一个 MySQL 事务中写入；任一错误会全部回滚。地址写入事务提交后自动检测，检测失败只标记地址异常，不回滚基础数据。

文件安全检查包括：

- 校验文件名、MIME 和 ZIP/XLSX 文件签名，不只依赖扩展名
- XLSX 内部条目最多 2000 个
- 单个解压条目不超过 20 MB，解压后总大小不超过 50 MB
- 拒绝路径穿越、重复路径和符号链接条目
- 拒绝 VBA 宏、ActiveX、OLE/嵌入对象、外部链接和自定义 XML
- 只允许模板规定的 5 个 Sheet，不允许额外隐藏 Sheet
- 所有 Sheet 禁止使用公式
- 文件仅在内存中处理，不使用客户端文件名写入服务器磁盘

成功响应：

```json
{
  "systems": 1,
  "endpoints": 2,
  "accounts": 2,
  "people": 3,
  "developers": 3
}
```

导入的账号密码会立即使用 AES-256-GCM 加密，Excel 临时内容不写入日志。

### 导出

```http
GET /api/admin/export
Authorization: Bearer <access_token>
```

返回 `systems-export-YYYYMMDD.xlsx`，结构与模板一致。出于安全要求，导出文件的“原始密码”列始终为空，不会解密或导出外部系统密码；导出的账号记录不能直接作为完整账号导入文件使用，重新导入前必须补填密码。
