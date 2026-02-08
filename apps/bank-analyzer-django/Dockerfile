# syntax=docker/dockerfile:1

# ============================================
# Bank Analyzer Django - Dockerfile
# ============================================

ARG PYTHON_VERSION=3.12

# ------------------------------------------
# ビルドステージ: 依存関係のwheel作成
# ------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS builder

WORKDIR /build

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_COMPILE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel --wheel-dir=/build/wheels -r requirements.txt

# ------------------------------------------
# 本番ステージ: 最小ランタイムイメージ
# ------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS production

LABEL org.opencontainers.image.title="Bank Analyzer Django" \
      org.opencontainers.image.description="Bank transaction analyzer for inheritance tax"

WORKDIR /app

# ランタイム依存（tini: initシステム）+ 非rootユーザー作成
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup --home /home/appuser appuser

# ビルド済みwheelからPythonパッケージをインストール
COPY --link --from=builder /build/wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt && \
    rm -rf /wheels requirements.txt

# エントリポイント（変更頻度が低いため先にコピー）
COPY --link docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# アプリケーションコード
COPY --chown=appuser:appgroup . .

# ディレクトリ作成・権限設定 + 静的ファイルのビルド時収集
RUN mkdir -p data staticfiles db && \
    DJANGO_SECRET_KEY=build-only-dummy-key \
    python manage.py collectstatic --noinput && \
    chown -R appuser:appgroup /app

# Python設定
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    DJANGO_SETTINGS_MODULE=bank_project.settings

# Gunicorn設定（docker-entrypoint.sh で参照）
ENV GUNICORN_WORKERS=2 \
    GUNICORN_TIMEOUT=300

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')"

USER appuser

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/docker-entrypoint.sh", "gunicorn"]

# ------------------------------------------
# 開発ステージ: Django runserver
# ------------------------------------------
FROM production AS dev

# マウントボリュームへの書き込み権限のためrootで実行
USER root

ENV DJANGO_DEBUG=True

CMD ["/docker-entrypoint.sh", \
     "python", "manage.py", "runserver", "0.0.0.0:8000"]
