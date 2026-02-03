#!/bin/sh
set -e

echo "=== ITCM Backend Starting ==="

# Run migrations with retry
echo "Running Prisma migrations..."
MAX_RETRIES=30
RETRY_COUNT=0

until pnpm exec prisma migrate deploy; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Migration failed after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Migration failed, retrying in 3 seconds... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 3
done

echo "Migrations completed!"

# Execute the main command
echo "Starting application..."
exec "$@"
