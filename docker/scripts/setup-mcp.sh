#!/usr/bin/env bash
# ============================================
# Claude デスクトップへ tax-apps の MCP サーバーを登録する
# ============================================
#
# clone した PC で、
#   1. MCP サーバーのイメージを作り（リポジトリ直下から compose を叩く）
#   2. 共有ネットワークが無ければ作り
#   3. %APPDATA%\Claude\claude_desktop_config.json へ tax-apps を足す
# までを1回で済ませる。**既存の設定は残してマージし、変更前に控えを取る**
# ── 人が自分で足したほかの MCP サーバーの設定を消さないため。
#
# Usage:
#   docker/scripts/setup-mcp.sh                 登録する（イメージ作成込み）
#   docker/scripts/setup-mcp.sh --dry-run       何も書かずに、どう変わるかだけ見る
#   docker/scripts/setup-mcp.sh --no-build      設定の登録だけ（イメージは作らない）
#   docker/scripts/setup-mcp.sh --config PATH   設定ファイルの場所を指定する
#
# 終了コード: 0 正常 / 1 環境の問題（Docker・設定ファイルの場所）
#             2 引数の誤り / 3 いまの設定が読めない（このときは1バイトも書かない）
#
# 設定ファイルは**リポジトリの外**（個人の設定なので公開リポジトリに入れない）。
# JSON のマージはホストの node / python に頼らず、docker の中の node で行う
# （別の PC に入っている保証が無い。ホストへ入れるのも方針に反する）。
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

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 色つきログ・to_win_path は manage.sh / backup.sh と共有する。
source "$SCRIPT_DIR/lib/ops-common.sh"
# ビルドを伴う compose は必ずリポジトリ直下から叩く（bake の読み取り範囲が cwd 基準）。
source "$SCRIPT_DIR/lib/compose-build.sh"

log() { printf '%s[INFO]%s  %s\n' "$OPS_C_INFO" "$OPS_C_OFF" "$*"; }

NETWORK_NAME="tax-apps-network"
SERVER_KEY="tax-apps"
IMAGE_NAME="tax-apps-mcp"
COMPOSE_FILE="$PROJECT_ROOT/apps/mcp-server/docker-compose.yml"
MERGE_PROGRAM="$SCRIPT_DIR/lib/merge-mcp-config.js"

# Claude デスクトップへ渡す起動コマンド。compose の environment は docker run からは
# 読まれないので、接続先を変えるときは args に -e SVF_API_BASE=... を足す。
ENTRY_JSON='{"command":"docker","args":["run","-i","--rm","--network","'"$NETWORK_NAME"'","'"$IMAGE_NAME"'"]}'

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
}

dry_run=0
no_build=0
config_path=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --no-build) no_build=1 ;;
    --config)
      shift
      [[ $# -gt 0 ]] || { err "--config のあとに設定ファイルのパスが必要です"; exit 2; }
      config_path="$1"
      ;;
    -h|--help) usage; exit 0 ;;
    *) err "知らない引数です: $1"; echo; usage >&2; exit 2 ;;
  esac
  shift
done

# ------------------------------------
# node のイメージは Dockerfile の ARG NODE_VERSION から引く
# （タグをここにも書くと、片方だけ古いまま黙って動く）
# ------------------------------------
node_image() {
  local version
  version="$(sed -n 's/^ARG NODE_VERSION=\([0-9][0-9]*\).*/\1/p' \
    "$PROJECT_ROOT/apps/mcp-server/Dockerfile" | head -1)"
  printf 'node:%s-alpine\n' "${version:-22}"
}

# ------------------------------------
# 設定ファイルの場所
# ------------------------------------
# Git Bash の $APPDATA は Windows 形式（C:\Users\...）なので cygpath で直す。
resolve_config_path() {
  if [[ -n "$config_path" ]]; then
    printf '%s\n' "$config_path"
    return 0
  fi
  local base=""
  if [[ -n "${APPDATA:-}" ]]; then
    if command -v cygpath >/dev/null 2>&1; then
      base="$(cygpath -u "$APPDATA")"
    else
      base="$APPDATA"
    fi
  elif [[ -d "$HOME/AppData/Roaming" ]]; then
    base="$HOME/AppData/Roaming"
  fi
  [[ -n "$base" ]] || return 1
  printf '%s\n' "$base/Claude/claude_desktop_config.json"
}

# ------------------------------------
# 1. Docker が応答するか
# ------------------------------------
if ! docker info >/dev/null 2>&1; then
  err "Docker が応答しません。Docker Desktop を起動してから叩き直してください。"
  exit 1
fi

# ------------------------------------
# 2. MCP サーバーのイメージ
# ------------------------------------
if (( dry_run )) || (( no_build )); then
  log "イメージの作成は行いません（$( ((dry_run)) && echo --dry-run || echo --no-build )）"
else
  log "MCP サーバーのイメージを作成します（profiles: mcp なので通常の起動対象には入りません）..."
  compose_from_project_root -f "$COMPOSE_FILE" --profile mcp build mcp-server
  ok "イメージ $IMAGE_NAME を作成しました"
fi

if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  warn "イメージ $IMAGE_NAME がまだありません。登録しても Claude デスクトップからは起動できないので、"
  warn "あとで docker/scripts/setup-mcp.sh（引数なし）を叩いてください。"
fi

# ------------------------------------
# 3. 共有ネットワーク
# ------------------------------------
if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  log "ネットワーク $NETWORK_NAME があります"
elif (( dry_run )); then
  warn "ネットワーク $NETWORK_NAME がありません（--dry-run なので作りません）"
else
  log "ネットワーク $NETWORK_NAME を作成..."
  docker network create "$NETWORK_NAME" >/dev/null
  ok "ネットワーク $NETWORK_NAME を作成しました"
fi

# ------------------------------------
# 4. いまの設定を読む
# ------------------------------------
config_file="$(resolve_config_path)" || {
  err "Claude デスクトップの設定ファイルの場所が分かりません（\$APPDATA が無い）。"
  err "--config '/c/Users/<ユーザー>/AppData/Roaming/Claude/claude_desktop_config.json' のように渡してください。"
  exit 1
}

existing=""
if [[ -f "$config_file" ]]; then
  log "いまの設定: $(to_win_path "$config_file")"
  existing="$(cat "$config_file")"
else
  log "設定ファイルがまだありません。新しく作ります: $(to_win_path "$config_file")"
fi

# ------------------------------------
# 5. マージ（docker の中の node。ホストには何も入れない）
# ------------------------------------
merge_stderr="$(mktemp)"
trap 'rm -f "$merge_stderr"' EXIT

merge_rc=0
export MCP_SERVER_KEY="$SERVER_KEY" MCP_CONFIG_JSON="$existing" MCP_ENTRY_JSON="$ENTRY_JSON"
merged="$(docker run --rm -i --network none \
  -e MCP_SERVER_KEY -e MCP_CONFIG_JSON -e MCP_ENTRY_JSON \
  "$(node_image)" node < "$MERGE_PROGRAM" 2>"$merge_stderr")" || merge_rc=$?
unset MCP_SERVER_KEY MCP_CONFIG_JSON MCP_ENTRY_JSON

status="$(sed -n 's/^status=//p' "$merge_stderr" | tail -1)"
others="$(sed -n 's/^others=//p' "$merge_stderr" | tail -1)"

if (( merge_rc != 0 )) || [[ -z "$status" || "$status" == "error" ]]; then
  err "設定を作り直せませんでした。設定ファイルには何も書いていません。"
  grep -v '^status=\|^others=' "$merge_stderr" >&2 || true
  exit $(( merge_rc == 0 ? 3 : merge_rc ))
fi

if [[ -n "$others" ]]; then
  log "ほかの MCP サーバーの設定はそのまま残します: $others"
fi

# ------------------------------------
# 6. 書き戻す（控えを取ってから）
# ------------------------------------
if [[ "$status" == "same" ]]; then
  ok "すでに $SERVER_KEY が同じ内容で登録されています（設定は変えていません）"
elif (( dry_run )); then
  log "--dry-run なので書きません。こう変わります（status=$status）:"
  printf '%s\n' "$merged"
else
  mkdir -p "$(dirname "$config_file")"
  if [[ -f "$config_file" ]]; then
    backup="$config_file.bak.$(date +%Y%m%d-%H%M%S)"
    cp -p "$config_file" "$backup"
    ok "変更前の控え: $(to_win_path "$backup")"
  fi
  tmp_file="$config_file.tmp.$$"
  printf '%s\n' "$merged" > "$tmp_file"
  mv -f "$tmp_file" "$config_file"
  case "$status" in
    created) ok "設定ファイルを作って $SERVER_KEY を登録しました" ;;
    added) ok "$SERVER_KEY を追加しました（ほかの設定はそのまま）" ;;
    *) ok "$SERVER_KEY の登録内容を更新しました" ;;
  esac
fi

echo
echo "登録した内容:"
printf '  %s\n' "$ENTRY_JSON"
echo
echo "このあと:"
echo "  1. Claude デスクトップを完全に終了して開き直す（設定は起動時にしか読まれない）"
echo "  2. 株式評価明細書を動かしておく（docker/scripts/manage.sh status で確認、止まっていれば start）"
echo "  3. 取込の前に、その案件を開いている画面のタブを閉じる（自動保存が後から上書きする）"
echo "  4. 手順は apps/mcp-server/INTAKE.md（AI 向け）／ apps/mcp-server/README.md（人向け）"
