#!/bin/sh
set -e

if [ "${NODE_ENV:-development}" = "production" ]; then
  case "${POSTGRES_PASSWORD:-}" in
    ""|change-me|svf_dev_password)
      echo "ERROR: 本番では強固な POSTGRES_PASSWORD が必要です。" >&2
      exit 1
      ;;
  esac
fi

# スキーマを最新まで適用してから起動する。公表データの取込（seed）は
# サーバ起動時に server/index.ts が行う（未登録の年分のみ）。
node /app/node_modules/prisma/build/index.js migrate deploy

exec "$@"
