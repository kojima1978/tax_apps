import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/private-banking",
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    // 開発用ディスクキャッシュは、書き込み中の中断（PC のスリープ、Docker Desktop の
    // 停止など）で壊れると、存在しない .sst を参照し続けて全リクエストが 500 になる。
    // 起動時の初期化では実行中の破損を防げないので、キャッシュはメモリ上だけにする。
    turbopackFileSystemCacheForDev: false,
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
