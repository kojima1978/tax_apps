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
      echo "  docker compose up -d postgres"
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
exec "$@"
