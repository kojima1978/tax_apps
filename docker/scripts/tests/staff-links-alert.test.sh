#!/usr/bin/env bash
# 社員台帳の連携の失敗がデスクトップの警告に「1連携1行」で出て、直れば消えること。
# manage.sh の cmd_link_check は台帳が作った行を " || " でつないで last-run の detail に
# 残し、ops_collect_failures がそれを1行ずつに戻す。どちらかの書き方が変わると、
# 警告が1行に潰れるか、"社員台帳の連携: failed（…）" の素っ気ない1行になる。
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

export TAX_APPS_LOG_DIR="$test_dir/logs"
export TAX_APPS_LAST_RESULT_DIR="$test_dir/logs/last-run"
export TAX_APPS_ALERT_STATE_FILE="$test_dir/logs/alert-state"
export TAX_APPS_DESKTOP_CACHE_FILE="$test_dir/logs/desktop-path"
export TAX_APPS_BACKUP_EXTERNAL_DEST_FILE="$test_dir/no-external-dest"
export TAX_APPS_NO_TOAST=1
mkdir -p "$test_dir/desktop" "$TAX_APPS_LOG_DIR"
printf '%s\n' "$test_dir/desktop" > "$TAX_APPS_DESKTOP_CACHE_FILE"

# shellcheck source=../lib/ops-common.sh
source "$script_dir/../lib/ops-common.sh"
alert="$test_dir/desktop/$OPS_ALERT_FILE_NAME"

fail() { printf 'NG: %s\n' "$1" >&2; exit 1; }

grep -q '^  "staff-links:' "$script_dir/../lib/ops-common.sh" \
  || fail "OPS_WATCHED_RESULTS に staff-links がありません"

line1='社員台帳と案件管理の連携（担当者・部署の写し）が11/12 09:00から失敗しています。理由: 接続できませんでした 連携の画面: http://localhost/staff-directory/links'
line2='社員台帳と資産・負債管理（PB）の連携（担当件数の読み取り）が11/12 09:30から失敗しています。理由: 500 が返りました 連携の画面: http://localhost/staff-directory/links'

ops_write_last_result "staff-links" "failed" "$line1 || $line2"
[[ -f "$alert" ]] || fail "警告ファイルが作られません"
grep -qxF "【失敗】$line1" "$alert" || fail "1件目が1行で出ていません"
grep -qxF "【失敗】$line2" "$alert" || fail "2件目が1行で出ていません"
grep -q ' || ' "$alert" && fail "つなぎ目の ' || ' が残っています"
grep -q 'manage.sh link-check' "$alert" || fail "直し方の説明がありません"
[[ $(ops_collect_failures | grep -c $'^staff-links\t失敗\t') -eq 2 ]] || fail "失敗の数が2件ではありません"
printf '連携の失敗が1行ずつ出る: OK\n'

# 台帳から読めなかったとき（台帳の文ではない detail）は、ほかの項目と同じ形で出す
ops_write_last_result "staff-links" "failed" "could not read link status from staff-directory (exit 3)"
grep -qF '【失敗】社員台帳の連携: failed（' "$alert" || fail "読めなかったときの行が出ていません"
grep -qF 'could not read link status' "$alert" || fail "読めなかった理由が出ていません"
printf '台帳から読めなかったときの行: OK\n'

# 直れば警告ごと消える
ops_write_last_result "staff-links" "ok" "no link failure over 30min"
[[ ! -f "$alert" ]] || fail "直ったのに警告ファイルが残っています"
printf '直れば警告が消える: OK\n'

# due のしきい値は警告のしきい値より小さいこと（逆転すると警告を出してから実行する順になる）
due_hours=$(sed -n 's/^DUE_LINKCHECK_HOURS="${TAX_APPS_DUE_LINKCHECK_HOURS:-\([0-9]*\)}"$/\1/p' "$script_dir/../backup.sh")
warn_hours=$(printf '%s\n' "${OPS_WATCHED_RESULTS[@]}" | sed -n 's/^staff-links:.*:\([0-9]*\)$/\1/p')
[[ -n "$due_hours" && -n "$warn_hours" ]] || fail "しきい値を読めません（due=$due_hours warn=$warn_hours）"
(( due_hours < warn_hours )) || fail "due のしきい値 ${due_hours}h が警告の ${warn_hours}h 以上です"
printf 'due %sh < 警告 %sh: OK\n' "$due_hours" "$warn_hours"
