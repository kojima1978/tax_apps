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

  # 記録しただけでは誰にも届かない。デスクトップの警告ファイルを作り直す。
  ops_refresh_failure_alert || true
  return 0
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
# 見張る対象の一覧
# ------------------------------------
# しきい値の表をここ1箇所に置く。以前は status と preflight が別々に同じ表を
# 持っていて、しかも preflight 側にはバックアップの行が無かった
# （バックアップだけは「ファイルの日付」で代用していたため、記録が
# status=failed でも preflight は素通りしていた）。
#
# 形式: 名前:日本語ラベル:英語ラベル:これ以上古い成功は異常とみなす時間
OPS_WATCHED_RESULTS=(
  "backup:バックアップ:Daily backup:30"
  "backup-external:バックアップの外部コピー:Off-machine backup copy:30"
  "drill:リストア訓練:Restore drill:192"
  "prune:Dockerの掃除:Docker prune:192"
  "recover:復旧(recover):App recovery:48"
  "watchdog:ウォッチドッグ:Docker watchdog:48"
)

# ------------------------------------
# バックアップの外部コピー先
# ------------------------------------
# 置き場所がリポジトリの外なのは意図的。
#   - リポジトリは公開なので、NAS 名やユーザー名を含むパスを載せられない
#   - スケジュールタスクは環境変数を持たずに起動するので、環境変数だけでは効かない
# 未設定なら外部コピーは何もしない（警告も出さない）。
OPS_EXTERNAL_DEST_FILE="${TAX_APPS_BACKUP_EXTERNAL_DEST_FILE:-$HOME/.tax-apps/backup-external-dest}"

ops_external_backup_dest() {
  if [[ -n "${TAX_APPS_BACKUP_EXTERNAL_DEST:-}" ]]; then
    printf '%s\n' "$TAX_APPS_BACKUP_EXTERNAL_DEST"
    return 0
  fi
  [[ -s "$OPS_EXTERNAL_DEST_FILE" ]] || return 1
  local line
  line=$(grep -v '^[[:space:]]*#' "$OPS_EXTERNAL_DEST_FILE" 2>/dev/null |
    grep -v '^[[:space:]]*$' | head -1 | tr -d '\r')
  [[ -n "$line" ]] || return 1
  printf '%s\n' "$line"
}

# 外部コピー先が未設定なら、その行は見張らない（未設定は異常ではない）。
ops_watched_result_is_active() {
  local name="$1"
  if [[ "$name" == "backup-external" ]]; then
    ops_external_backup_dest >/dev/null 2>&1 || return 1
  fi
  return 0
}

# ------------------------------------
# 失敗をデスクトップに出す
# ------------------------------------
# last-run へ書くようにしたことで「飛んだ回」は残るようになったが、
# それが見えるのは status か preflight を叩いた人だけで、毎日失敗し続けても
# 画面には何も出ない。数ヶ月見逃した当のものがまさにこの状態だった。
#
# そこで異常が1件でもある間はデスクトップに警告ファイルを置き続ける。
# 中身は last-run から毎回作り直す**派生物**なので、直れば次の自動実行で
# 勝手に消える（消し忘れの嘘が残らない）。
OPS_ALERT_STATE_FILE="${TAX_APPS_ALERT_STATE_FILE:-$OPS_LOG_DIR/alert-state}"
OPS_ALERT_FILE_NAME="${TAX_APPS_ALERT_FILE_NAME:-TAX-APPS-ALERT.txt}"
OPS_DESKTOP_CACHE_FILE="${TAX_APPS_DESKTOP_CACHE_FILE:-$OPS_LOG_DIR/desktop-path}"

# デスクトップの場所。OneDrive へリダイレクトされていることがあるので
# Windows に訊く。毎回 PowerShell を起こすと遅いので結果を控えておく。
ops_desktop_dir() {
  local cached=""
  if [[ -s "$OPS_DESKTOP_CACHE_FILE" ]]; then
    cached=$(tr -d '\r\n' < "$OPS_DESKTOP_CACHE_FILE")
    [[ -d "$cached" ]] && { printf '%s\n' "$cached"; return 0; }
  fi

  local win=""
  if command -v powershell.exe >/dev/null 2>&1; then
    win=$(powershell.exe -NoProfile -Command \
      '[Environment]::GetFolderPath("Desktop")' 2>/dev/null | tr -d '\r')
  fi

  local dir=""
  if [[ -n "$win" ]]; then
    dir=$(cygpath -u "$win" 2>/dev/null || printf '%s' "$win")
  fi
  [[ -d "$dir" ]] || dir="$HOME/Desktop"
  [[ -d "$dir" ]] || return 1

  mkdir -p "$(dirname "$OPS_DESKTOP_CACHE_FILE")" 2>/dev/null || true
  printf '%s\n' "$dir" > "$OPS_DESKTOP_CACHE_FILE" 2>/dev/null || true
  printf '%s\n' "$dir"
}

# 異常な行を1件1行で出す（何も無ければ何も出さない）。
ops_collect_failures() {
  local entry name ja _en stale status at age detail
  for entry in "${OPS_WATCHED_RESULTS[@]}"; do
    IFS=: read -r name ja _en stale <<< "$entry"
    ops_watched_result_is_active "$name" || continue

    if ! status=$(ops_last_result_field "$name" status); then
      # 一度も完了していないものを異常にすると、導入直後や新しい PC で
      # 必ず鳴る。preflight は出すが、こちらでは鳴らさない。
      continue
    fi

    at=$(ops_last_result_field "$name" at || echo '?')
    detail=$(ops_last_result_field "$name" detail || echo '')
    age=$(ops_last_result_age_hours "$name" || echo '')

    if [[ "$status" != "ok" ]]; then
      printf '%s\t失敗\t%s: %s（%s）%s\n' "$name" "$ja" "$status" "$at" "${detail:+ $detail}"
    elif [[ -n "$age" && "$age" -gt "$stale" ]]; then
      printf '%s\t停止\t%s: 最後に成功したのは %s時間前（%s時間を超えました・%s）\n' \
        "$name" "$ja" "$age" "$stale" "$at"
    fi
  done
  return 0
}

ops_refresh_failure_alert() {
  [[ -z "${TAX_APPS_NO_ALERT:-}" ]] || return 0

  local failures signature previous=""
  failures=$(ops_collect_failures)
  signature=$(printf '%s' "$failures" | cut -f1,2 | sort | tr '\n' ',')
  [[ -f "$OPS_ALERT_STATE_FILE" ]] && previous=$(tr -d '\r' < "$OPS_ALERT_STATE_FILE")

  # 何も無く、前回も何も無かったなら触らない（デスクトップの場所すら調べない）
  if [[ -z "$failures" && -z "$previous" ]]; then
    return 0
  fi

  local desktop alert_file=""
  if desktop=$(ops_desktop_dir); then
    alert_file="$desktop/$OPS_ALERT_FILE_NAME"
  fi

  if [[ -z "$failures" ]]; then
    [[ -n "$alert_file" && -f "$alert_file" ]] && rm -f "$alert_file" 2>/dev/null || true
    rm -f "$OPS_ALERT_STATE_FILE" 2>/dev/null || true
    return 0
  fi

  if [[ -n "$alert_file" ]]; then
    {
      printf '=========================================\n'
      printf ' Tax Apps 自動処理の異常\n'
      printf '=========================================\n\n'
      printf 'このファイルは異常が続いている間だけ自動で置かれます。\n'
      printf '直れば次の自動実行で自動的に消えます（手で消しても構いません）。\n\n'
      printf '確認日時: %s\n\n' "$(date +'%Y-%m-%d %H:%M:%S')"
      printf '%s\n' "$failures" | while IFS=$'\t' read -r _name kind line; do
        [[ -n "$line" ]] || continue
        printf '【%s】%s\n' "$kind" "$line"
      done
      printf '\n-----------------------------------------\n'
      printf 'どうするか\n'
      printf '  1. docker/scripts/status.bat をダブルクリックして状態を見る\n'
      printf '  2. ログ: %s\n' "$(to_win_path "$OPS_LOG_DIR")"
      printf '  3. 直近の記録: %s\n' "$(to_win_path "$OPS_LAST_RESULT_DIR")"
    } > "$alert_file" 2>/dev/null || true
  fi

  mkdir -p "$(dirname "$OPS_ALERT_STATE_FILE")" 2>/dev/null || true
  printf '%s' "$signature" > "$OPS_ALERT_STATE_FILE" 2>/dev/null || true

  # 通知は「増えたとき」だけ。同じ失敗で1日4回鳴ると、すぐ誰も見なくなる。
  if [[ "$signature" != "$previous" ]]; then
    local count
    count=$(printf '%s\n' "$failures" | grep -c . || true)
    ops_show_toast "Tax Apps" "$count unattended job(s) need attention. See $OPS_ALERT_FILE_NAME on your Desktop."
  fi
  return 0
}

# トーストは出れば儲けもの。出す係は ASCII の .ps1 に任せる
# （Windows PowerShell 5.1 は BOM の無い .ps1 を ANSI として読むため、
# 日本語を入れた時点で解析が壊れる）。
ops_show_toast() {
  local title="$1" message="$2"
  [[ -z "${TAX_APPS_NO_TOAST:-}" ]] || return 0
  local script="$OPS_LIB_DIR/notify-failure.ps1"
  [[ -f "$script" ]] || return 0
  command -v powershell.exe >/dev/null 2>&1 || return 0
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(to_win_path "$script")" \
    -Title "$title" -Message "$message" >/dev/null 2>&1 || true
  return 0
}

# ------------------------------------
# Docker の掃除
# ------------------------------------
# 定期的に走らせる前提なので、消していいものしか消さない。
#
#   - dangling イメージだけ（`-a` は付けない）。`-a` は「停止中のコンテナが
#     使うはずのイメージ」まで消すため、prod で止めてあるアプリが次の起動で
#     いきなり再ビルドになる
#   - **ボリュームには絶対に触らない**。`docker volume prune` は停止中の
#     コンテナのボリュームを未使用とみなすので、アプリを止めている間に
#     走ると DB ごと消える
ops_docker_prune() {
  local image_until="${TAX_APPS_PRUNE_IMAGE_UNTIL:-720h}"
  local cache_max="${TAX_APPS_PRUNE_CACHE_MAX:-10GB}"
  local failed=0

  echo "  dangling イメージ（${image_until} 以上前）:"
  docker image prune --force --filter "until=$image_until" 2>&1 | sed 's/^/    /' || failed=1

  echo "  ビルドキャッシュ（${cache_max} まで縮める）:"
  docker builder prune --force --max-used-space "$cache_max" 2>&1 | sed 's/^/    /' || failed=1

  [[ $failed -eq 0 ]]
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
