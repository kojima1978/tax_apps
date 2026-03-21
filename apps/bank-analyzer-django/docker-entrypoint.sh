#!/bin/bash
set -e

# ============================================
# Bank Analyzer Django - Entrypoint
# ============================================

wait_for_db() {
    local max_retries=${DB_WAIT_MAX_RETRIES:-30}
    local interval=${DB_WAIT_RETRY_INTERVAL:-2}

    echo "Waiting for database (max ${max_retries} retries, ${interval}s interval)..."
    for i in $(seq 1 "$max_retries"); do
        if python -c "
import django
django.setup()
from django.db import connection
connection.ensure_connection()
" 2>/dev/null; then
            echo "Database is ready."
            return 0
        fi
        if [ "$i" -eq "$max_retries" ]; then
            echo "ERROR: Could not connect to database after ${max_retries} retries. Aborting." >&2
            return 1
        fi
        echo "  Attempt $i/${max_retries}: Database not ready, retrying in ${interval}s..."
        sleep "$interval"
    done
}

run_migrations() {
    echo "Running database migrations..."
    if ! python manage.py migrate --noinput; then
        echo "ERROR: Database migration failed. Aborting startup." >&2
        return 1
    fi
}

collect_static() {
    if [ "$DJANGO_DEBUG" != "True" ]; then
        echo "Collecting static files..."
        if ! python manage.py collectstatic --noinput; then
            echo "WARNING: collectstatic failed. Static files may be stale." >&2
        fi
    fi
}

# ------------------------------------------
# メイン処理
# ------------------------------------------
echo "=== Bank Analyzer Django starting ==="

wait_for_db
run_migrations
collect_static

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
