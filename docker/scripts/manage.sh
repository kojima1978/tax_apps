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
#   ./manage.sh clean-cache        古い Docker Build Cache の削除
#   ./manage.sh preflight          起動前チェック
#
# ============================================

set -euo pipefail

bootstrap_path() {
  case ":$PATH:" in
    *":/usr/bin:"*) ;;
    *) PATH="/usr/local/bin:/usr/bin:/bin:$PATH" ;;
  esac

  local docker_bin="/c/Program Files/Docker/Docker/resources/bin"
  if [[ -d "$docker_bin" ]]; then
    case ":$PATH:" in
      *":$docker_bin:"*) ;;
      *) PATH="$PATH:$docker_bin" ;;
    esac
  fi
}

bootstrap_path

# プロジェクトルート（docker/ の親ディレクトリ）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_DIR="${TMPDIR:-/tmp}/tax-apps-docker-ops.lock"
LOCK_HELD=0

# 外部ネットワーク名
NETWORK_NAME="tax-apps-network"

# バックアップディレクトリ

# ------------------------------------
# アプリ一覧（起動順序を考慮）
# DB依存アプリを先に、gateway は最後（upstream DNS解決のため）
# ------------------------------------
APPS=(
  "apps/inheritance-case-management"
  "apps/bank-analyzer-django"
  "apps/tax-docs"
  "apps/medical-stock-valuation"
  "apps/insurance-app"
  "apps/private-banking"
  "apps/inheritance-tax-app"
  "apps/gift-tax-simulator"
  "apps/inheritance-tax-docs"
  "apps/retirement-tax-calc"
  "apps/depreciation-calc"
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
  "private-banking_private_banking_postgres"
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

release_operation_lock() {
  if [[ "$LOCK_HELD" -eq 1 ]]; then
    rm -rf "$LOCK_DIR"
    LOCK_HELD=0
  fi
}

acquire_operation_lock() {
  local action="${1:-operation}"
  local owner_pid=""

  if [[ -f "$LOCK_DIR/owner" ]]; then
    owner_pid="$(sed -n 's/^pid=//p' "$LOCK_DIR/owner" | head -1)"
  fi

  if [[ -n "$owner_pid" ]] && ! kill -0 "$owner_pid" 2>/dev/null; then
    warn "Removing stale operation lock: $LOCK_DIR"
    rm -rf "$LOCK_DIR"
  fi

  if mkdir "$LOCK_DIR" 2>/dev/null; then
    LOCK_HELD=1
    {
      echo "pid=$$"
      echo "action=$action"
      echo "started_at=$(date -Is 2>/dev/null || date)"
      echo "script=$0"
    } > "$LOCK_DIR/owner"
    trap release_operation_lock EXIT INT TERM
    return 0
  fi

  err "Another Tax Apps Docker operation is already running."
  if [[ -f "$LOCK_DIR/owner" ]]; then
    sed 's/^/  /' "$LOCK_DIR/owner" >&2 || true
  else
    err "Lock directory: $LOCK_DIR"
  fi
  return 1
}

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

preflight_quick() {
  if ! docker info >/dev/null 2>&1; then
    err "Docker Desktop is not running"
    echo "  Please start Docker Desktop and try again."
    return 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose command not available"
    echo "  Please install Docker Compose V2."
    return 1
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
  local _cmd_name="$1"
  local app_name="${2:?アプリ名を指定してください}"
  RESOLVED_DIR=$(resolve_app_dir "$app_name")
}

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
      docker compose -f "$dir/docker-compose.yml" -f "$prod_compose" up -d --build --remove-orphans
    else
      log "  起動[本番]: $name"
      docker compose -f "$dir/docker-compose.yml" up -d --build --remove-orphans
    fi
  else
    log "  起動: $name"
    docker compose -f "$dir/docker-compose.yml" up -d --remove-orphans
  fi
}

# --- stop/down用コールバック ---
_do_compose_action() {
  local dir="$1" name="$2" action="$3" label="$4"
  log "  $label: $name"
  docker compose -f "$dir/docker-compose.yml" "$action"
}

cmd_start() {
  local prod_mode=0
  [[ "${1:-}" == "--prod" ]] && prod_mode=1
  preflight_quick
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
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" up -d --build --remove-orphans
  log "$(basename "$RESOLVED_DIR") のビルドが完了しました"
}

cmd_logs() {
  require_app_arg "logs" "${1:-}"
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" logs -f
}

_do_status() {
  local dir="$1" name="$2"
  docker compose -f "$dir/docker-compose.yml" ps -a --format \
    "{{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | \
    while IFS=$'\t' read -r cname cstatus cports; do
      local inspect health restarts oom
      inspect=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}	{{.RestartCount}}	{{.State.OOMKilled}}' "$cname" 2>/dev/null || true)
      IFS=$'\t' read -r health restarts oom <<< "$inspect"
      health=${health:-unknown}
      restarts=${restarts:-?}
      oom=${oom:-?}
      printf "%-35s %-28s %-10s %-8s %-10s %s\n" "$cname" "$cstatus" "$health" "$restarts" "$oom" "$cports"
    done
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
  printf "%-35s %-28s %-10s %-8s %-10s %s\n" "CONTAINER" "STATUS" "HEALTH" "RESTARTS" "OOMKILLED" "PORTS"
  echo "----------------------------------------------------------------------------------------------------"
  for_each_app _do_status
  echo "========================================"
  echo ""
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

print_docker_disk_usage() {
  if docker system df >/dev/null 2>&1; then
    docker system df
  else
    warn "Docker disk usage could not be checked"
  fi
}

port_is_listening() {
  local port="$1"

  if ss -tlnH 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]" 2>/dev/null; then
    return 0
  fi

  if netstat -tln 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]"; then
    return 0
  fi

  if netstat -ano -p tcp 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]"; then
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >/dev/null 2>&1 && return 0
  fi

  return 1
}

is_managed_compose_project() {
  local project="$1"
  local app name

  for app in "${APPS[@]}"; do
    name=$(basename "$app")
    if [[ "$project" == "$name" ]]; then
      return 0
    fi
  done

  return 1
}

tax_apps_container_for_port() {
  local port="$1"
  local cname cports project

  while IFS=$'\t' read -r cname cports; do
    [[ -z "$cname" ]] && continue
    [[ "$cports" == *":${port}->"* ]] || continue

    project=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$cname" 2>/dev/null || true)
    if is_managed_compose_project "$project"; then
      echo "$cname"
      return 0
    fi
  done < <(docker ps --format '{{.Names}}	{{.Ports}}' 2>/dev/null || true)

  return 1
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
  confirm1="${confirm1//$'\r'/}"
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

  echo "  続行するには DELETE DATA と入力してください。"
  read -rp "  入力: " confirm2
  confirm2="${confirm2//$'\r'/}"
  if [[ "$confirm2" != "DELETE DATA" ]]; then
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
# clean-cache - Docker Build Cache の安全な削除
# ------------------------------------
cmd_clean_cache() {
  local mode="${1:-}"
  local prune_args=(builder prune --force --filter "until=168h")

  print_banner "Tax Apps - Docker Build Cache Cleanup"
  echo "  削除対象: Docker Build Cache のみ"
  echo "  保持対象: コンテナ、イメージ、ボリューム、DBデータ"
  echo ""

  case "$mode" in
    "")
      echo "  モード: 7日以上使われていない Build Cache を削除"
      ;;
    --all)
      warn "モード: 未使用の Build Cache をすべて削除"
      warn "次回ビルドは少し遅くなる可能性があります。"
      prune_args=(builder prune --all --force)
      ;;
    *)
      err "Unknown option: $mode"
      echo "Usage: $0 clean-cache [--all]"
      return 1
      ;;
  esac

  echo ""
  echo "Before:"
  print_docker_disk_usage
  echo ""

  local confirm
  if ! read -rp "  Build Cache を削除してよろしいですか？ (Y/N): " confirm; then
    echo ""
    echo "キャンセルしました。"
    return 1
  fi

  confirm="${confirm//$'\r'/}"
  if [[ "${confirm,,}" != "y" ]]; then
    echo ""
    echo "キャンセルしました。"
    return 0
  fi

  echo ""
  docker "${prune_args[@]}"
  echo ""
  echo "After:"
  print_docker_disk_usage
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
    ((++pf_err))
    # Summary (early exit)
    print_banner "Results:  OK=$pf_ok  WARN=$pf_warn  ERROR=$pf_err"
    echo "Errors detected. Please fix them before starting."
    echo ""
    return 1
  else
    ok "Docker Desktop is running"
    ((++pf_ok))
  fi

  # 2. docker compose
  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose command not available"
    echo "  Please install Docker Compose V2."
    ((++pf_err))
  else
    ok "docker compose is available"
    ((++pf_ok))
  fi

  # 3. Compose files
  local compose_found=0 compose_missing=0
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    if [[ -f "$dir/docker-compose.yml" ]]; then
      ((++compose_found))
    else
      local name
      name=$(basename "$app")
      warn "Missing: $name/docker-compose.yml"
      ((++compose_missing))
      ((++pf_warn))
    fi
  done
  if [[ $compose_missing -eq 0 ]]; then
    ok "All $compose_found docker-compose.yml files present"
    ((++pf_ok))
  fi

  # 4. Compose config validation
  local compose_invalid=0
  for app in "${APPS[@]}"; do
    local dir="$PROJECT_ROOT/$app"
    local name
    name=$(basename "$app")
    if [[ -f "$dir/docker-compose.yml" ]]; then
      local compose_files=(-f "$dir/docker-compose.yml")
      if [[ -f "$dir/docker-compose.prod.yml" ]]; then
        compose_files+=(-f "$dir/docker-compose.prod.yml")
      fi
      if ! docker compose "${compose_files[@]}" config --quiet >/dev/null; then
        warn "Compose config validation failed: $name"
        compose_invalid=1
        ((++pf_warn))
      fi
    fi
  done
  if [[ $compose_invalid -eq 0 ]]; then
    ok "Compose config validation passed"
    ((++pf_ok))
  fi

  # 5. Nginx configs
  local nginx_ok=1
  for cfg in "nginx/nginx.conf" "nginx/default.conf" "nginx/includes/upstreams.conf" "nginx/includes/maps.conf" "nginx/includes/proxy_params.conf"; do
    if [[ ! -f "$PROJECT_ROOT/$cfg" ]]; then
      warn "Missing: $cfg"
      nginx_ok=0
      ((++pf_warn))
    fi
  done
  if [[ $nginx_ok -eq 1 ]]; then
    ok "Nginx config files present"
    ((++pf_ok))
  fi

  # 6. ITCM .env
  local itcm_env="$PROJECT_ROOT/apps/inheritance-case-management/.env"
  if [[ ! -f "$itcm_env" ]]; then
    if [[ -f "$PROJECT_ROOT/apps/inheritance-case-management/.env.example" ]]; then
      warn "ITCM .env not found. Copy from .env.example:"
      echo "  cp .env.example .env"
    else
      warn "ITCM .env not found"
    fi
    ((++pf_warn))
  else
    ok "ITCM .env file exists"
    ((++pf_ok))
  fi

  # 7. Encrypted backup freshness
  local backup_base="$PROJECT_ROOT/docker/backups"
  local backup_key="${BACKUP_KEY_FILE:-$HOME/.tax-apps/backup.key}"
  local latest_backup=""
  latest_backup=$(find "$backup_base" -maxdepth 1 -type f -name '*.tar.gz.enc' -print 2>/dev/null |
    while IFS= read -r file; do printf '%s\t%s\n' "$(stat -c %Y "$file" 2>/dev/null || echo 0)" "$file"; done |
    sort -nr | head -1 | cut -f2-)
  if [[ -z "$latest_backup" ]]; then
    warn "No encrypted full backup found. Run: ./manage.sh backup"
    ((++pf_warn))
  else
    local backup_mtime backup_age_hours
    backup_mtime=$(stat -c %Y "$latest_backup" 2>/dev/null || echo 0)
    backup_age_hours=$(( ($(date +%s) - backup_mtime) / 3600 ))
    if [[ $backup_age_hours -gt ${BACKUP_MAX_AGE_HOURS:-26} ]]; then
      warn "Latest encrypted backup is ${backup_age_hours} hours old: $(basename "$latest_backup")"
      ((++pf_warn))
    else
      ok "Encrypted backup is current: $(basename "$latest_backup")"
      ((++pf_ok))
    fi
  fi
  if [[ ! -s "$backup_key" ]]; then
    warn "Backup key not found yet: $backup_key"
    ((++pf_warn))
  else
    ok "Backup key exists outside repository"
    ((++pf_ok))
  fi

  # 暗号化導入前の平文バックアップには .env や個人情報が含まれるため、
  # 残存していれば正常扱いせず明示的に警告する。
  local plaintext_backup_count=0
  plaintext_backup_count=$(find "$backup_base" -maxdepth 1 -type d \
    \( -name '????-??-??_??????' -o -name 'pre-restore_????-??-??_??????' \) \
    -print 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$plaintext_backup_count" -gt 0 ]]; then
    warn "docker/backups に平文バックアップディレクトリが ${plaintext_backup_count} 件残っています"
    echo "  暗号化バックアップを検証後、平文コピーを移行または安全に削除してください。"
    ((++pf_warn))
  fi

  # 9. Port conflicts
  local port_conflict=0
  local tax_apps_ports=()
  local ports=(80 3000 3001 3002 3003 3004 3007 3010 3012 3013 3014 3015 3017 3020 3022 5432)
  for p in "${ports[@]}"; do
    local owner
    if owner=$(tax_apps_container_for_port "$p"); then
      tax_apps_ports+=("$p/$owner")
    elif port_is_listening "$p"; then
      warn "Port $p is already in use"
      port_conflict=1
      ((++pf_warn))
    fi
  done
  if [[ ${#tax_apps_ports[@]} -gt 0 ]]; then
    ok "Ports already used by Tax Apps: ${tax_apps_ports[*]}"
  fi
  if [[ $port_conflict -eq 0 ]]; then
    ok "No external port conflicts detected"
    ((++pf_ok))
  fi

  # 10. Host disk space
  local free_kb
  free_kb=$(df -k "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
  if [[ $free_kb -lt $((5*1024*1024)) ]]; then
    warn "Low disk space (less than 5GB free)"
    ((++pf_warn))
  else
    ok "Disk space OK"
    ((++pf_ok))
  fi

  # 11. Docker daemon memory
  local docker_mem_bytes
  docker_mem_bytes=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo "0")
  if [[ "$docker_mem_bytes" =~ ^[0-9]+$ && "$docker_mem_bytes" -gt 0 ]]; then
    local min_mem_bytes=$((4*1024*1024*1024))
    local docker_mem_gb=$((docker_mem_bytes / 1024 / 1024 / 1024))
    if [[ "$docker_mem_bytes" -lt "$min_mem_bytes" ]]; then
      warn "Docker memory is low (${docker_mem_gb}GB). 4GB+ is recommended for local all-app startup."
      ((++pf_warn))
    else
      ok "Docker memory OK (${docker_mem_gb}GB)"
      ((++pf_ok))
    fi
  else
    warn "Docker memory could not be checked"
    ((++pf_warn))
  fi

  # 12. Docker disk usage
  if docker system df >/dev/null 2>&1; then
    echo ""
    echo "Docker disk usage:"
    print_docker_disk_usage
    ok "Docker disk usage checked"
    ((++pf_ok))
  else
    warn "Docker disk usage could not be checked"
    ((++pf_warn))
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

COMMAND="${1:-help}"
case "$COMMAND" in
  start|stop|down|restart|build|clean|clean-cache)
    acquire_operation_lock "$COMMAND"
    ;;
esac

case "$COMMAND" in
  start)     cmd_start "${2:-}" ;;
  stop)      cmd_stop ;;
  down)      cmd_down ;;
  restart)   cmd_restart "${2:-}" ;;
  build)     cmd_build "${2:-}" ;;
  logs)      cmd_logs "${2:-}" ;;
  status)    cmd_status ;;
  backup)    "$SCRIPT_DIR/backup.sh" backup ;;
  restore)   "$SCRIPT_DIR/backup.sh" restore "${2:-}" ;;
  verify)    "$SCRIPT_DIR/backup.sh" verify "${2:-}" ;;
  clean)     cmd_clean ;;
  clean-cache) cmd_clean_cache "${2:-}" ;;
  preflight) cmd_preflight ;;
  *)
    echo "Usage: $0 {start|stop|down|restart|build|logs|status|backup|restore|verify|clean|clean-cache|preflight} [app-name]"
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
    echo "  clean-cache [--all] Docker Build Cache の削除（通常は7日以上未使用のみ）"
    echo "  preflight          起動前チェック"
    echo ""
    echo "Apps:"
    for app in "${APPS[@]}"; do
      echo "  $(basename "$app")"
    done
    ;;
esac
