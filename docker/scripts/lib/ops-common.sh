#!/usr/bin/env bash
# ============================================
# manage.sh / backup.sh 共通の土台
# ============================================
#
# ここに置くのは「2つのスクリプトでズレると事故になるもの」だけ。
# 汎用ユーティリティの置き場ではない。
#
# 実際、両者が別々に持っていた操作ロックの実装がズレていたせいで、
# 週次のリストア訓練が2週間まるごと黙って飛んでいた
# （docker/logs/restore-drill.log に "already running" が残るだけだった）。
#
# 使い方:
#   SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
#   source "$SCRIPT_DIR/lib/ops-common.sh"
# ============================================

OPS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_PROJECT_ROOT="$(cd "$OPS_LIB_DIR/../../.." && pwd)"
OPS_LOG_DIR="${TAX_APPS_LOG_DIR:-$OPS_PROJECT_ROOT/docker/logs}"

# ------------------------------------
# 色つきログ
# ------------------------------------
# 端末でないときは色を付けない。
#
# スケジュールタスクとウォッチドッグは出力をそのままログファイルへ流すため、
# 無条件に色を付けると ESC[1;31m[ERROR]ESC[0m という文字列がファイルに残る。
# 実際 docker-watchdog.log と restore-drill.log の全エラー行がこれで汚れていて、
# grep も目視も当てにならなくなっていた。
if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-dumb}" != "dumb" ]]; then
  OPS_C_INFO=$'\033[1;36m'
  OPS_C_WARN=$'\033[1;33m'
  OPS_C_ERR=$'\033[1;31m'
  OPS_C_OK=$'\033[1;32m'
  OPS_C_OFF=$'\033[0m'
else
  OPS_C_INFO=''
  OPS_C_WARN=''
  OPS_C_ERR=''
  OPS_C_OK=''
  OPS_C_OFF=''
fi

warn() { printf '%s[WARN]%s  %s\n' "$OPS_C_WARN" "$OPS_C_OFF" "$*"; }
err() { printf '%s[ERROR]%s %s\n' "$OPS_C_ERR" "$OPS_C_OFF" "$*" >&2; }
ok() { printf '%s[OK]%s    %s\n' "$OPS_C_OK" "$OPS_C_OFF" "$*"; }

# ------------------------------------
# パス変換
# ------------------------------------
to_win_path() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$path"
  else
    printf '%s\n' "$path"
  fi
}

# ------------------------------------
# Windows スケジュールタスクの存在確認
# ------------------------------------
# 必ずこれを経由すること。
#
# `schtasks.exe /Query` を Git Bash から直接呼ぶと壊れる。MSYS は `/` 始まりの
# 引数をパスとみなして変換するため、`/Query` が `C:/Program Files/Git/Query` に
# 化け、存在するタスクでも常に「未登録」と判定される。しかも schtasks は
# 使い方エラーで exit 0 を返すので、素朴な `|| echo 未登録` では気づけない。
task_exists() {
  MSYS2_ARG_CONV_EXCL='*' schtasks.exe /Query /TN "$1" >/dev/null 2>&1
}

# ------------------------------------
# ログのローテーション
# ------------------------------------
# 追記しかしないログは黙って伸び続ける。docker-watchdog.log は
# 半年で600行近くまで育っていて、誰も読まない理由のひとつになっていた。
ops_rotate_log() {
  local file="$1"
  local max_bytes="${2:-${TAX_APPS_LOG_MAX_BYTES:-1048576}}"
  local keep="${3:-3}"

  [[ -f "$file" ]] || return 0
  local size
  size=$(wc -c < "$file" 2>/dev/null | tr -d ' ')
  [[ -n "$size" && "$size" =~ ^[0-9]+$ && "$size" -gt "$max_bytes" ]] || return 0

  local i
  for (( i = keep - 1; i >= 1; i-- )); do
    if [[ -f "$file.$i" ]]; then
      mv -f "$file.$i" "$file.$((i + 1))" 2>/dev/null || true
    fi
  done
  mv -f "$file" "$file.1" 2>/dev/null || true
}

# ------------------------------------
# 直近の実行結果
# ------------------------------------
# 「ログには残っているが誰も読まない」を終わらせるための仕組み。
#
# 無人で走る処理（backup / drill / recover / watchdog）は、成否をここへ1件
# 書き出す。manage.sh の status と preflight がそれを読んで毎回表示するので、
# 失敗は次に手元で status を叩いたときに必ず目に入る。
#
# 週次のリストア訓練が2週続けて飛んでいた件は、まさにこれが無かったために
# 見逃された（preflight はバックアップの鮮度だけを見ていた）。
OPS_LAST_RESULT_DIR="${TAX_APPS_LAST_RESULT_DIR:-$OPS_LOG_DIR/last-run}"

ops_write_last_result() {
  local name="$1" status="$2" detail="${3:-}"
  mkdir -p "$OPS_LAST_RESULT_DIR" 2>/dev/null || return 0
  {
    printf 'status=%s\n' "$status"
    printf 'at=%s\n' "$(date +'%Y-%m-%d %H:%M:%S')"
    printf 'epoch=%s\n' "$(date +%s)"
    printf 'detail=%s\n' "$detail"
  } > "$OPS_LAST_RESULT_DIR/$name" 2>/dev/null || true
}

ops_last_result_field() {
  local name="$1" field="$2"
  local file="$OPS_LAST_RESULT_DIR/$name"
  [[ -f "$file" ]] || return 1
  sed -n "s/^${field}=//p" "$file" | head -1 | tr -d '\r'
}

# 経過時間（時間単位）。記録が無ければ 1 を返す。
ops_last_result_age_hours() {
  local name="$1" epoch=""
  epoch=$(ops_last_result_field "$name" epoch) || return 1
  [[ "$epoch" =~ ^[0-9]+$ ]] || return 1
  echo $(( ($(date +%s) - epoch) / 3600 ))
}

# 「状態・日時・経過」を1行にして返す。記録が無ければ 1 を返す。
ops_format_last_result() {
  local name="$1"
  local status at age
  status=$(ops_last_result_field "$name" status) || return 1
  at=$(ops_last_result_field "$name" at)
  age=$(ops_last_result_age_hours "$name" || echo "?")
  local detail
  detail=$(ops_last_result_field "$name" detail)
  if [[ -n "$detail" ]]; then
    printf '%s（%s・%s時間前）%s\n' "$status" "$at" "$age" " $detail"
  else
    printf '%s（%s・%s時間前）\n' "$status" "$at" "$age"
  fi
}

# ------------------------------------
# 操作ロック
# ------------------------------------
# docker compose を同時に走らせないための排他。manage.sh と backup.sh で
# 同じディレクトリを使う。
#
# 取れなかったときに即あきらめてはいけない。
#
# 以前の実装は mkdir に失敗した時点でエラー終了していた。当初の想定は
# 「人が手で start / stop している最中」で、それなら次の定期実行に任せれば
# 済む、という判断だった。ところが実際の衝突相手はほぼ常に
# 同じスケジューラから起きた無人のバックアップだった。PC が深夜に
# 起動していないため -StartWhenAvailable の遅延実行で日次バックアップ・
# 週次ドリル・ウォッチドッグがログオン直後の数分に固まり、
# 負けた側がその回まるごと消えていた（ドリルは2週連続、ウォッチドッグの
# 復旧は通算25回）。
#
# 待てば全部順番に成立するので待つ。ただし端末から叩いたときは待たない
# （人が見ている前で数分黙って固まるより、その場で言った方がいい）。
OPS_LOCK_DIR="${TAX_APPS_LOCK_DIR:-${TMPDIR:-/tmp}/tax-apps-docker-ops.lock}"
OPS_LOCK_HELD=0
OPS_LOCK_POLL_SECONDS="${TAX_APPS_LOCK_POLL:-10}"

# 後片付けが要るスクリプトは on_release_operation_lock を定義しておくと
# ロック解放の直前に呼ばれる（backup.sh の訓練用コンテナ削除など）。
release_operation_lock() {
  if declare -F on_release_operation_lock >/dev/null 2>&1; then
    on_release_operation_lock || true
  fi
  if [[ "$OPS_LOCK_HELD" -eq 1 ]]; then
    rm -rf "$OPS_LOCK_DIR"
    OPS_LOCK_HELD=0
  fi
}

ops_print_lock_owner() {
  if [[ -f "$OPS_LOCK_DIR/owner" ]]; then
    sed 's/^/  /' "$OPS_LOCK_DIR/owner" >&2 || true
  else
    err "Lock directory: $OPS_LOCK_DIR"
  fi
}

ops_lock_owner_action() {
  [[ -f "$OPS_LOCK_DIR/owner" ]] || { echo "unknown"; return 0; }
  sed -n 's/^action=//p' "$OPS_LOCK_DIR/owner" | head -1 | tr -d '\r'
}

# 持ち主が死んでいるロックだけを片付ける。
#
# 生きているプロセスのロックは、どれだけ古くても奪わない。clean は
# `read -rp` で人の入力を待つ間ずっとロックを握るため、時間で切ると
# 対話操作の最中に別の操作が割り込む。
ops_clear_stale_lock() {
  [[ -d "$OPS_LOCK_DIR" ]] || return 0

  local owner_pid=""
  if [[ -f "$OPS_LOCK_DIR/owner" ]]; then
    owner_pid="$(sed -n 's/^pid=//p' "$OPS_LOCK_DIR/owner" | head -1 | tr -d '\r')"
  fi

  if [[ -n "$owner_pid" ]]; then
    if ! kill -0 "$owner_pid" 2>/dev/null; then
      warn "Removing stale operation lock (owner pid $owner_pid is gone): $OPS_LOCK_DIR"
      rm -rf "$OPS_LOCK_DIR"
    fi
    return 0
  fi

  # 持ち主が分からないロック（owner を書く前に落ちた等）は時間で切る。
  # ここだけは放っておくと全ての操作が永久に止まる。
  local created age
  created=$(stat -c %Y "$OPS_LOCK_DIR" 2>/dev/null || echo "")
  [[ "$created" =~ ^[0-9]+$ ]] || return 0
  age=$(( $(date +%s) - created ))
  if [[ $age -gt ${TAX_APPS_LOCK_MAX_AGE:-3600} ]]; then
    warn "Removing an ownerless operation lock held for ${age}s: $OPS_LOCK_DIR"
    rm -rf "$OPS_LOCK_DIR"
  fi
}

# 端末なら待たない、無人なら待つ。
ops_default_lock_wait() {
  local unattended_seconds="${1:-300}"
  if [[ -t 1 ]]; then
    echo 0
  else
    echo "$unattended_seconds"
  fi
}

# acquire_operation_lock <action> [max_wait_seconds]
#
# max_wait_seconds を省略すると待たない。環境変数 TAX_APPS_LOCK_WAIT が
# あればそちらが優先される（手動で「待ってでも取りたい」ときの逃げ道）。
acquire_operation_lock() {
  local action="${1:-operation}"
  local max_wait="${2:-0}"
  if [[ -n "${TAX_APPS_LOCK_WAIT:-}" ]]; then
    max_wait="$TAX_APPS_LOCK_WAIT"
  fi
  [[ "$max_wait" =~ ^[0-9]+$ ]] || max_wait=0

  local waited=0 announced=0
  while true; do
    ops_clear_stale_lock

    if mkdir "$OPS_LOCK_DIR" 2>/dev/null; then
      OPS_LOCK_HELD=1
      {
        echo "pid=$$"
        echo "action=$action"
        echo "started_at=$(date -Is 2>/dev/null || date)"
        echo "script=$0"
      } > "$OPS_LOCK_DIR/owner"
      trap release_operation_lock EXIT INT TERM
      if [[ $waited -gt 0 ]]; then
        ok "Acquired the operation lock after waiting ${waited}s."
      fi
      return 0
    fi

    [[ $waited -lt $max_wait ]] || break

    if [[ $announced -eq 0 ]]; then
      announced=1
      warn "Another Tax Apps Docker operation is running; waiting up to ${max_wait}s for it."
      ops_print_lock_owner
    fi
    sleep "$OPS_LOCK_POLL_SECONDS"
    waited=$(( waited + OPS_LOCK_POLL_SECONDS ))
  done

  err "Another Tax Apps Docker operation is already running."
  ops_print_lock_owner
  if [[ $max_wait -gt 0 ]]; then
    err "Gave up after waiting ${waited}s for the lock."
  fi
  # 諦めたこと自体を記録する。ここを黙って落とすと、丸ごと飛んだ回が
  # どこにも残らない（これが週次ドリル消失の直接の原因だった）。
  ops_write_last_result "$action" "lock-timeout" \
    "waited=${waited}s owner=$(ops_lock_owner_action)"
  return 1
}
