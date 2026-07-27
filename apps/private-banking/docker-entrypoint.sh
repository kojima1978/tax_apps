#!/bin/sh
set -e

if [ "${NODE_ENV:-development}" = "production" ]; then
  case "${POSTGRES_PASSWORD:-}" in
    ""|change-me|pb_dev_password)
      echo "ERROR: A strong POSTGRES_PASSWORD is required in production." >&2
      exit 1
      ;;
  esac
fi

# Prisma CLI の場所を解決する。
# 本番(runner)は同梱した隔離ディレクトリ、開発(dev)は通常の node_modules。
if [ -f /app/prisma-cli/node_modules/prisma/build/index.js ]; then
  PRISMA_CLI=/app/prisma-cli/node_modules/prisma/build/index.js
else
  PRISMA_CLI=/app/node_modules/prisma/build/index.js
fi

node "$PRISMA_CLI" migrate deploy

# 開発モードのみ: 初期スキャン失敗を検知して落とすガード。
#
# Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てる
# (setup-dev-bundler.js の knownFiles)。スキャンが失敗したディレクトリ配下の
# ルートは `Watchpack Error (initial scan)` を1行出すだけで丸ごと欠落し、
# `✓ Ready` のまま該当ルートが 404 を返し続ける。/api/health は無傷なので
# healthcheck も緑のままで、誰かが気づくまで静かに壊れている。
# 検知したら即座に落とし、restart: unless-stopped による再起動に任せる。
#
# 出力を FIFO 経由にするのは、パイプで繋ぐと next の PID が取れないため。
# また next を exec せず子プロセスとして起動する: exec すると next が PID 1 になり、
# PID 1 はハンドラを持たないシグナルを無視する(＝下の kill が効かない)。
# 代わりに docker stop の TERM/INT を trap で明示的に転送する。
if [ "${NODE_ENV:-development}" != "production" ]; then
  scan_guard_fifo=/tmp/next-dev-output
  scan_guard_pidfile=/tmp/next-dev.pid
  rm -f "$scan_guard_fifo" "$scan_guard_pidfile"
  if mkfifo "$scan_guard_fifo" 2>/dev/null; then
    (
      while IFS= read -r line; do
        printf '%s\n' "$line"
        case "$line" in
          *"Watchpack Error (initial scan)"*)
            printf 'FATAL: 初期スキャンに失敗しました。ルート表が不完全なため再起動します。\n' >&2
            kill -TERM "$(cat "$scan_guard_pidfile" 2>/dev/null)" 2>/dev/null || true
            ;;
        esac
      done < "$scan_guard_fifo"
    ) &

    "$@" >"$scan_guard_fifo" 2>&1 &
    scan_guard_child=$!
    echo "$scan_guard_child" > "$scan_guard_pidfile"

    trap 'kill -TERM "$scan_guard_child" 2>/dev/null || true' TERM INT
    scan_guard_status=0
    wait "$scan_guard_child" || scan_guard_status=$?
    if [ "$scan_guard_status" -gt 128 ]; then
      # 自分が TERM を受けて wait が中断された場合。子の終了を待ち直す。
      scan_guard_status=0
      wait "$scan_guard_child" 2>/dev/null || scan_guard_status=$?
      [ "$scan_guard_status" -eq 127 ] && scan_guard_status=143
    fi
    exit "$scan_guard_status"
  fi
fi

exec "$@"
