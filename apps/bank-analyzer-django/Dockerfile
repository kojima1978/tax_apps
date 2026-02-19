# syntax=docker/dockerfile:1

# ============================================
# Bank Analyzer Django - Dockerfile
# ============================================
#
# Multi-stage build with the following stages:
#   1. builder    - Compile dependencies into wheels
#   2. production - Minimal runtime image with Gunicorn
#   3. test       - Run tests in CI/CD pipeline
#   4. dev        - Development with Django runserver
#
# Build examples:
#   docker build -t bank-analyzer:latest .
#   docker build --target dev -t bank-analyzer:dev .
#   docker build --target test -t bank-analyzer:test .
#
# ============================================

# ------------------------------------------
# Build Arguments
# ------------------------------------------
ARG PYTHON_VERSION=3.12
ARG APP_VERSION=1.0.0
ARG BUILD_DATE=""
ARG VCS_REF=""

# ------------------------------------------
# Stage 1: Builder - Compile dependencies
# ------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS builder

WORKDIR /build

# Disable pip version check and bytecode compilation for faster builds
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_COMPILE=1

# Install build dependencies
# - build-essential: C compiler for native extensions (rapidfuzz, psycopg2)
# - libpq-dev: PostgreSQL client library headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Build wheels for all dependencies
COPY requirements.txt .
RUN --mount=type=cache,id=pip-bank-analyzer,target=/root/.cache/pip \
    pip wheel --wheel-dir=/build/wheels -r requirements.txt

# ------------------------------------------
# Stage 2: Production - Minimal runtime image
# ------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS production

# Re-declare ARGs after FROM (they don't persist across stages)
ARG APP_VERSION
ARG BUILD_DATE
ARG VCS_REF

# OCI Image Specification labels
# https://github.com/opencontainers/image-spec/blob/main/annotations.md
LABEL org.opencontainers.image.title="Bank Analyzer Django" \
      org.opencontainers.image.description="Bank transaction analyzer for inheritance tax preparation" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

# Install runtime dependencies and create non-root user
# - tini: Proper init system for signal handling and zombie reaping
# - libpq5: PostgreSQL client library (runtime)
# - curl: For reliable healthcheck probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup --home /home/appuser appuser

# Install Python packages from pre-built wheels
COPY --link --from=builder /build/wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt && \
    rm -rf /wheels requirements.txt

# Copy entrypoint script (changes rarely, so copy early for caching)
# sed strips CRLF for Windows compatibility
COPY --link docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Python runtime configuration (before COPY . . for better layer caching)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    DJANGO_SETTINGS_MODULE=bank_project.settings

# Gunicorn configuration (referenced by docker-entrypoint.sh)
ENV GUNICORN_WORKERS=2 \
    GUNICORN_TIMEOUT=300 \
    GUNICORN_GRACEFUL_TIMEOUT=30 \
    GUNICORN_KEEP_ALIVE=5

# Copy application code with proper ownership
COPY --link --chown=1001:1001 . .

# Create runtime directories and fix /app ownership for bytecode compilation
# WORKDIR /app is root-owned; appuser needs write access for __pycache__
RUN mkdir -p data staticfiles db && \
    chown appuser:appgroup /app data staticfiles db

EXPOSE 3007

# Healthcheck using curl (more reliable than Python urllib)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent --show-error http://localhost:3007/health/ || exit 1

# Run as non-root user for security
USER appuser

# Collect static files and pre-compile bytecode as appuser
# - collectstatic: WhiteNoise用の静的ファイルをappuser所有で生成
# - compileall: .pycを事前生成しコールドスタートを高速化
RUN DJANGO_SECRET_KEY=build-only-dummy-key \
    python manage.py collectstatic --noinput && \
    python -m compileall -q .

# Graceful shutdown signal
STOPSIGNAL SIGTERM

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/docker-entrypoint.sh", "gunicorn"]

# ------------------------------------------
# Stage 3: Test - Run tests in CI/CD
# ------------------------------------------
FROM production AS test

# Switch to root for pip install
USER root

# Install test dependencies
RUN pip install --no-cache-dir pytest pytest-django coverage

# Run tests as non-root
USER appuser

# Set test environment
ENV DJANGO_DEBUG=True \
    DJANGO_SECRET_KEY=test-secret-key-not-for-production

# Run tests and generate coverage report
CMD ["python", "-m", "pytest", "--tb=short", "-v"]

# ------------------------------------------
# Stage 4: Development - Django runserver
# ------------------------------------------
FROM production AS dev

# Run as root for volume mount write permissions
USER root

# Enable Django debug mode
ENV DJANGO_DEBUG=True

# 開発時はヘルスチェック不要（docker-composeで必要に応じて設定）
HEALTHCHECK NONE

# Use Django development server (--nostatic for FORCE_SCRIPT_NAME compatibility)
CMD ["/docker-entrypoint.sh", \
     "python", "manage.py", "runserver", "--nostatic", "0.0.0.0:3007"]
