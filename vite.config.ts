import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

// 后端 entitlement-api-new 默认监听 3000 端口；开发期通过代理避免 CORS。
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

/** 需要转发给后端的接口前缀。 */
const API_PREFIXES = ['/auth', '/licensing', '/billing'] as const;

/**
 * 后端没启动时，代理只会回一个空体的 500，前端无从判断原因。
 * 这里把真实原因（通常是 ECONNREFUSED）打到终端，并带上目标地址。
 */
const proxyToBackend: ProxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on('error', (error) => {
      // 连接类错误常是 AggregateError：message 为空，原因在 code 上。
      const reason =
        error.message || (error as NodeJS.ErrnoException).code || error.name;
      console.error(
        `\n[vite] 代理请求失败：无法连接后端 ${API_TARGET}（${reason}）\n` +
          '  → 请确认后端已启动（entitlement-api-new: npm run dev:http），' +
          '或用 VITE_API_TARGET 指定地址。\n',
      );
    });
  },
};

/** 开发与预览使用同一份代理规则，避免预览时接口无处转发。 */
const apiProxy: Record<string, ProxyOptions> = Object.fromEntries(
  API_PREFIXES.map((prefix) => [prefix, proxyToBackend]),
);

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
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
