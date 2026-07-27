#!/bin/sh
set -e

echo "=== ITCM Starting ==="

# Run migrations with retry (DB接続待ち用) + エラー診断
echo "Running Prisma migrations..."
MAX_RETRIES=30
RETRY_COUNT=0

while true; do
  MIGRATE_OUTPUT=$(npx -y prisma@6 migrate deploy 2>&1) && break
  RETRY_COUNT=$((RETRY_COUNT + 1))

  # DB接続エラー → リトライ（PostgreSQL起動待ち）
  if echo "$MIGRATE_OUTPUT" | grep -q "Can't reach database\|Connection refused\|ECONNREFUSED"; then
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "============================================"
      echo "ERROR: DBに接続できません ($MAX_RETRIES回リトライ後)"
      echo "--------------------------------------------"
      echo "対処法: PostgreSQLコンテナが起動しているか確認してください"
      echo "  docker compose ps"
      echo "  docker compose up -d itcm-postgres"
      echo "============================================"
      exit 1
    fi
    echo "DB接続待ち... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
    continue
  fi

  # カラム/テーブルが既に存在するエラー（db push との競合）
  if echo "$MIGRATE_OUTPUT" | grep -q "42701\|42P07"; then
    FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | grep "Migration name:" | sed 's/.*Migration name: //')
    echo "============================================"
    echo "ERROR: マイグレーション失敗 - スキーマが既に適用済みです"
    echo "--------------------------------------------"
    echo "原因: db push 等でDBに直接変更が適用されたため、"
    echo "      マイグレーション履歴と実際のDBが不整合です。"
    echo ""
    echo "対処法: 以下のコマンドで履歴を同期してください"
    echo "  docker exec itcm-frontend npx prisma migrate resolve --applied $FAILED_MIGRATION"
    echo ""
    echo "その後、コンテナを再起動してください"
    echo "  docker compose restart itcm-frontend"
    echo ""
    echo "※ 今後は db push を使わず、prisma migrate dev で"
    echo "  マイグレーションファイルを作成してください。"
    echo "============================================"
    exit 1
  fi

  # マイグレーション履歴の不整合（ファイル削除・編集等）
  if echo "$MIGRATE_OUTPUT" | grep -q "P3009\|P3012"; then
    echo "============================================"
    echo "ERROR: マイグレーション履歴が不整合です"
    echo "--------------------------------------------"
    echo "原因: マイグレーションファイルが編集・削除された可能性があります。"
    echo ""
    echo "対処法: DBをリセットして再作成してください"
    echo "  docker exec itcm-frontend npx prisma migrate reset"
    echo "  ※ 全データが削除されます。本番環境では実行しないでください。"
    echo "============================================"
    exit 1
  fi

  # その他の不明なエラー
  echo "============================================"
  echo "ERROR: マイグレーションが失敗しました"
  echo "--------------------------------------------"
  echo "$MIGRATE_OUTPUT"
  echo ""
  echo "対処法: 上記のエラー内容を確認してください。"
  echo "  ログ全文: docker logs itcm-frontend"
  echo "============================================"
  exit 1
done

echo "Migrations completed!"

# Execute the main command
echo "Starting application..."

# 開発モードのみ: 初期スキャン失敗を検知して落とすガード。
#
# Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てる
# (setup-dev-bundler.js の knownFiles)。スキャンが失敗したディレクトリ配下の
# ルートは `Watchpack Error (initial scan)` を1行出すだけで丸ごと欠落し、
# `✓ Ready` のまま該当ルートが 404 を返し続ける。/api/health は無傷なので
# healthcheck も緑のままで、誰かが気づくまで静かに壊れている。
# 検知したら即座に落とし、restart: unless-stopped による再起動に任せる。
#
# 出力を FIFO 経由にするのは、パイプで繋ぐと next の PID が取れないため。
# また next を exec せず子プロセスとして起動する: exec すると next が PID 1 になり、
# PID 1 はハンドラを持たないシグナルを無視する(＝下の kill が効かない)。
# 代わりに docker stop の TERM/INT を trap で明示的に転送する。
if [ "${NODE_ENV:-development}" != "production" ]; then
  scan_guard_fifo=/tmp/next-dev-output
  scan_guard_pidfile=/tmp/next-dev.pid
  rm -f "$scan_guard_fifo" "$scan_guard_pidfile"
  if mkfifo "$scan_guard_fifo" 2>/dev/null; then
    (
      while IFS= read -r line; do
        printf '%s\n' "$line"
        case "$line" in
          *"Watchpack Error (initial scan)"*)
            printf 'FATAL: 初期スキャンに失敗しました。ルート表が不完全なため再起動します。\n' >&2
            kill -TERM "$(cat "$scan_guard_pidfile" 2>/dev/null)" 2>/dev/null || true
            ;;
        esac
      done < "$scan_guard_fifo"
    ) &

    "$@" >"$scan_guard_fifo" 2>&1 &
    scan_guard_child=$!
    echo "$scan_guard_child" > "$scan_guard_pidfile"

    trap 'kill -TERM "$scan_guard_child" 2>/dev/null || true' TERM INT
    scan_guard_status=0
    wait "$scan_guard_child" || scan_guard_status=$?
    if [ "$scan_guard_status" -gt 128 ]; then
      # 自分が TERM を受けて wait が中断された場合。子の終了を待ち直す。
      scan_guard_status=0
      wait "$scan_guard_child" 2>/dev/null || scan_guard_status=$?
      [ "$scan_guard_status" -eq 127 ] && scan_guard_status=143
    fi
    exit "$scan_guard_status"
  fi
fi

exec "$@"
