import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // server/app.ts の BASE_PATH と必ずそろえること（フロントのパスは全部ここから来る）。
  base: '/bank-analyzer/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3007,
    host: true,
    // Windows の bind mount(Windows→WSL2) はコンテナ内の inotify にイベントを届けないことがあり、
    // Vite が変更に気付かないまま古いモジュールを返し続ける。dev サーバ専用の設定。
    watch: {
      usePolling: true,
      interval: 300,
      binaryInterval: 1000,
    },
    proxy: {
      // 開発時は Vite が 3007、API サーバが 3107（同一コンテナ内）。
      // 本番は dist ごと API サーバが 3007 で配信するのでプロキシは使わない。
      '/bank-analyzer/api': 'http://127.0.0.1:3107',
    },
  },
});
