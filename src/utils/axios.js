import axios from 'axios'

// 从环境变量读取 API 基础路径
// - 开发环境：VITE_API_BASE_URL 留空，相对路径经 Vite proxy 转发到 localhost:8080
// - 生产环境：VITE_API_BASE_URL=/api，相对路径由 Nginx/Caddy 反向代理转发
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''
axios.defaults.timeout = 30000

export default axios