#!/bin/bash
set -e

# ============================================
# Bank Analyzer Django - Entrypoint
# ============================================

echo "=== Bank Analyzer Django starting ==="

# ------------------------------------------
# 1. データベースマイグレーション
# ------------------------------------------
echo "Running database migrations..."
if ! python manage.py migrate --noinput; then
    echo "ERROR: Database migration failed. Aborting startup." >&2
    exit 1
fi

# ------------------------------------------
# 2. 静的ファイル収集（本番のみ）
# ------------------------------------------
if [ "$DJANGO_DEBUG" != "True" ]; then
    echo "Collecting static files..."
    if ! python manage.py collectstatic --noinput; then
        echo "WARNING: collectstatic failed. Static files may be stale." >&2
    fi
fi

# ------------------------------------------
# 3. コマンド実行
# ------------------------------------------
# gunicorn の場合、ENV変数からワーカー数・タイムアウトを設定
if [ "$1" = "gunicorn" ]; then
    exec gunicorn bank_project.wsgi:application \
        --bind 0.0.0.0:3007 \
        --workers "${GUNICORN_WORKERS:-2}" \
        --timeout "${GUNICORN_TIMEOUT:-300}" \
        --graceful-timeout "${GUNICORN_GRACEFUL_TIMEOUT:-30}" \
        --keep-alive "${GUNICORN_KEEP_ALIVE:-5}" \
        --access-logfile - \
        --error-logfile -
fi

# gunicorn 以外のコマンド（runserver 等）はそのまま実行
exec "$@"
