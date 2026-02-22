#!/usr/bin/env bash
# ============================================
# Tax Apps 個別コンテナ管理スクリプト
# ============================================
#
# Usage:
#   ./manage.sh start          全アプリを起動（ネットワーク自動作成）
#   ./manage.sh stop           全アプリを停止
#   ./manage.sh restart <app>  指定アプリのみ再起動
#   ./manage.sh status         全アプリの状態表示
#   ./manage.sh logs <app>     指定アプリのログ表示
#   ./manage.sh build <app>    指定アプリを再ビルドして起動
#   ./manage.sh down           全アプリを停止してコンテナ削除
#
# ============================================

set -euo pipefail

# プロジェクトルート（docker/ の親ディレクトリ）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 外部ネットワーク名
NETWORK_NAME="tax-apps-network"

# ------------------------------------
# アプリ一覧（起動順序を考慮）
# gateway は最初、DB依存アプリは DB→App の順
# ------------------------------------
APPS=(
  "docker/gateway"
  "apps/inheritance-case-management"
  "apps/bank-analyzer-django"
  "apps/Required-documents-for-tax-return"
  "apps/medical-stock-valuation"
  "apps/shares-valuation"
  "apps/inheritance-tax-app"
  "apps/gift-tax-simulator"
  "apps/gift-tax-docs"
  "apps/inheritance-tax-docs"
  "apps/retirement-tax-calc"
)

# ------------------------------------
# ユーティリティ
# ------------------------------------
log() { echo -e "\033[1;36m[manage]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    log "ネットワーク $NETWORK_NAME を作成..."
    docker network create "$NETWORK_NAME"
  fi
}

resolve_app_dir() {
  local name="$1"
  # フルパスで指定された場合
  for app in "${APPS[@]}"; do
    if [[ "$app" == *"$name"* ]]; then
      echo "$PROJECT_ROOT/$app"
      return 0
    fi
  done
  err "アプリが見つかりません: $name"
  err "利用可能: ${APPS[*]}"
  return 1
}

# ------------------------------------
# コマンド
# ------------------------------------
cmd_start() {
  ensure_network
  log "全アプリを起動します..."
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    local name
    name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      log "  起動: $name"
      docker compose -f "$dir/docker-compose.yml" up -d
    else
      err "  スキップ（docker-compose.yml なし）: $name"
    fi
  done
  log "全アプリの起動が完了しました"
  cmd_status
}

cmd_stop() {
  log "全アプリを停止します..."
  # 逆順で停止（gateway を最後に）
  for (( i=${#APPS[@]}-1; i>=0; i-- )); do
    local app="${APPS[$i]}"
    local dir="$PROJECT_ROOT/$app"
    local name
    name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      log "  停止: $name"
      docker compose -f "$dir/docker-compose.yml" stop
    fi
  done
  log "全アプリを停止しました"
}

cmd_down() {
  log "全アプリを停止・削除します..."
  for (( i=${#APPS[@]}-1; i>=0; i-- )); do
    local app="${APPS[$i]}"
    local dir="$PROJECT_ROOT/$app"
    local name
    name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      log "  削除: $name"
      docker compose -f "$dir/docker-compose.yml" down
    fi
  done
  log "全アプリを削除しました"
}

cmd_restart() {
  local name="${1:?アプリ名を指定してください}"
  local dir
  dir=$(resolve_app_dir "$name")
  ensure_network
  log "$name を再起動します..."
  docker compose -f "$dir/docker-compose.yml" restart
  log "$name を再起動しました"
}

cmd_build() {
  local name="${1:?アプリ名を指定してください}"
  local dir
  dir=$(resolve_app_dir "$name")
  ensure_network
  log "$name を再ビルドして起動します..."
  docker compose -f "$dir/docker-compose.yml" up -d --build
  log "$name のビルドが完了しました"
}

cmd_logs() {
  local name="${1:?アプリ名を指定してください}"
  local dir
  dir=$(resolve_app_dir "$name")
  docker compose -f "$dir/docker-compose.yml" logs -f
}

cmd_status() {
  echo ""
  echo "========================================"
  echo " Tax Apps コンテナ状態"
  echo "========================================"
  printf "%-35s %-15s %-10s\n" "CONTAINER" "STATUS" "PORTS"
  echo "----------------------------------------"
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    if [[ -f "$dir/docker-compose.yml" ]]; then
      docker compose -f "$dir/docker-compose.yml" ps --format \
        "{{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | \
        while IFS=$'\t' read -r cname cstatus cports; do
          printf "%-35s %-15s %-10s\n" "$cname" "$cstatus" "$cports"
        done
    fi
  done
  echo "========================================"
  echo ""
}

# ------------------------------------
# メイン
# ------------------------------------
case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  down)    cmd_down ;;
  restart) cmd_restart "${2:-}" ;;
  build)   cmd_build "${2:-}" ;;
  logs)    cmd_logs "${2:-}" ;;
  status)  cmd_status ;;
  *)
    echo "Usage: $0 {start|stop|down|restart|build|logs|status} [app-name]"
    echo ""
    echo "Commands:"
    echo "  start          全アプリを起動（ネットワーク自動作成）"
    echo "  stop           全アプリを停止"
    echo "  down           全アプリを停止してコンテナ削除"
    echo "  restart <app>  指定アプリのみ再起動"
    echo "  build <app>    指定アプリを再ビルドして起動"
    echo "  logs <app>     指定アプリのログ表示"
    echo "  status         全アプリの状態表示"
    echo ""
    echo "Apps:"
    for app in "${APPS[@]}"; do
      echo "  $(basename "$app")"
    done
    ;;
esac
