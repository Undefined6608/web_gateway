# 多系统集成网关

面向企业内部运维与研发人员的系统服务目录和管理控制台。项目将分散在不同系统、环境与文档中的访问入口、负责人、开发人员、账号和可用性信息集中管理，帮助使用者快速找到正确的系统地址，并让管理员在统一界面完成配置维护。

> 本仓库为网关的 Web 前端，需要配合实现了约定 HTTP API 的后端服务使用。接口定义见 [api.md](./api.md)，完整前端对接约定见 [frontend-integration-requirements.md](./frontend-integration-requirements.md)。

## 主要功能

### 系统服务目录

- 按名称搜索系统，并按正常、维护、已关闭状态筛选
- 展示系统负责人以及页面、后端、数据开发人员
- 区分线上地址与测试地址，标记 VPN、公司内网和公网访问条件
- 展示地址最近一次检测状态、HTTP 状态码、响应耗时和检测时间
- 支持手动重新检测指定地址，并在新窗口打开系统入口
- 经管理员验证后，临时查看当前地址下已启用的账号密码

### 管理控制台

- 管理员登录、会话校验和安全退出
- 新增、编辑、删除系统，维护负责人和生命周期状态
- 配置系统地址、访问条件及地址可用性检测
- 配置页面、后端、数据开发人员关系
- 新增、编辑、启用、停用和删除系统账号
- 统一维护人员及联系方式
- 下载 Excel 模板，批量导入或导出系统数据

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | React 19、TypeScript 6 |
| 构建工具 | Vite 8 |
| UI 与样式 | Ant Design 6、Tailwind CSS 4、Sass |
| 路由 | React Router 7 |
| HTTP 客户端 | Axios、Fetch API |
| 工程质量 | ESLint、Prettier |

## 快速开始

### 环境要求

- Node.js `20.19+` 或 `22.12+`，推荐使用当前 LTS 版本
- npm 10+
- 可访问的后端网关服务；本地开发默认地址为 `http://127.0.0.1:8001`

### 安装与启动

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:8089/system-gateway/
```

开发服务器会将 `/system-gateway/api` 和 `/system-gateway/health` 请求代理到后端，因此后端无需额外开启跨域。

## 环境配置

项目通过根目录下的 `.env` 文件读取运行配置：

```dotenv
# 应用部署子路径，必须与反向代理和静态资源路径一致
APP_BASE_PATH=/system-gateway/

# 本地开发时的后端代理目标
API_PROXY_TARGET=http://127.0.0.1:8001

# Vite 开发服务器监听地址与端口
DEV_HOST=0.0.0.0
DEV_PORT=8089
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_BASE_PATH` | `/system-gateway/` | 应用基础路径；配置会自动补齐首尾 `/` |
| `API_PROXY_TARGET` | `http://127.0.0.1:8001` | 仅用于开发服务器的 API 与健康检查代理 |
| `DEV_HOST` | `0.0.0.0` | 开发服务器监听地址 |
| `DEV_PORT` | `8089` | 开发服务器端口 |
| `VITE_API_BASE_URL` | 当前应用基础路径 | 可选的浏览器端 API 基础地址；跨域部署时需由后端提供 CORS 支持 |

修改 `APP_BASE_PATH` 后需要重启开发服务器或重新构建。若应用部署在域名根路径，可设置为 `/`。

## 页面路由

以下路径均相对于 `APP_BASE_PATH`：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 系统服务目录 | 搜索系统、查看地址与检测状态 |
| `/login` | 管理员登录 | 获取管理会话 |
| `/admin/systems` | 系统管理 | 维护系统、地址、开发人员与账号 |
| `/admin/people` | 人员管理 | 维护负责人和开发人员信息 |

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 执行 TypeScript 检查并生成生产构建
npm run build

# 检查代码规范
npm run lint

# 本地预览生产构建
npm run preview
```

生产构建文件输出到 `dist/`。

## 项目结构

```text
multi_system_integrated_gateway/
├─ public/                         # 无需构建处理的公共资源
├─ src/
│  ├─ assets/                     # 图片等静态资源
│  ├─ components/
│  │  ├─ admin/                   # 系统、地址、账号和人员管理组件
│  │  ├─ common/                  # 品牌、页面框架和加载状态组件
│  │  └─ systems/                 # 公开目录的系统与地址组件
│  ├─ config/                     # 基础路径、主题和状态元数据
│  ├─ layouts/                    # 管理控制台布局
│  ├─ pages/                      # 公开目录、登录及管理页面
│  ├─ services/                   # API、认证及数据导入导出服务
│  ├─ types/                      # API 数据类型
│  ├─ App.tsx                     # 路由入口
│  └─ main.tsx                    # React 应用入口
├─ api.md                         # 后端 HTTP API 说明
├─ frontend-integration-requirements.md
├─ PRODUCT.md                     # 产品目标与设计原则
└─ vite.config.ts                 # 构建、基础路径与开发代理配置
```

## 后端接口约定

前端主要使用以下接口组：

- `/api/systems`：公开系统目录
- `/api/endpoints/{id}/check`：地址可用性检测
- `/api/endpoints/{id}/accounts/reveal`：经授权临时查看指定地址账号
- `/api/auth/login`：管理员登录
- `/api/admin/**`：系统、人员、地址、账号及开发关系管理
- `/api/admin/import`、`/api/admin/export`：Excel 数据导入导出
- `/health/live`、`/health/ready`：后端存活与就绪检查

管理接口使用 JWT Bearer Token。当前前端将登录令牌保存在当前标签页的 `sessionStorage` 中；管理接口返回 `401` 后会清除会话并跳转到登录页。

## 构建与部署

```bash
npm run build
```

将 `dist/` 中的文件部署到与 `APP_BASE_PATH` 一致的路径。默认情况下，站点需要满足以下转发关系：

```text
/system-gateway/          -> 前端静态文件与 SPA 路由回退
/system-gateway/api/      -> 后端 /api/
/system-gateway/health/   -> 后端 /health/
```

由于项目使用 `BrowserRouter`，Web 服务器必须将 `/system-gateway/*` 下非静态资源、非 API 的请求回退到 `/system-gateway/index.html`，否则直接刷新管理页面会返回 404。生产环境还应启用 HTTPS，尤其是登录、账号维护和账号查看接口。

## 安全说明

- 管理员登录令牌和临时账号查看令牌仅保存在当前标签页的 `sessionStorage`，不写入 `localStorage`
- 管理员原始密码不会持久化；临时验证不会创建管理登录会话
- 外部系统明文密码只在用户主动授权后短暂展示，关闭弹窗、离开页面或 60 秒超时后清除
- 账号密码不会写入浏览器持久化存储、URL、前端日志或埋点
- Excel 导出不会包含外部系统密码，重新导入账号前需要补填密码
- 生产环境必须通过 HTTPS 传输登录凭据和系统账号密码

## 相关文档

- [产品说明](./PRODUCT.md)
- [HTTP API 文档](./api.md)
- [前端对接需求](./frontend-integration-requirements.md)
