import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// 計算関数（calcTable*/calcShareholderJudgment/calcCompanySize）の単体テスト用設定。
// 本体は src の '@' エイリアスを使うため、ここでも解決できるようにする。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
