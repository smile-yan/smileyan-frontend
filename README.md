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

开发环境会将 `/api` 请求代理到后端服务 `http://localhost:8080`。

可在 [vite.config.js](vite.config.js) 中修改代理配置。

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