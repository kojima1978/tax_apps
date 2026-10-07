import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    // DB を伴うテスト用の PostgreSQL を1つ立てる（各ファイルはその複製を使う）
    globalSetup: ['./server/__tests__/setup/postgres.ts'],
  },
});
