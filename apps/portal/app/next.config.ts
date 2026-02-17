import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的HTMLエクスポート（nginx で配信）
  output: "export",

  // /fee-table/ → fee-table/index.html として生成（nginx ディレクトリ配信対応）
  trailingSlash: true,

  // next/image: export モードでは unoptimized 必須
  images: { unoptimized: true },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // セキュリティヘッダーは nginx ゲートウェイで設定済み
};

export default nextConfig;
