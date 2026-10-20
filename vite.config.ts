import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 后端 entitlement-api-new 默认监听 3000 端口；开发期通过代理避免 CORS。
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/pro-components', '@ant-design/icons'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: API_TARGET, changeOrigin: true },
      '/licensing': { target: API_TARGET, changeOrigin: true },
      // 仅代理后端路径：`/subscriptions` 是前端路由，不能被前缀匹配吞掉。
      '^/subscription/': { target: API_TARGET, changeOrigin: true },
      '/billing': { target: API_TARGET, changeOrigin: true },
    },
  },
});
