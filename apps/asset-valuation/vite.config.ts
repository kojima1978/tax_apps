import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/asset-valuation/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // xlsx-js-style is isolated and loaded only when Excel export is requested.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          xlsx: ['xlsx-js-style'],
        },
      },
    },
  },
  server: {
    port: 3017,
    host: true,
  },
});
