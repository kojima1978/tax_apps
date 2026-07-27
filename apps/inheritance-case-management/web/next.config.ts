import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/itcm',
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // compose watch の sync は Docker デーモンがオーバーレイの上位層へ直接書き込むため、
  // コンテナ内の inotify にイベントが届かない。Turbopack の watcher を
  // ポーリングに切り替える（Next 16 が hot-reloader-turbopack 経由で
  // native watcher に渡すノブ。WATCHPACK_POLLING はこちらには効かない）。
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
