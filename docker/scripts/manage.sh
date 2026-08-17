#!/usr/bin/env bash
# ============================================
# Tax Apps 個別コンテナ管理スクリプト
# ============================================
#
# Usage:
#   ./manage.sh start              全アプリを起動（ネットワーク自動作成）
#   ./manage.sh start --prod       全アプリを本番モードで起動
#   ./manage.sh recover            落ちているアプリのみ起動し直す（ウォッチドッグ用）
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

# 「意図的に停止した」ことを示すマーカー。stop / down で作成し、start で消す。
#
# ウォッチドッグは停止中のコンテナを見つけると起動し直すが、それだけだと
# stop.bat を押した直後に勝手に起動され、停止操作そのものが成立しなくなる。
# 「落ちている」と「落とした」はコンテナの状態だけでは区別できないので、
# 停止操作の側から明示的に印を残す。
STOP_MARKER="$PROJECT_ROOT/docker/logs/tax-apps-stopped-intentionally"

# 直近の start が dev / prod どちらだったかを記録する。
# アプリ別の記録（下記 APP_MODE_DIR）が無い場合のフォールバックとしてのみ使う。
MODE_STATE="$PROJECT_ROOT/docker/logs/tax-apps-last-start-mode"

# アプリ別のモード記録（1アプリ1ファイル、中身は dev / prod）。
#
# 全体モード1つでは足りない。このリポジトリは実際には混在で動いていて、
# 一部のアプリだけ `cd apps/x && docker compose -f ... -f ...prod.yml up` で
# 個別に本番起動されている。全体モードだけで recover すると、落ちた本番アプリを
# dev サーバとして作り直す（あるいはその逆をやる）ことになる。
#
# 記録は start 任せにしない。上記のとおり manage.sh を通らない起動があるため、
# 「動いている今のうちに」実際の状態から採取する（snapshot_app_modes）。
# 出所は推測ではなく docker compose 自身が付けるラベル
# com.docker.compose.project.config_files で、起動に使った -f の一覧そのもの。
APP_MODE_DIR="$PROJECT_ROOT/docker/logs/app-modes"

# 外部ネットワーク名
NETWORK_NAME="tax-apps-network"

# Windows スケジュールタスク名（各 register-*.ps1 の既定値と一致させること）
#
# この2つが自動起動の全経路。ウォッチドッグが「落ちたら直す」係、スタートアップが
# 「ログオン時に上げる」係で、片方欠けても症状は同じ（起動しない）ので必ず対で見る。
WATCHDOG_TASK_NAME="Tax Apps Docker Watchdog"
STARTUP_TASK_NAME="Tax Apps Startup"

# タスクの存在確認。必ずこれを経由すること。
#
# `schtasks.exe /Query` を Git Bash から直接呼ぶと壊れる。MSYS は `/` 始まりの
# 引数をパスとみなして変換するため、`/Query` が `C:/Program Files/Git/Query` に
# 化け、存在するタスクでも常に「未登録」と判定される。しかも schtasks は
# 使い方エラーで exit 0 を返すので、素朴な `|| echo 未登録` では気づけない。
task_exists() {
  MSYS2_ARG_CONV_EXCL='*' schtasks.exe /Query /TN "$1" >/dev/null 2>&1
}

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
  "apps/capital-gains-calc"
  "apps/inheritance-tax-form"
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
  "stock-valuation-form-postgres"
)

# ------------------------------------
# .env で PostgreSQL のパスワードを持つアプリ
#
# 本番起動時に、開発用の既定値のままなら一意のパスワードを生成して .env に書き戻し、
# 既存の DB ボリュームのロールにも ALTER ROLE で反映する（環境変数だけでは
# 作成済みのロールのパスワードは変わらないため）。
#
# 形式: アプリ名:postgresコンテナ名:既定DB名:パスワード接頭辞:開発用の既定パスワード
# ------------------------------------
POSTGRES_APPS=(
  "private-banking:private-banking-postgres:private_banking:pb:pb_dev_password"
  "stock-valuation-form:svf-postgres:stock_valuation:svf:svf_dev_password"
)

# アプリ名から POSTGRES_APPS の行を引く。見つからなければ 1 を返す。
postgres_app_entry() {
  local name="$1" entry
  for entry in "${POSTGRES_APPS[@]}"; do
    if [[ "${entry%%:*}" == "$name" ]]; then
      printf '%s\n' "$entry"
      return 0
    fi
  done
  return 1
}
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

set_stop_marker() {
  local reason="$1"
  mkdir -p "$(dirname "$STOP_MARKER")"
  {
    echo "reason=$reason"
    echo "stopped_at=$(date -Is 2>/dev/null || date)"
  } > "$STOP_MARKER"
}

clear_stop_marker() {
  rm -f "$STOP_MARKER"
}

write_start_mode() {
  local mode="$1"
  mkdir -p "$(dirname "$MODE_STATE")"
  printf '%s\n' "$mode" > "$MODE_STATE"
}

read_start_mode() {
  local mode=""
  [[ -f "$MODE_STATE" ]] && mode=$(tr -d '\r\n' < "$MODE_STATE")
  case "$mode" in
    prod|dev) printf '%s\n' "$mode" ;;
    # 記録が無い場合は dev 扱い。prod のアプリを勝手に dev で作り直すより、
    # 何もせず status に出す方が安全なので recover 側で未記録を検出する。
    *) printf '%s\n' "unknown" ;;
  esac
}

# 稼働中コンテナから、そのアプリが今どのモードで動いているかを読む。
# 停止中や判定不能なら空文字（呼び出し側が記録済みの値へフォールバックする）。
detect_app_mode() {
  local dir="$1"
  local cname config_files

  cname=$(docker compose -f "$dir/docker-compose.yml" ps --status running \
            --format '{{.Name}}' 2>/dev/null | head -1)
  [[ -z "$cname" ]] && return 0

  config_files=$(docker inspect \
    -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' \
    "$cname" 2>/dev/null)
  [[ -z "$config_files" ]] && return 0

  case "$config_files" in
    *docker-compose.prod.yml*) printf 'prod\n' ;;
    *) printf 'dev\n' ;;
  esac
}

app_mode_file() {
  printf '%s/%s\n' "$APP_MODE_DIR" "$(basename "$1")"
}

read_app_mode() {
  local f; f=$(app_mode_file "$1")
  local mode=""
  [[ -f "$f" ]] && mode=$(tr -d '\r\n' < "$f")
  case "$mode" in
    prod|dev) printf '%s\n' "$mode" ;;
    *) return 0 ;;
  esac
}

_snapshot_one_mode() {
  local dir="$1" _name="$2"
  local mode; mode=$(detect_app_mode "$dir")
  [[ -z "$mode" ]] && return 0
  mkdir -p "$APP_MODE_DIR"
  printf '%s\n' "$mode" > "$(app_mode_file "$dir")"
}

# 稼働中のアプリのモードを記録しておく。落ちてからでは調べようがないので、
# 元気なうちに採取するのが要点。status / recover の両方から毎回呼ぶ。
snapshot_app_modes() {
  for_each_app _snapshot_one_mode
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

read_env_value() {
  local env_file="$1" key="$2"
  sed -n "s/^${key}=//p" "$env_file" | tail -1 | tr -d '\r'
}

set_env_value() {
  local env_file="$1" key="$2" value="$3"
  local tmp_file="${env_file}.tmp.$$"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$env_file" > "$tmp_file"
  mv "$tmp_file" "$env_file"
}

ensure_postgres_password() {
  local name="$1" dir="$2" prefix="$3" dev_password="$4"
  local env_file="$dir/.env"
  local example_file="$dir/.env.example"
  local password

  if [[ ! -f "$env_file" ]]; then
    if [[ ! -f "$example_file" ]]; then
      err "$name: .env and .env.example are missing"
      return 1
    fi
    cp "$example_file" "$env_file"
    log "  .env を作成しました: $name"
  fi

  password=$(read_env_value "$env_file" "POSTGRES_PASSWORD")
  if [[ -z "$password" || "$password" == "change-me" || "$password" == "$dev_password" || ${#password} -lt 24 ]]; then
    password="${prefix}_$(od -An -N24 -tx1 /dev/urandom | tr -d '[:space:]')"
    if [[ ${#password} -lt 40 ]]; then
      err "$name: failed to generate a production database password"
      return 1
    fi
    set_env_value "$env_file" "POSTGRES_PASSWORD" "$password"
    chmod 600 "$env_file" 2>/dev/null || true
    ok "$name: generated a unique production database password"
  fi
}

# POSTGRES_APPS に載っているアプリなら、本番起動の前にパスワードを用意して
# 既存ロールへ反映する。載っていなければ何もしない。
ensure_postgres_production_env() {
  local name="$1" dir="$2"
  local entry container default_db prefix dev_password
  local env_file="$dir/.env"
  local password db_user db_name escaped_password

  entry=$(postgres_app_entry "$name") || return 0
  IFS=':' read -r _ container default_db prefix dev_password <<< "$entry"

  ensure_postgres_password "$name" "$dir" "$prefix" "$dev_password" || return 1
  password=$(read_env_value "$env_file" "POSTGRES_PASSWORD")

  db_user=$(read_env_value "$env_file" "POSTGRES_USER")
  db_name=$(read_env_value "$env_file" "POSTGRES_DB")
  db_user="${db_user:-postgres}"
  db_name="${db_name:-$default_db}"

  if [[ ! "$db_user" =~ ^[A-Za-z_][A-Za-z0-9_]*$ || ! "$db_name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    err "$name: POSTGRES_USER and POSTGRES_DB must be simple SQL identifiers"
    return 1
  fi

  # Start only PostgreSQL first. For an existing development volume, the
  # POSTGRES_PASSWORD environment variable does not update the stored role.
  # Synchronize it explicitly before starting the production web container.
  docker compose -f "$dir/docker-compose.yml" up -d --wait "$container"
  escaped_password=${password//\'/\'\'}
  printf 'ALTER ROLE "%s" WITH PASSWORD '\''%s'\'';\n' "$db_user" "$escaped_password" |
    docker compose -f "$dir/docker-compose.yml" exec -T "$container" \
      psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" >/dev/null
  ok "$name: database credentials are synchronized"
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
    ensure_postgres_production_env "$name" "$dir"
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
  # 起動を指示した時点で「意図的な停止」は解除する（ウォッチドッグの復旧を再開させる）
  clear_stop_marker
  if [[ $prod_mode -eq 1 ]]; then write_start_mode "prod"; else write_start_mode "dev"; fi
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
  set_stop_marker "manage.sh stop"
  for_each_app_reverse _do_compose_action "stop" "停止"
  log "全アプリを停止しました"
  warn "再開するまでウォッチドッグの自動復旧は止まります（start で解除）"
}

cmd_down() {
  log "全アプリを停止・削除します..."
  set_stop_marker "manage.sh down"
  for_each_app_reverse _do_compose_action "down" "削除"
  log "全アプリを削除しました"
  warn "再開するまでウォッチドッグの自動復旧は止まります（start で解除）"
}

# ------------------------------------
# recover - 落ちているアプリだけを起動し直す（ウォッチドッグ用）
#
# start との違いは意図的で、どれもウォッチドッグから無人で（1日2回＋
# ログオン時に）呼ばれることに由来する:
#   - --build しない。再ビルドは数分かかるうえ、dev/prod のイメージを
#     作り替えて別物を起動してしまう
#   - 全アプリではなく「サービスが1つでも走っていないアプリ」だけを対象にする
#   - モードはアプリ単位で、そのアプリが最後に動いていた状態を踏襲する
#   - 意図的に停止中（stop / down / clean 直後）は何もしない
# ------------------------------------
RECOVER_TARGETS=0
RECOVER_SKIPPED=0

_do_recover() {
  local dir="$1" name="$2" fallback_mode="$3"
  local expected running

  expected=$(docker compose -f "$dir/docker-compose.yml" config --services 2>/dev/null | grep -c . || true)
  running=$(docker compose -f "$dir/docker-compose.yml" ps --status running --services 2>/dev/null | grep -c . || true)
  expected=${expected:-0}
  running=${running:-0}

  if [[ "$expected" -eq 0 || "$running" -ge "$expected" ]]; then
    return 0
  fi

  # このアプリが最後に動いていたときのモード。無ければ全体モードで代用する。
  local mode; mode=$(read_app_mode "$dir")
  local mode_source="記録"
  if [[ -z "$mode" ]]; then
    mode="$fallback_mode"
    mode_source="全体"
  fi

  # どちらも分からないなら触らない。prod のアプリを dev で作り直す方が、
  # 落ちたままにしておくより害が大きい。
  if [[ -z "$mode" || "$mode" == "unknown" ]]; then
    RECOVER_SKIPPED=$((RECOVER_SKIPPED + 1))
    warn "  復旧を見送り: $name（モード不明。一度 start すると記録されます）"
    return 0
  fi

  RECOVER_TARGETS=$((RECOVER_TARGETS + 1))
  warn "  復旧: $name（稼働 $running / 定義 $expected・モード $mode［$mode_source］）"

  local compose_files=(-f "$dir/docker-compose.yml")
  if [[ "$mode" == "prod" && -f "$dir/docker-compose.prod.yml" ]]; then
    compose_files+=(-f "$dir/docker-compose.prod.yml")
  fi

  if ! docker compose "${compose_files[@]}" up -d --no-build --remove-orphans; then
    err "  復旧に失敗しました: $name"
  fi
}

# ウォッチドッグがログに残すための1行。ここだけ ASCII で出すのは、
# 呼び出し側が Windows PowerShell で、日本語のログ行はコンソールの
# コードページ次第で化けて拾えなくなるため。
recover_result() {
  echo "RECOVER_RESULT status=$1 recovered=$2 skipped=$3"
}

cmd_recover() {
  if [[ -f "$STOP_MARKER" ]]; then
    log "意図的な停止中のため復旧しません（解除するには start）"
    sed 's/^/  /' "$STOP_MARKER" 2>/dev/null || true
    recover_result "stopped-intentionally" 0 0
    return 0
  fi

  preflight_quick || return 1

  # 復旧の前に、今動いているアプリのモードを採取しておく。次に落ちたときの
  # 判断材料はこれしかない（落ちてからでは調べようがない）。
  snapshot_app_modes

  ensure_network
  RECOVER_TARGETS=0
  RECOVER_SKIPPED=0
  for_each_app _do_recover "$(read_start_mode)"

  if [[ $RECOVER_TARGETS -eq 0 ]]; then
    log "復旧が必要なアプリはありません"
  else
    log "$RECOVER_TARGETS 件のアプリを復旧しました"
  fi
  [[ $RECOVER_SKIPPED -gt 0 ]] && warn "$RECOVER_SKIPPED 件はモード不明のため見送りました"

  recover_result "ok" "$RECOVER_TARGETS" "$RECOVER_SKIPPED"
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

cmd_watch() {
  require_app_arg "watch" "${1:-}"
  local name; name=$(basename "$RESOLVED_DIR")

  if ! grep -q "^\s*develop:" "$RESOLVED_DIR/docker-compose.yml"; then
    err "$name は compose watch に対応していません（docker-compose.yml に develop: がありません）"
    return 1
  fi

  ensure_network
  log "$name のソース同期を開始します（Ctrl+C で終了）"
  # --watch は --detach と併用できないため、これはフォアグラウンドで動かす。
  # --no-up にして起動は cmd_start / cmd_build に任せ、ここは同期だけを担当する。
  #
  # 注意: compose watch は「起動後の変更」しか同期しない（起動前の差分は初期同期
  # されない）。watch を止めている間に編集したものは build で取り込むこと。
  warn "watch 停止中に加えた変更は同期されません。その場合は build $name を実行してください"
  docker compose -f "$RESOLVED_DIR/docker-compose.yml" watch --no-up
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

# unhealthy コンテナの自動再起動が本当に配線されているかを表示する。
#
# 仕組みは「compose の tax-apps.autoheal ラベル」＋「ホスト側の定期タスクが
# docker-watchdog.ps1 を呼ぶ」の2段構え。どちらが欠けても復旧は起きないが、
# 欠けていること自体はどこにも現れない（実際にタスク未登録のまま数ヶ月
# 気づかなかったことがある）ので、status で毎回見えるようにしておく。
_print_autoheal_status() {
  echo "自動復旧（ウォッチドッグ）:"

  if command -v schtasks.exe >/dev/null 2>&1; then
    if task_exists "$WATCHDOG_TASK_NAME"; then
      echo "  復旧タスク（1日2回 8:00/20:00）: 登録済み（$WATCHDOG_TASK_NAME）"
    else
      echo "  復旧タスク（1日2回 8:00/20:00）: ★未登録 — 停止しても unhealthy でも自動復旧されません"
      echo "    登録: docker/scripts/register-docker-watchdog-task.bat をダブルクリック"
    fi

    if task_exists "$STARTUP_TASK_NAME"; then
      echo "  起動タスク（ログオン時）: 登録済み（$STARTUP_TASK_NAME）"
    else
      echo "  起動タスク（ログオン時）: ★未登録 — 再起動後は次の定期実行（最大12時間後）までアプリが上がりません"
      echo "    登録: docker/scripts/register-startup-task.bat をダブルクリック"
    fi
  else
    echo "  スケジュールタスク: 確認不可（schtasks.exe が見つかりません）"
  fi

  if [ -f "$STOP_MARKER" ]; then
    echo "  復旧の一時停止: ★有効 — 意図的な停止中とみなして復旧しません"
    sed 's/^/    /' "$STOP_MARKER" 2>/dev/null || true
    echo "    解除: manage.sh start（または start-prod.bat）"
  fi

  # モードの記録が無いアプリは、落ちても recover が見送る。ウォッチドッグが
  # 登録済みでもそのアプリだけ実質無防備なので、ここに出しておく。
  snapshot_app_modes
  local unrecorded="" _dir
  for _dir in "${APPS[@]}"; do
    [[ -d "$PROJECT_ROOT/$_dir" ]] || continue
    if [[ -z "$(read_app_mode "$PROJECT_ROOT/$_dir")" ]]; then
      unrecorded="$unrecorded $(basename "$_dir")"
    fi
  done

  if [ -n "$unrecorded" ]; then
    echo "  モード未記録:★$unrecorded"
    echo "    （このアプリが落ちても復旧されません。一度起動すれば記録されます）"
  else
    echo "  アプリ別モード: 全アプリ記録済み（$APP_MODE_DIR）"
  fi

  local unlabeled=""
  local cname
  while read -r cname; do
    [ -z "$cname" ] && continue
    # healthcheck を持たないコンテナは autoheal の対象外なので数えない。
    if [ "$(docker inspect -f '{{if .State.Health}}1{{end}}' "$cname" 2>/dev/null)" != "1" ]; then
      continue
    fi
    if [ "$(docker inspect -f '{{index .Config.Labels "tax-apps.autoheal"}}' "$cname" 2>/dev/null)" != "true" ]; then
      unlabeled="$unlabeled $cname"
    fi
  done < <(docker ps --format '{{.Names}}' 2>/dev/null)

  if [ -n "$unlabeled" ]; then
    echo "  autoheal ラベル無し:★$unlabeled"
  else
    echo "  autoheal ラベル: 稼働中の healthcheck 付きコンテナすべてに付与済み"
  fi
  echo ""
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
  _print_autoheal_status
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
  set_stop_marker "manage.sh clean"
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
# Dockerfile の CRLF ガード検査
# ------------------------------------
# CRLF のまま Linux コンテナへ入った docker-entrypoint.sh は BusyBox sh が
# `set: line 2: illegal option -` で即死し、CrashLoop になる。Windows の
# core.autocrlf でチェックアウトされた作業ツリーは git status がクリーンなまま
# CRLF を保持するので、上流を直しても各PCの手元は直らない。そのため各 Dockerfile が
# `sed -i 's/\r$//'` でイメージに入る直前に正規化して防いでいる。
#
# ただしこれはステージ単位の対策で、ステージを増やしたときに片方だけ抜けても
# healthcheck もビルドも通ってしまう（実際に stock-valuation-form の dev だけ
# 抜けていて、本番は無事なのに dev が CrashLoop していた）。
#
# 検査する不変条件は「entrypoint を ENTRYPOINT/CMD に指定しているステージは、
# 自分か祖先のどこかで必ずガードを通っていること」。FROM の継承を辿るのは、
# bank-analyzer-django のように親でガードして子で CMD だけ差し替える書き方が
# 実在するため（辿らないと誤検知になる）。
#
# ガードを欠くステージ名を1行ずつ出力する。無ければ何も出力しない。
dockerfile_missing_crlf_guard() {
  local dockerfile="$1"
  local -A parent=() guarded=() uses=()
  local order=() stage="" line base name

  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*[Ff][Rr][Oo][Mm][[:space:]]+([^[:space:]]+)([[:space:]]+[Aa][Ss][[:space:]]+([^[:space:]]+))? ]]; then
      base="${BASH_REMATCH[1]}"
      name="${BASH_REMATCH[3]}"
      # AS 名の無いステージも順序で一意にしておく（継承元にはなれない）
      [[ -n "$name" ]] || name="stage#${#order[@]}"
      stage="$name"
      order+=("$stage")
      parent["$stage"]="$base"
      guarded["$stage"]=0
      uses["$stage"]=0
      continue
    fi
    [[ -n "$stage" ]] || continue
    [[ "$line" == *docker-entrypoint* ]] || continue

    # sed / tr / dos2unix のどれでも正規化とみなす（書き方を縛らない）
    if [[ "$line" == *dos2unix* ]] || { [[ "$line" == *sed* || "$line" == *tr* ]] && [[ "$line" == *'\r'* ]]; }; then
      guarded["$stage"]=1
    elif [[ "$line" =~ ^[[:space:]]*([Ee][Nn][Tt][Rr][Yy][Pp][Oo][Ii][Nn][Tt]|[Cc][Mm][Dd])[[:space:]] ]]; then
      uses["$stage"]=1
    fi
  done < "$dockerfile"

  local cur hops found
  for stage in ${order[@]+"${order[@]}"}; do
    [[ "${uses[$stage]}" == 1 ]] || continue
    cur="$stage"
    hops=0
    found=0
    # 祖先を辿る。親がステージ名でなければ（外部イメージ）そこで打ち切り。
    while [[ -n "$cur" && $hops -lt 32 ]]; do
      if [[ "${guarded[$cur]:-0}" == 1 ]]; then
        found=1
        break
      fi
      cur="${parent[$cur]:-}"
      [[ -n "${guarded[$cur]+set}" ]] || break
      hops=$((hops + 1))
    done
    [[ $found -eq 1 ]] || printf '%s\n' "$stage"
  done
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

  # 8. Watchdog scheduled task
  #
  # 未登録でも起動そのものは通るので、これは警告に留める。ただし未登録の間は
  # Docker が落ちても停止したコンテナがあっても誰も直さないため、preflight と
  # status の両方から見えるようにしておく（過去に数ヶ月間気づかなかった）。
  if command -v schtasks.exe >/dev/null 2>&1; then
    if task_exists "$WATCHDOG_TASK_NAME"; then
      ok "Docker watchdog task is registered"
      ((++pf_ok))
    else
      warn "Docker watchdog task is NOT registered: $WATCHDOG_TASK_NAME"
      echo "  Register it: docker/scripts/register-docker-watchdog-task.bat"
      ((++pf_warn))
    fi

    if task_exists "$STARTUP_TASK_NAME"; then
      ok "Logon startup task is registered"
      ((++pf_ok))
    else
      warn "Logon startup task is NOT registered: $STARTUP_TASK_NAME"
      echo "  Register it: docker/scripts/register-startup-task.bat"
      ((++pf_warn))
    fi
  fi

  # 9. Port conflicts
  local port_conflict=0
  local tax_apps_ports=()
  # 実際に host へ publish しているポートに合わせること。ここに載っていない
  # ポートの競合は preflight を素通りし、起動時に初めて bind 失敗として出る。
  local ports=(80 3000 3001 3002 3003 3004 3007 3010 3013 3014 3015 3016 3017 3019 3020 3021 3022 3025 3026 3030)
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

  # 13. Dockerfile の CRLF ガード
  #
  # ビルドが通ってしまう類の抜けなので、アプリを追加したときにここで落とす。
  local guard_checked=0 guard_missing=0 entry dockerfile missing_stages
  while IFS= read -r entry; do
    dockerfile="$(dirname "$entry")/Dockerfile"
    [[ -f "$dockerfile" ]] || continue
    ((++guard_checked))
    missing_stages="$(dockerfile_missing_crlf_guard "$dockerfile" | tr '\n' ' ')"
    if [[ -n "${missing_stages// /}" ]]; then
      warn "CRLF guard missing: ${dockerfile#"$PROJECT_ROOT/"} (stage: ${missing_stages% })"
      echo "  Add to that stage: RUN sed -i 's/\\r\$//' <path>/docker-entrypoint.sh && chmod +x <path>/docker-entrypoint.sh"
      guard_missing=1
      ((++pf_warn))
    fi
  done < <(find "$PROJECT_ROOT/apps" -name docker-entrypoint.sh -not -path '*/node_modules/*' 2>/dev/null)
  if [[ $guard_missing -eq 0 ]]; then
    ok "CRLF guard present in all $guard_checked entrypoint Dockerfiles"
    ((++pf_ok))
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
  start|stop|down|restart|build|clean|clean-cache|recover)
    acquire_operation_lock "$COMMAND"
    ;;
esac

case "$COMMAND" in
  start)     cmd_start "${2:-}" ;;
  recover)   cmd_recover ;;
  stop)      cmd_stop ;;
  down)      cmd_down ;;
  restart)   cmd_restart "${2:-}" ;;
  build)     cmd_build "${2:-}" ;;
  watch)     cmd_watch "${2:-}" ;;
  logs)      cmd_logs "${2:-}" ;;
  status)    cmd_status ;;
  backup)    "$SCRIPT_DIR/backup.sh" backup ;;
  restore)   "$SCRIPT_DIR/backup.sh" restore "${2:-}" ;;
  verify)    "$SCRIPT_DIR/backup.sh" verify "${2:-}" ;;
  drill)     "$SCRIPT_DIR/backup.sh" drill "${2:-}" ;;
  clean)     cmd_clean ;;
  clean-cache) cmd_clean_cache "${2:-}" ;;
  preflight) cmd_preflight ;;
  *)
    echo "Usage: $0 {start|recover|stop|down|restart|build|watch|logs|status|backup|restore|verify|drill|clean|clean-cache|preflight} [app-name]"
    echo ""
    echo "Commands:"
    echo "  start              全アプリを起動（ネットワーク自動作成）"
    echo "  start --prod       全アプリを本番モードで起動"
    echo "  recover            落ちているアプリだけを起動し直す（ウォッチドッグ用・再ビルドなし）"
    echo "  stop               全アプリを停止"
    echo "  down               全アプリを停止してコンテナ削除"
    echo "  restart <app>      指定アプリのみ再起動"
    echo "  build <app>        指定アプリを再ビルドして起動"
    echo "  watch <app>        ソース変更をコンテナへ同期（フォアグラウンド、Ctrl+C で終了）"
    echo "  logs <app>         指定アプリのログ表示"
    echo "  status             全アプリの状態表示"
    echo ""
    echo "Operations:"
    echo "  backup             全データベース・データをバックアップ"
    echo "  restore [dir]      バックアップからリストア"
    echo "  verify <backup>    バックアップの復号とハッシュ照合"
    echo "  drill [backup]     リストア訓練（使い捨てDBへ実際に復元して検証。既定は最新）"
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
