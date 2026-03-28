#!/usr/bin/env bash
# ============================================
# Tax Apps 個別コンテナ管理スクリプト
# ============================================
#
# Usage:
#   ./manage.sh start              全アプリを起動（ネットワーク自動作成）
#   ./manage.sh start --prod       全アプリを本番モードで起動
#   ./manage.sh stop               全アプリを停止
#   ./manage.sh restart <app>      指定アプリのみ再起動
#   ./manage.sh status             全アプリの状態表示
#   ./manage.sh logs <app>         指定アプリのログ表示
#   ./manage.sh build <app>        指定アプリを再ビルドして起動
#   ./manage.sh down               全アプリを停止してコンテナ削除
#   ./manage.sh backup             全データベース・データをバックアップ
#   ./manage.sh restore [dir]      バックアップからリストア
#   ./manage.sh clean              コンテナ・イメージのクリーンアップ
#   ./manage.sh preflight          起動前チェック
#
# ============================================

set -euo pipefail

# プロジェクトルート（docker/ の親ディレクトリ）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 外部ネットワーク名
NETWORK_NAME="tax-apps-network"

# バックアップディレクトリ
BACKUP_BASE="$SCRIPT_DIR/../backups"

# ------------------------------------
# アプリ一覧（起動順序を考慮）
# DB依存アプリを先に、gateway は最後（upstream DNS解決のため）
# ------------------------------------
APPS=(
  "apps/inheritance-case-management"
  "apps/bank-analyzer-django"
  "apps/tax-docs"
  "apps/medical-stock-valuation"
  "apps/shares-valuation"
  "apps/inheritance-tax-app"
  "apps/gift-tax-simulator"
  "apps/inheritance-tax-docs"
  "apps/retirement-tax-calc"
  "apps/depreciation-calc"
  "apps/salary-calc"
  "apps/asset-valuation"
  "apps/stock-valuation-form"
  "docker/gateway"
)

# データボリューム一覧
VOLUMES=(
  "inheritance-case-management_postgres_data"
  "bank-analyzer-postgres"
  "bank-analyzer-sqlite"
  "tax-docs-data"
  "medical-stock-valuation-data"
)

check_dependencies() {
  if ! command -v docker >/dev/null 2>&1; then
    err "docker がインストールされていません。"
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose が利用できません。"
    exit 1
  fi
}

# ------------------------------------
# ユーティリティ
# ------------------------------------
log() { echo -e "\033[1;36m[manage]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
ok() { echo -e "\033[1;32m[OK]\033[0m    $*"; }

print_banner() {
  echo ""
  echo "========================================"
  echo "  $*"
  echo "========================================"
  echo ""
}

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    log "ネットワーク $NETWORK_NAME を作成..."
    docker network create "$NETWORK_NAME"
  fi
}

resolve_app_dir() {
  local name="$1"
  local matches=()
  for app in "${APPS[@]}"; do
    if [[ "$app" == *"$name"* ]]; then
      matches+=("$app")
    fi
  done
  if [[ ${#matches[@]} -eq 0 ]]; then
    err "アプリが見つかりません: $name"
    err "利用可能: $(printf '%s ' "${APPS[@]}" | sed 's|docker/||g; s|apps/||g')"
    return 1
  elif [[ ${#matches[@]} -gt 1 ]]; then
    # 完全一致があればそれを使う
    for app in "${matches[@]}"; do
      if [[ "$(basename "$app")" == "$name" ]]; then
        echo "$PROJECT_ROOT/$app"
        return 0
      fi
    done
    warn "複数のアプリが一致しました:"
    for app in "${matches[@]}"; do
      echo "  $(basename "$app")" >&2
    done
    err "より具体的な名前を指定してください"
    return 1
  fi
  echo "$PROJECT_ROOT/${matches[0]}"
  return 0
}

# require_app_arg <command_name> <app_name>
# resolve_app_dir + ensure_network を一括実行。RESOLVED_DIR を設定。
require_app_arg() {
  local cmd_name="$1"
  local app_name="${2:?アプリ名を指定してください}"
  RESOLVED_DIR=$(resolve_app_dir "$app_name")
}

format_size() {
  local bytes="$1"
  if [[ $bytes -gt $((1024*1024)) ]]; then
    echo "$(( bytes / 1024 / 1024 )).$(( (bytes / 1024 % 1024) * 10 / 1024 )) MB"
  elif [[ $bytes -gt 1024 ]]; then
    echo "$(( bytes / 1024 )) KB"
  else
    echo "$bytes bytes"
  fi
}

dir_size() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    du -sb "$dir" 2>/dev/null | awk '{print $1}' || echo "0"
  else
    echo "0"
  fi
}

# 本番モードで除外するアプリ（開発中）
PROD_SKIP_APPS=()

is_prod_skip() {
  local name="$1"
  for skip_app in "${PROD_SKIP_APPS[@]}"; do
    [[ "$name" == "$skip_app" ]] && return 0
  done
  return 1
}

# for_each_app <callback> [args...]
# 全APPSを順方向で反復し、callback(app_dir, app_name, args...) を呼ぶ
for_each_app() {
  local callback="$1"; shift
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    local name; name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      "$callback" "$dir" "$name" "$@"
    fi
  done
}

# for_each_app_reverse <callback> [args...]
# 全APPSを逆順で反復
for_each_app_reverse() {
  local callback="$1"; shift
  for (( i=${#APPS[@]}-1; i>=0; i-- )); do
    local app="${APPS[$i]}"
    local dir="$PROJECT_ROOT/$app"
    local name; name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      "$callback" "$dir" "$name" "$@"
    fi
  done
}

# is_container_running <container_name>
is_container_running() {
  docker ps --filter "name=$1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "$1"
}

# backup_postgres <label> <container> <pg_user> <db_name> <volume_name> <dump_file>
# PostgreSQL のバックアップ（pg_dump → volume fallback）
backup_postgres() {
  local label="$1" container="$2" pg_user="$3" db_name="$4" volume="$5" dump_file="$6"
  echo "$label"

  if is_container_running "$container"; then
    if docker exec "$container" pg_dump -U "$pg_user" -d "$db_name" > "$backup_dir/$dump_file.sql" 2>/dev/null; then
      ok "$dump_file.sql"
      (( backup_ok++ ))
      return
    fi
    rm -f "$backup_dir/$dump_file.sql"
    warn "pg_dump failed, trying volume backup..."
  else
    if docker volume inspect "$volume" >/dev/null 2>&1; then
      warn "Container stopped - backing up volume directly"
    fi
  fi

  # volume fallback
  if docker volume inspect "$volume" >/dev/null 2>&1; then
    if docker run --rm -v "$volume":/data -v "$backup_dir":/backup alpine tar czf "/backup/$dump_file-volume.tar.gz" -C /data . >/dev/null 2>&1; then
      ok "$dump_file-volume.tar.gz"
      (( backup_ok++ ))
    else
      err "Volume backup failed"
      (( backup_fail++ ))
    fi
  else
    warn "$label volume not found"
    (( backup_skip++ ))
  fi
}

# restore_postgres <label> <container> <pg_user> <db_name> <volume_name> <dump_file> <restart_hint>
# PostgreSQL のリストア（SQL → volume fallback）
restore_postgres() {
  local label="$1" container="$2" pg_user="$3" db_name="$4" volume="$5" dump_file="$6" restart_hint="$7"
  echo "$label"

  if [[ -f "$backup_dir/$dump_file.sql" ]]; then
    if ! is_container_running "$container"; then
      err "$container container is not running."
      echo "  Run: ./manage.sh restart $restart_hint"
      (( restore_fail++ ))
      return
    fi
    docker exec "$container" psql -U "$pg_user" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db_name' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    docker exec "$container" psql -U "$pg_user" -d postgres -c "DROP DATABASE IF EXISTS $db_name;" >/dev/null 2>&1
    docker exec "$container" psql -U "$pg_user" -d postgres -c "CREATE DATABASE $db_name;" >/dev/null 2>&1
    if docker exec -i "$container" psql -U "$pg_user" -d "$db_name" < "$backup_dir/$dump_file.sql" >/dev/null 2>&1; then
      ok "$dump_file.sql"
      (( restore_ok++ ))
    else
      err "$label restore failed"
      (( restore_fail++ ))
    fi
  elif [[ -f "$backup_dir/$dump_file-volume.tar.gz" ]]; then
    warn "Volume restore - container must be stopped"
    docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null 2>&1
    if docker run --rm -v "$volume":/data -v "$backup_dir":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/$dump_file-volume.tar.gz" >/dev/null 2>&1; then
      ok "$dump_file-volume.tar.gz"
      (( restore_ok++ ))
    else
      err "Volume restore failed"
      (( restore_fail++ ))
    fi
  else
    warn "Not in backup"
    (( restore_skip++ ))
  fi
}

# backup_sqlite_volumes <pair1> <pair2> ...
# SQLite ボリュームのバックアップ（"volume:filename" 形式）
backup_sqlite_volumes() {
  echo "[3/5] SQLite volumes ..."
  local sqlite_ok=0 sqlite_skip=0
  for pair in "$@"; do
    local vol="${pair%%:*}"
    local fname="${pair##*:}"
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      if docker run --rm -v "$vol":/data -v "$backup_dir":/backup alpine tar czf "/backup/${fname}.tar.gz" -C /data . >/dev/null 2>&1; then
        (( sqlite_ok++ ))
      else
        err "$vol backup failed"
        (( backup_fail++ ))
      fi
    else
      (( sqlite_skip++ ))
    fi
  done
  if [[ $sqlite_ok -gt 0 ]]; then
    ok "SQLite $sqlite_ok volumes"
    (( backup_ok += sqlite_ok ))
  fi
  if [[ $sqlite_ok -eq 0 && $sqlite_skip -eq $# ]]; then
    warn "No SQLite volumes found"
    (( backup_skip++ ))
  fi
}

# restore_sqlite_volumes <pair1> <pair2> ...
# SQLite ボリュームのリストア（"filename.tar.gz:volume" 形式）
restore_sqlite_volumes() {
  echo "[3/5] SQLite volumes ..."
  local sqlite_ok=0
  for pair in "$@"; do
    local fname="${pair%%:*}"
    local vol="${pair##*:}"
    if [[ -f "$backup_dir/$fname" ]]; then
      docker volume inspect "$vol" >/dev/null 2>&1 || docker volume create "$vol" >/dev/null 2>&1
      if docker run --rm -v "$vol":/data -v "$backup_dir":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/$fname" >/dev/null 2>&1; then
        (( sqlite_ok++ ))
      else
        (( restore_fail++ ))
      fi
    fi
  done
  if [[ $sqlite_ok -gt 0 ]]; then
    ok "SQLite $sqlite_ok volumes"
    (( restore_ok += sqlite_ok ))
  else
    warn "No SQLite backups found"
    (( restore_skip++ ))
  fi
}

# print_summary_banner <title> <fail_count>
# バックアップ/リストアのサマリーバナー表示
print_summary_banner() {
  local title="$1" fail_count="$2"
  if [[ $fail_count -gt 0 ]]; then
    print_banner "$title (with errors)"
  else
    print_banner "$title"
  fi
}

# ------------------------------------
# コマンド
# ------------------------------------

# --- start用コールバック ---
_do_start() {
  local dir="$1" name="$2" prod_mode="$3"
  # 本番モード時に開発中アプリをスキップ
  if [[ $prod_mode -eq 1 ]] && is_prod_skip "$name"; then
    warn "スキップ（開発中）: $name"
    return
  fi
  # .env.example → .env 自動生成
  if [[ -f "$dir/.env.example" && ! -f "$dir/.env" ]]; then
    cp "$dir/.env.example" "$dir/.env"
    log "  .env を作成しました: $name"
  fi
  if [[ $prod_mode -eq 1 ]]; then
    local prod_compose="$dir/docker-compose.prod.yml"
    if [[ -f "$prod_compose" ]]; then
      log "  起動[本番]: $name"
      docker compose -f "$dir/docker-compose.yml" -f "$prod_compose" up -d --build
    else
      log "  起動[本番]: $name"
      docker compose -f "$dir/docker-compose.yml" up -d --build
    fi
  else
    log "  起動: $name"
    docker compose -f "$dir/docker-compose.yml" up -d
  fi
}

# --- stop/down用コールバック ---
_do_compose_action() {
  local dir="$1" name="$2" action="$3" label="$4"
  log "  $label: $name"
  docker compose -f "$dir/docker-compose.yml" $action
}

cmd_start() {
  local prod_mode=0
  [[ "${1:-}" == "--prod" ]] && prod_mode=1
  ensure_network
  if [[ $prod_mode -eq 1 ]]; then
    log "全アプリを本番モードで起動します..."
  else
    log "全アプリを起動します..."
  fi
  for_each_app _do_start "$prod_mode"
  log "全アプリの起動が完了しました"
  cmd_status
}

cmd_stop() {
  log "全アプリを停止します..."
  for_each_app_reverse _do_compose_action "stop" "停止"
  log "全アプリを停止しました"
}

cmd_down() {
  log "全アプリを停止・削除します..."
  for_each_app_reverse _do_compose_action "down" "削除"
  log "全アプリを削除しました"
}

cmd_restart() {
  require_app_arg "restart" "${1:-}"
  ensure_network
  log "$(basename "$RESOLVED_DIR") を再起動します..."
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" restart
  log "$(basename "$RESOLVED_DIR") を再起動しました"
}

cmd_build() {
  require_app_arg "build" "${1:-}"
  ensure_network
  log "$(basename "$RESOLVED_DIR") を再ビルドして起動します..."
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" up -d --build
  log "$(basename "$RESOLVED_DIR") のビルドが完了しました"
}

cmd_logs() {
  require_app_arg "logs" "${1:-}"
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" logs -f
}

cmd_status() {
  print_banner "Tax Apps コンテナ状態"
  echo "ネットワーク: $NETWORK_NAME"
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "  状態: 存在"
  else
    echo "  状態: 存在しない"
  fi
  echo ""
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
# backup - 全データベース・データをバックアップ
# ------------------------------------
cmd_backup() {
  print_banner "Tax Apps - Backup"

  local timestamp
  timestamp=$(date +"%Y-%m-%d_%H%M%S")
  local backup_dir="$BACKUP_BASE/$timestamp"
  mkdir -p "$backup_dir"

  echo "Destination: $backup_dir/"
  echo ""

  local backup_ok=0 backup_fail=0 backup_skip=0

  # --- 1/5 ITCM PostgreSQL ---
  backup_postgres "[1/5] ITCM PostgreSQL ..." \
    "itcm-postgres" "postgres" "inheritance_tax_db" \
    "inheritance-case-management_postgres_data" "itcm-postgres"

  # --- 2/5 Bank Analyzer PostgreSQL ---
  backup_postgres "[2/5] Bank Analyzer PostgreSQL ..." \
    "bank-analyzer-postgres" "bankuser" "bank_analyzer" \
    "bank-analyzer-postgres" "bank-analyzer-postgres"

  # --- 3/5 SQLite volumes ---
  backup_sqlite_volumes \
    "bank-analyzer-sqlite:bank-analyzer-sqlite" \
    "tax-docs-data:tax-docs-data" \
    "medical-stock-valuation-data:medical-stock-valuation-data"

  # --- 4/5 Upload data (bind mount) ---
  echo "[4/5] Upload data ..."
  local bank_data="$PROJECT_ROOT/apps/bank-analyzer-django/data"
  if [[ -d "$bank_data" ]]; then
    mkdir -p "$backup_dir/bank-analyzer-upload"
    if cp -r "$bank_data"/* "$backup_dir/bank-analyzer-upload/" 2>/dev/null; then
      ok "bank-analyzer-upload/"
      (( backup_ok++ ))
    else
      err "bank-analyzer upload data copy failed"
      (( backup_fail++ ))
    fi
  else
    warn "bank-analyzer/data/ not found"
    (( backup_skip++ ))
  fi

  # --- 5/5 ITCM .env ---
  echo "[5/5] Settings ..."
  local itcm_env="$PROJECT_ROOT/apps/inheritance-case-management/.env"
  if [[ -f "$itcm_env" ]]; then
    cp "$itcm_env" "$backup_dir/itcm-.env"
    ok "itcm-.env"
    (( backup_ok++ ))
  else
    warn "ITCM .env not found"
    (( backup_skip++ ))
  fi

  # --- Summary ---
  print_summary_banner "Backup Complete" "$backup_fail"
  echo "  Destination: $backup_dir/"
  echo "  Size: $(format_size "$(dir_size "$backup_dir")")"
  echo "  OK: $backup_ok  Skipped: $backup_skip  Failed: $backup_fail"
  echo ""
  if [[ $backup_ok -eq 0 ]]; then
    warn "No data was backed up. Removing empty directory."
    rm -rf "$backup_dir"
  else
    echo "  To restore: ./manage.sh restore $timestamp"
  fi
  echo ""
}

# ------------------------------------
# restore - バックアップからリストア
# ------------------------------------
cmd_restore() {
  print_banner "Tax Apps - Restore"

  if [[ ! -d "$BACKUP_BASE" ]]; then
    err "backups/ not found. Run: ./manage.sh backup"
    return 1
  fi

  local backup_dir=""

  if [[ -n "${1:-}" ]]; then
    if [[ -d "$BACKUP_BASE/$1" ]]; then
      backup_dir="$BACKUP_BASE/$1"
    else
      err "$BACKUP_BASE/$1 not found."
      echo ""
    fi
  fi

  if [[ -z "$backup_dir" ]]; then
    # バックアップ一覧を表示
    local -a backups=()
    while IFS= read -r d; do
      backups+=("$d")
    done < <(ls -1r "$BACKUP_BASE" 2>/dev/null)

    if [[ ${#backups[@]} -eq 0 ]]; then
      err "No backups found. Run: ./manage.sh backup"
      return 1
    fi

    echo "Available backups:"
    echo ""
    for i in "${!backups[@]}"; do
      local bk="${backups[$i]}"
      local size
      size=$(format_size "$(dir_size "$BACKUP_BASE/$bk")")
      echo "  [$((i+1))] $bk  ($size)"
    done
    echo ""
    echo "  [0] Cancel"
    echo ""

    read -rp "Select number: " choice
    if [[ "$choice" == "0" || -z "$choice" ]]; then
      echo "Cancelled."
      return 0
    fi

    local idx=$((choice - 1))
    if [[ $idx -lt 0 || $idx -ge ${#backups[@]} ]]; then
      err "Invalid selection."
      return 1
    fi
    backup_dir="$BACKUP_BASE/${backups[$idx]}"
  fi

  echo "Restore from: $backup_dir/"
  echo ""
  echo "Contents:"
  ls -1 "$backup_dir" 2>/dev/null
  echo ""
  warn "This will overwrite current data!"
  echo ""
  read -rp "Proceed? (Y/N): " confirm
  if [[ "${confirm,,}" != "y" ]]; then
    echo "Cancelled."
    return 0
  fi
  echo ""

  local restore_ok=0 restore_fail=0 restore_skip=0

  # --- 1/5 ITCM PostgreSQL ---
  restore_postgres "[1/5] ITCM PostgreSQL ..." \
    "itcm-postgres" "postgres" "inheritance_tax_db" \
    "inheritance-case-management_postgres_data" "itcm-postgres" \
    "inheritance-case-management"

  # --- 2/5 Bank Analyzer PostgreSQL ---
  restore_postgres "[2/5] Bank Analyzer PostgreSQL ..." \
    "bank-analyzer-postgres" "bankuser" "bank_analyzer" \
    "bank-analyzer-postgres" "bank-analyzer-postgres" \
    "bank-analyzer-django"

  # --- 3/5 SQLite volumes ---
  restore_sqlite_volumes \
    "bank-analyzer-sqlite.tar.gz:bank-analyzer-sqlite" \
    "tax-docs-data.tar.gz:tax-docs-data" \
    "medical-stock-valuation-data.tar.gz:medical-stock-valuation-data"

  # --- 4/5 Upload data ---
  echo "[4/5] Upload data ..."
  if [[ -d "$backup_dir/bank-analyzer-upload" ]]; then
    local bank_data="$PROJECT_ROOT/apps/bank-analyzer-django/data"
    mkdir -p "$bank_data"
    if cp -r "$backup_dir/bank-analyzer-upload"/* "$bank_data/" 2>/dev/null; then
      ok "bank-analyzer-upload/"
      (( restore_ok++ ))
    else
      err "bank-analyzer upload data restore failed"
      (( restore_fail++ ))
    fi
  else
    warn "Not in backup"
    (( restore_skip++ ))
  fi

  # --- 5/5 Settings ---
  echo "[5/5] Settings ..."
  if [[ -f "$backup_dir/itcm-.env" ]]; then
    cp "$backup_dir/itcm-.env" "$PROJECT_ROOT/apps/inheritance-case-management/.env"
    ok "itcm-.env"
    (( restore_ok++ ))
  else
    warn "Not in backup"
    (( restore_skip++ ))
  fi

  # --- Summary ---
  print_summary_banner "Restore Complete" "$restore_fail"
  echo "  Source: $backup_dir/"
  echo "  OK: $restore_ok  Skipped: $restore_skip  Failed: $restore_fail"
  echo ""
  if [[ $restore_ok -gt 0 ]]; then
    echo "  [NOTE] Restart apps to apply restored data:"
    echo "    ./manage.sh restart inheritance-case-management"
    echo "    ./manage.sh restart bank-analyzer-django"
    echo ""
  fi
}

# ------------------------------------
# clean - クリーンアップ
# ------------------------------------

_do_clean_app() {
  local dir="$1" name="$2"
  echo "  削除: $name"
  docker compose -f "$dir/docker-compose.yml" down --rmi local --remove-orphans 2>/dev/null || true
}

_print_clean_done() {
  print_banner "Clean Up Complete"
  echo "  リセットアップ: ./manage.sh start"
  echo ""
}

cmd_clean() {
  print_banner "Tax Apps - Clean Up"
  echo "  * Backup recommendation: ./manage.sh backup"
  echo ""

  # Step 1: コンテナ・イメージの削除
  echo "[Step 1] コンテナ・イメージの削除"
  echo ""
  echo "  以下を削除します:"
  echo "    - 全コンテナ（停止を含む）"
  echo "    - ビルドされた Docker イメージ"
  echo ""

  read -rp "  削除してよろしいですか？ (Y/N): " confirm1
  if [[ "${confirm1,,}" != "y" ]]; then
    echo ""
    echo "キャンセルしました。"
    return 0
  fi

  echo ""
  echo "コンテナを停止・削除しています..."
  for_each_app_reverse _do_clean_app
  echo ""
  ok "コンテナ・イメージを削除しました"

  # ネットワーク削除
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
    ok "$NETWORK_NAME を削除しました"
  fi

  # Step 2: データボリュームの削除（オプション）
  echo ""
  echo "[Step 2] データボリュームの削除"
  echo ""
  echo "  以下のデータを完全に削除します（元に戻せません）:"
  echo ""
  for vol in "${VOLUMES[@]}"; do
    echo "    $vol"
  done
  echo ""

  read -rp "  本当に削除してよろしいですか？ (Y/N): " confirm2
  if [[ "${confirm2,,}" != "y" ]]; then
    echo ""
    echo "データの削除をスキップしました。"
    echo "コンテナ・イメージのみ削除済みです。"
    _print_clean_done
    return 0
  fi

  echo ""
  echo "データボリュームを削除しています..."
  for vol in "${VOLUMES[@]}"; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      if docker volume rm "$vol" >/dev/null 2>&1; then
        ok "$vol"
      else
        err "$vol の削除に失敗しました"
      fi
    fi
  done

  echo ""
  ok "データボリュームを削除しました"
  _print_clean_done
}

# ------------------------------------
# preflight - 起動前チェック
# ------------------------------------
cmd_preflight() {
  local pf_ok=0 pf_warn=0 pf_err=0

  print_banner "Tax Apps - Preflight Check"

  # 1. Docker Desktop
  if ! docker info >/dev/null 2>&1; then
    err "Docker Desktop is not running"
    echo "  Please start Docker Desktop and try again."
    (( pf_err++ ))
    # Summary (early exit)
    print_banner "Results:  OK=$pf_ok  WARN=$pf_warn  ERROR=$pf_err"
    echo "Errors detected. Please fix them before starting."
    echo ""
    return 1
  else
    ok "Docker Desktop is running"
    (( pf_ok++ ))
  fi

  # 2. docker compose
  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose command not available"
    echo "  Please install Docker Compose V2."
    (( pf_err++ ))
  else
    ok "docker compose is available"
    (( pf_ok++ ))
  fi

  # 3. Compose files
  local compose_found=0 compose_missing=0
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    if [[ -f "$dir/docker-compose.yml" ]]; then
      (( compose_found++ ))
    else
      local name
      name=$(basename "$app")
      warn "Missing: $name/docker-compose.yml"
      (( compose_missing++ ))
      (( pf_warn++ ))
    fi
  done
  if [[ $compose_missing -eq 0 ]]; then
    ok "All $compose_found docker-compose.yml files present"
    (( pf_ok++ ))
  fi

  # 4. Nginx configs
  local nginx_ok=1
  for cfg in "nginx/nginx.conf" "nginx/default.conf" "nginx/includes/upstreams.conf" "nginx/includes/maps.conf"; do
    if [[ ! -f "$PROJECT_ROOT/$cfg" ]]; then
      warn "Missing: $cfg"
      nginx_ok=0
      (( pf_warn++ ))
    fi
  done
  if [[ $nginx_ok -eq 1 ]]; then
    ok "Nginx config files present"
    (( pf_ok++ ))
  fi

  # 5. ITCM .env
  local itcm_env="$PROJECT_ROOT/apps/inheritance-case-management/.env"
  if [[ ! -f "$itcm_env" ]]; then
    if [[ -f "$PROJECT_ROOT/apps/inheritance-case-management/.env.example" ]]; then
      warn "ITCM .env not found. Copy from .env.example:"
      echo "  cp .env.example .env"
    else
      warn "ITCM .env not found"
    fi
    (( pf_warn++ ))
  else
    ok "ITCM .env file exists"
    (( pf_ok++ ))
  fi

  # 6. Port conflicts
  local port_conflict=0
  local ports=(80 3000 3001 3002 3003 3004 3007 3010 3012 3013 3014 3015 3016 3017 3020 3022 5432)
  for p in "${ports[@]}"; do
    if ss -tlnH 2>/dev/null | grep -q ":$p " 2>/dev/null || netstat -tln 2>/dev/null | grep -q ":$p "; then
      warn "Port $p is already in use"
      port_conflict=1
      (( pf_warn++ ))
    fi
  done
  if [[ $port_conflict -eq 0 ]]; then
    ok "No port conflicts detected"
    (( pf_ok++ ))
  fi

  # 7. Disk space
  local free_kb
  free_kb=$(df -k "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
  if [[ $free_kb -lt $((5*1024*1024)) ]]; then
    warn "Low disk space (less than 5GB free)"
    (( pf_warn++ ))
  else
    ok "Disk space OK"
    (( pf_ok++ ))
  fi

  # Summary
  print_banner "Results:  OK=$pf_ok  WARN=$pf_warn  ERROR=$pf_err"

  if [[ $pf_err -gt 0 ]]; then
    echo ""
    echo "Errors detected. Please fix them before starting."
  elif [[ $pf_warn -gt 0 ]]; then
    echo ""
    echo "Warnings detected but no blocking errors."
  else
    echo ""
    echo "All checks passed!"
  fi
  echo ""
}

# ------------------------------------
# メイン
# ------------------------------------
check_dependencies

case "${1:-help}" in
  start)     cmd_start "${2:-}" ;;
  stop)      cmd_stop ;;
  down)      cmd_down ;;
  restart)   cmd_restart "${2:-}" ;;
  build)     cmd_build "${2:-}" ;;
  logs)      cmd_logs "${2:-}" ;;
  status)    cmd_status ;;
  backup)    cmd_backup ;;
  restore)   cmd_restore "${2:-}" ;;
  clean)     cmd_clean ;;
  preflight) cmd_preflight ;;
  *)
    echo "Usage: $0 {start|stop|down|restart|build|logs|status|backup|restore|clean|preflight} [app-name]"
    echo ""
    echo "Commands:"
    echo "  start              全アプリを起動（ネットワーク自動作成）"
    echo "  start --prod       全アプリを本番モードで起動"
    echo "  stop               全アプリを停止"
    echo "  down               全アプリを停止してコンテナ削除"
    echo "  restart <app>      指定アプリのみ再起動"
    echo "  build <app>        指定アプリを再ビルドして起動"
    echo "  logs <app>         指定アプリのログ表示"
    echo "  status             全アプリの状態表示"
    echo ""
    echo "Operations:"
    echo "  backup             全データベース・データをバックアップ"
    echo "  restore [dir]      バックアップからリストア"
    echo "  clean              コンテナ・イメージのクリーンアップ"
    echo "  preflight          起動前チェック"
    echo ""
    echo "Apps:"
    for app in "${APPS[@]}"; do
      echo "  $(basename "$app")"
    done
    ;;
esac
