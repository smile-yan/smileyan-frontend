import axios from 'axios'

// 不设置 baseURL，请求相对路径
// 开发环境：Vite proxy 代理到 localhost:8080
// 生产环境：Nginx/Caddy 反向代理
axios.defaults.timeout = 30000

export default axios