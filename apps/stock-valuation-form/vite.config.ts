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
    // 同じ Docker ネットワークの他コンテナ（MCP サーバー）がサービス名で叩くため。
    // Vite の既定はブラウザからの DNS リバインディング対策で localhost 以外の Host を
    // 403 で弾くので、このコンテナ自身の名前だけを通す。ゲートウェイ経由の
    // アクセスは Host がブラウザ側のもの（localhost）になるため元から通っている。
    // 本番は Node が直接配信するのでこの経路自体が無い（dev サーバ専用の設定）。
    allowedHosts: ['stock-valuation-form'],
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
