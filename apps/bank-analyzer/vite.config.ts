import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 並行稼働の間の仮のパス。切り替え（段階7）で '/bank-analyzer/' に戻す。
  // server/app.ts の BASE_PATH と必ずそろえること。
  base: '/bank-analyzer-next/',
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
    port: 3008,
    host: true,
    // Windows の bind mount(Windows→WSL2) はコンテナ内の inotify にイベントを届けないことがあり、
    // Vite が変更に気付かないまま古いモジュールを返し続ける。dev サーバ専用の設定。
    watch: {
      usePolling: true,
      interval: 300,
      binaryInterval: 1000,
    },
    proxy: {
      // 開発時は Vite が 3008、API サーバが 3108（同一コンテナ内）。
      // 本番は dist ごと API サーバが 3008 で配信するのでプロキシは使わない。
      '/bank-analyzer-next/api': 'http://127.0.0.1:3108',
    },
  },
});
