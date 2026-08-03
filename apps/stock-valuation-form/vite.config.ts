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
    proxy: {
      // 開発時は Vite が 3014、API サーバが 3114（同一コンテナ内）。
      // 本番は dist ごと API サーバが 3014 で配信するのでプロキシは使わない。
      '/stock-valuation-form/api': 'http://127.0.0.1:3114',
    },
  },
});
