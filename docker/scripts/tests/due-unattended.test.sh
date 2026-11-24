#!/usr/bin/env bash
# 無人実行（backup.sh due）の3点を固定する。
#
# 1. `_due_run` のサブシェルで後始末の trap が走ること。bash はサブシェルで trap を
#    既定へ戻すため、`( "$@" )` だけだと親が張った `on_release_operation_lock` が
#    呼ばれない ── ドリルが復号した平文（DB のダンプ・顧客名入り JSON・.env）を
#    docker/backups/.restore-work.* に置いたまま終わる状態が実際に続いていた
#    （2026-11-15 に修正。それまで無人のドリルは毎回 20MB の平文を残していた）。
# 2. 突合が落ちたときに「どのファイルが合わなかったか」が残ること。以前は
#    sha256sum -c の出力を捨てていたので、無人実行では manifest-failed の1語しか
#    残らず追う手がかりが無かった。
# 3. stdin が無い（スケジュールタスク）回でも突合が通ること。MSYS 版 sha256sum は
#    stdin が閉じていると1ファイルも見ずに失敗するため、2026-11-14 以降のドリルは
#    毎回 manifest-failed（failed=0）を記録し、手で叩くと通る状態だった。
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
backup_sh="$script_dir/../backup.sh"
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT

fail() { printf 'NG: %s\n' "$1" >&2; exit 1; }

# backup.sh は読み込むだけで走り出すので、見たい関数だけ切り出して評価する。
extract() {
  sed -n "/^$1() {/,/^}/p" "$backup_sh"
}

# ---- 1. _due_run の後始末 ----
due_run_src=$(extract _due_run)
[[ -n "$due_run_src" ]] || fail "_due_run が見つかりません"
grep -q 'trap on_release_operation_lock EXIT' <<<"$due_run_src" \
  || fail "_due_run のサブシェルに後始末の trap がありません"

marker="$test_dir/cleanup-ran"
eval "$due_run_src"
on_release_operation_lock() { printf '%s\n' "${WORK_DIR:-none}" >> "$marker"; }

ok_job() { WORK_DIR="$test_dir/work-ok"; }
failing_job() { WORK_DIR="$test_dir/work-ng"; return 7; }

_due_run ok_job || fail "成功した処理で終了コードが変わりました"
rc=0; _due_run failing_job || rc=$?
[[ $rc -eq 7 ]] || fail "失敗した処理の終了コードが握り潰されました（rc=$rc）"
[[ -f "$marker" ]] || fail "後始末（on_release_operation_lock）が走っていません"
[[ $(wc -l < "$marker") -eq 2 ]] || fail "後始末が成功・失敗の両方で走っていません"
# サブシェルの中で設定された変数が後始末から見えること（残骸を消す口はここだけ）
grep -qx "$test_dir/work-ng" "$marker" || fail "後始末がサブシェル内の値を見ていません"
printf '_due_run がサブシェルでも後始末を呼ぶ: OK\n'

# ---- 2. 突合の失敗の内訳 ----
manifest_src=$(extract verify_backup_manifest)
[[ -n "$manifest_src" ]] || fail "verify_backup_manifest が見つかりません"
MANIFEST_FAILED_DETAIL=""
ok()   { :; }
err()  { :; }
warn() { :; }
eval "$manifest_src"

work="$test_dir/archive"
mkdir -p "$work"
printf 'good\n' > "$work/intact.sql"
printf 'before\n' > "$work/broken-itcm-postgres.sql"
( cd "$work" && sha256sum intact.sql broken-itcm-postgres.sql > manifest.sha256 )

# 3 で使う健全な写し（下でこのアーカイブは壊す）
cp -r "$work" "$test_dir/archive-intact"

verify_backup_manifest "$work" || fail "健全なアーカイブで突合が落ちました"
[[ -z "$MANIFEST_FAILED_DETAIL" ]] || fail "成功した回に detail が残っています"

printf 'after\n' > "$work/broken-itcm-postgres.sql"
rc=0; verify_backup_manifest "$work" || rc=$?
[[ $rc -eq 1 ]] || fail "壊れたアーカイブで突合が通りました"
[[ "$MANIFEST_FAILED_DETAIL" == *"failed=1"* ]] || fail "落ちた件数が detail にありません: $MANIFEST_FAILED_DETAIL"
[[ "$MANIFEST_FAILED_DETAIL" == *"broken-itcm-postgres.sql"* ]] \
  || fail "落ちたファイル名が detail にありません: $MANIFEST_FAILED_DETAIL"
[[ "$MANIFEST_FAILED_DETAIL" != *$'\n'* ]] || fail "detail が複数行になっています（記録は1行）"
printf '突合の失敗にファイル名が残る: OK\n'

# manifest が無い古いアーカイブは「飛ばして続ける」（互換のため落とさない）
legacy="$test_dir/legacy"
mkdir -p "$legacy"
verify_backup_manifest "$legacy" || fail "manifest の無いアーカイブで落ちました"
printf 'manifest の無い版は飛ばす: OK\n'

# ---- 3. stdin が閉じていても照合できる ----
# 無人実行（スケジュールタスク）では stdin が無い。MSYS 版 sha256sum はその状態で呼ぶと
# 1ファイルも見ないまま終了コード 1 を返すため、落ちたファイルが1つも無いのに
# manifest-failed が記録され続けていた（2026-11-14〜25）。
MANIFEST_FAILED_DETAIL=""
rc=0; verify_backup_manifest "$test_dir/archive-intact" 0<&- || rc=$?
[[ $rc -eq 0 ]] || fail "stdin が閉じた状態で突合が落ちました（rc=$rc detail=$MANIFEST_FAILED_DETAIL）"
printf 'stdin が無い（無人実行）回でも突合が通る: OK\n'
