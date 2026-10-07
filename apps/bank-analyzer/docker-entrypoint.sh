#!/bin/sh
set -e

if [ "${NODE_ENV:-development}" = "production" ]; then
  case "${POSTGRES_PASSWORD:-}" in
    ""|change-me|ba_next_dev_password)
      echo "ERROR: 本番では強固な POSTGRES_PASSWORD が必要です。" >&2
      exit 1
      ;;
  esac
fi

# スキーマを最新まで適用してから起動する。
# Django 版の DB へつなぐとき（切り替え時）は、最初のマイグレーション
# （Django が作った表そのもの）を先に `prisma migrate resolve --applied` で
# 適用済みにしておくこと（README 参照）。
#
# テスト用サービスは DB につながないので飛ばす（BANK_ANALYZER_SKIP_MIGRATE=1）。
if [ "${BANK_ANALYZER_SKIP_MIGRATE:-}" != "1" ]; then
  node /app/node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"
