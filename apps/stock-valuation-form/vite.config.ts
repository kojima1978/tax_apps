import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/stock-valuation-form/',
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
    port: 3014,
    host: true,
    // Windows の bind mount(Windows→WSL2) はコンテナ内の inotify にイベントを届けないことがあり、
    // Vite が変更に気付かないまま古いモジュールを返し続ける（304 になるのでブラウザ側も更新されない）。
    // dev サーバ専用の設定なので本番ビルドには影響しない。
    watch: {
      usePolling: true,
      interval: 300,
      binaryInterval: 1000,
    },
    proxy: {
      // 開発時は Vite が 3014、API サーバが 3114（同一コンテナ内）。
      // 本番は dist ごと API サーバが 3014 で配信するのでプロキシは使わない。
      '/stock-valuation-form/api': 'http://127.0.0.1:3114',
    },
  },
});
