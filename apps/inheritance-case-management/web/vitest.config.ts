import path from "node:path";
import { defineConfig } from "vitest/config";

// 見積額・CSV取込・期限計算などのロジック単体テスト用の設定。
// Next.js のビルドは通さないので、tsconfig の '@' エイリアスだけここで解決する。
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // tsconfig の jsx は Next.js 用の "react-jsx"。tsx を足すときに困らないよう揃えておく。
  esbuild: { jsx: "automatic" },
  test: {
    // 対象はいまのところ純粋なロジックだけなので node のまま
    // （DOM が要るテストを足すときは先頭に `@vitest-environment jsdom` を書く）。
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
