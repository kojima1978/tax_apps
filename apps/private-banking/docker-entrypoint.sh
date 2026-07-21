#!/bin/sh
set -e

# Prisma CLI の場所を解決する。
# 本番(runner)は同梱した隔離ディレクトリ、開発(dev)は通常の node_modules。
if [ -f /app/prisma-cli/node_modules/prisma/build/index.js ]; then
  PRISMA_CLI=/app/prisma-cli/node_modules/prisma/build/index.js
else
  PRISMA_CLI=/app/node_modules/prisma/build/index.js
fi

node "$PRISMA_CLI" migrate deploy
exec "$@"
