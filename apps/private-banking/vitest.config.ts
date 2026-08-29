import path from "node:path";
import { defineConfig } from "vitest/config";

// 評価計算・検索正規化などのロジック単体テストと、コンポーネントの描画テスト用の設定。
// Next.js のビルドは通さないので、tsconfig の '@' エイリアスだけここで解決する。
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // tsconfig の jsx は Next.js 用に "preserve" なので、テスト側では esbuild に変換させる。
  esbuild: { jsx: "automatic" },
  test: {
    // 既定は node のまま。DOM が要るテストだけ先頭の `@vitest-environment jsdom` で切り替える
    // （大半を占めるロジックテストに jsdom の初期化コストを払わせないため）。
    environment: "node",
    include: ["src/**/__tests__/*.test.{ts,tsx}"],
  },
});
