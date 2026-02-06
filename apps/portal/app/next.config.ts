import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker standalone出力
  output: "standalone",

  // Prisma関連パッケージ
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],

  // セキュリティヘッダー
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],

  // 画像最適化
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // 開発時のログ抑制
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
