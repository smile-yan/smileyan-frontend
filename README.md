# Smileyan Blog Frontend

基于 Vue 3 + Element Plus 构建的博客系统前端。

## 技术栈

- **Vue 3** - 渐进式前端框架
- **Vite** - 下一代构建工具
- **Vue Router** - 路由管理
- **Pinia** - 状态管理
- **Element Plus** - UI 组件库
- **Axios** - HTTP 客户端
- **Markdown-it** - Markdown 解析
- **highlight.js** - 代码高亮

## 项目结构

```
src/
├── main.js          # 应用入口
├── App.vue          # 根组件
├── router/         # 路由配置
│   └── index.js
├── store/          # 状态管理
│   └── user.js
└── views/          # 页面组件
    ├── Home.vue        # 首页
    ├── Post.vue       # 文章详情
    ├── Page.vue       # 页面
    ├── Admin.vue      # 管理后台
    ├── AdminPosts.vue      # 文章管理
    ├── AdminComments.vue  # 评论管理
    ├── AdminCategories.vue # 分类管理
    ├── AdminTags.vue      # 标签管理
    ├── AdminPages.vue     # 页面管理
    └── AdminSubscriptions.vue  # 订阅管理
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173

### 启动服务

```bash
./bin/start
```

### 重启服务

```bash
./bin/restart
```

### 停止服务

```bash
./bin/stop
```

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## API 代理

开发环境会将 `/api` 请求代理到后端服务（默认 `http://localhost:8080`）。

代理目标可通过环境变量 `BACKEND_TARGET` 配置，无需修改源码（详见下文「环境变量」）。

## 环境变量

后端地址完全由环境变量驱动，开发与生产可指向不同后端。

| 变量名 | 作用域 | 默认值 | 说明 |
|---|---|---|---|
| `BACKEND_TARGET` | 服务端（仅 `vite.config.js`） | `http://localhost:8080` | dev server 把 `/api` 转发到的后端地址 |
| `VITE_API_BASE_URL` | 客户端（axios） | `''`（相对路径） | 浏览器实际发出的请求 baseURL |

### 本地开发

优先级：命令行环境变量 > `.env.{mode}.local` > `.env.{mode}` > 默认值。

```bash
# 1. 直接用 .env.development 中的默认值
npm run dev

# 2. 临时切换后端（不写入文件）
BACKEND_TARGET=http://192.168.1.100:8080 npm run dev

# 3. 本机定制（推荐：不会被 git 追踪）
cat > .env.development.local <<EOF
BACKEND_TARGET=http://staging-server:8080
VITE_API_BASE_URL=
EOF
npm run dev
```

### 生产部署

两种模式，二选一：

**模式 A：服务器反代（推荐）**

保持 `VITE_API_BASE_URL` 留空，dist 中所有请求走相对路径 `/api/...`，由生产服务器的 Nginx / Caddy 反向代理转发到真实后端。**无需重新构建前端即可切换后端。**

Nginx 示例：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**模式 B：前端直连**

希望 dist 直接请求绝对地址时，构建时注入 `VITE_API_BASE_URL`：

1. GitHub 仓库 → **Settings → Secrets and variables → Actions → Variables**
   - 新建 variable `PROD_API_BASE_URL`，值如 `https://api.smileyan.com`
2. 推 tag 触发流水线：
   ```bash
   git tag v1.x.y
   git push origin v1.x.y
   ```
3. 流水线读取 `vars.PROD_API_BASE_URL` 并注入到 `vite build`（见 `.github/workflows/deploy.yml`）。

敏感地址改用 **Secrets**（同样以 `PROD_API_BASE_URL` 为名），优先级：Variables > Secrets > 空字符串。

## 功能特性

- 文章浏览与详情展示
- Markdown 文章渲染与代码高亮
- 管理后台
  - 文章管理
  - 评论管理
  - 分类管理
  - 标签管理
  - 页面管理
  - 订阅管理