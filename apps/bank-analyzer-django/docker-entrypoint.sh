#!/bin/bash
set -e

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files (for production)
if [ "$DJANGO_DEBUG" != "True" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

# Execute the main command
exec "$@"
