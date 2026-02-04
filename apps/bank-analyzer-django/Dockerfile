# ==============================================================================
# Build Stage: Install dependencies with build tools
# ==============================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip wheel --no-cache-dir --wheel-dir=/build/wheels -r requirements.txt

# ==============================================================================
# Production Stage: Minimal runtime image
# ==============================================================================
FROM python:3.12-slim AS production

# Labels
LABEL maintainer="developer" \
      version="1.0" \
      description="Bank Analyzer Django Application"

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user with explicit home directory
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup --home /home/appuser appuser

# Copy wheels from builder and install
COPY --from=builder /build/wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt && \
    rm -rf /wheels

# Copy entrypoint script first (changes less frequently)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Copy application code
COPY --chown=appuser:appgroup . .

# Create directories with proper permissions
RUN mkdir -p data staticfiles db && \
    chown -R appuser:appgroup /app

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    DJANGO_SETTINGS_MODULE=bank_project.settings \
    # Gunicorn settings
    GUNICORN_WORKERS=2 \
    GUNICORN_TIMEOUT=300

# Expose port
EXPOSE 8000

# Healthcheck with grace period
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl --fail --silent http://localhost:8000/health/ || curl --fail --silent http://localhost:8000/ || exit 1

# Switch to non-root user
USER appuser

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Default command
CMD ["/docker-entrypoint.sh", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "300", "--access-logfile", "-", "--error-logfile", "-", "bank_project.wsgi:application"]
