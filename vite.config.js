import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // 加载所有环境变量（含非 VITE_ 前缀的，仅用于服务端配置，例如 dev server 的 proxy）
  const env = loadEnv(mode, process.cwd(), '')
  // 开发代理目标：dev server 收到 /api 请求时转发到这里
  // 优先级：环境变量/命令行 > .env.{mode}.local > .env.{mode} > 默认值
  const backendTarget = env.BACKEND_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'element-plus': ['element-plus'],
            'vendor': ['vue', 'vue-router', 'pinia', 'axios']
          }
        }
      }
    }
  }
})