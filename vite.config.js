import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      // 匹配所有以 /api 开头的请求
      '/api': {
        // 目标地址：你的后端服务地址（按实际修改，你现在是localhost:8080）
        target: 'http://localhost:8080',
        // 开启跨域，修改请求头Origin
        changeOrigin: true,
        // 路径不重写（你的后端接口是 /api/xxx，保持原样）
        rewrite: path => path
      }
    }
  }
})