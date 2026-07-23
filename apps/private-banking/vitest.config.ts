import path from "node:path";
import { defineConfig } from "vitest/config";

// 評価計算・検索正規化などのロジック単体テスト用設定。
// Next.js のビルドは通さないので、tsconfig の '@' エイリアスだけここで解決する。
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/*.test.ts"],
  },
});
