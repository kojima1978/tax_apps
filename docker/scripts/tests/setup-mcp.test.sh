#!/usr/bin/env bash
# ============================================
# setup-mcp.sh の回帰テスト
# ============================================
#
# 見るのは「人の設定を壊さないか」だけ:
#   - 無ければ作る / あれば控えを取ってからマージする
#   - ほかの MCP サーバーと、ほかの項目を消さない
#   - 同じ内容なら書かない（控えも増やさない）
#   - 読めない JSON は 1バイトも書かずに中止する（終了コード 3）
#   - --dry-run は何も書かない
#   - ビルドはリポジトリ直下から叩く（bake の読み取り範囲）
#   - ネットワークが無ければ作る
#
# docker は PATH の前に置いた偽物に差し替える。`docker run ... node` の中身だけは
# ホストの node で実行する（マージの中身を見たいのはそこなので）。本番の経路は
# あくまで docker の中の node で、ここで確かめているのは渡すものと書き方。
#
# 実行: bash docker/scripts/tests/setup-mcp.test.sh（CI の shell scripts ジョブから）
# ============================================

set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
project_root=$(cd "$script_dir/../../.." && pwd)
setup_script="$script_dir/../setup-mcp.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "FAIL node が見つかりません（このテストは docker の代わりにホストの node でマージを走らせます）" >&2
  exit 1
fi

test_dir=$(mktemp -d)
cleanup() { rm -rf "$test_dir"; }
trap cleanup EXIT

mkdir -p "$test_dir/bin"
export CALLS="$test_dir/calls"
: > "$CALLS"

cat > "$test_dir/bin/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s | %s\n' "$PWD" "$*" >> "$CALLS"
case "$1" in
  info) exit 0 ;;
  image) [[ -n "${STUB_IMAGE_MISSING:-}" ]] && exit 1; exit 0 ;;
  network)
    case "$2" in
      inspect) [[ -n "${STUB_NETWORK_MISSING:-}" ]] && exit 1; exit 0 ;;
      *) exit 0 ;;
    esac
    ;;
  compose) exit 0 ;;
  run)
    # 作ったイメージの起動確認（setup-mcp.sh の 2.）。設定のマージは node のイメージで走る
    if [[ "$*" == *tax-apps-mcp* ]]; then
      cat >/dev/null
      [[ -n "${STUB_SMOKE_BROKEN:-}" ]] && { echo "SyntaxError: does not provide an export named 'X'" >&2; exit 1; }
      echo '{"result":{"tools":[{"name":"normalize_asset_case"}]},"jsonrpc":"2.0","id":2}'
      exit 0
    fi
    exec node
    ;;
  *) exit 0 ;;
esac
STUB
chmod +x "$test_dir/bin/docker"
export PATH="$test_dir/bin:$PATH"

config="$test_dir/claude_desktop_config.json"
failures=0

check() {
  local label="$1"
  shift
  if "$@"; then
    echo "ok   $label"
  else
    echo "FAIL $label"
    failures=1
  fi
}


backup_count() {
  find "$test_dir" -maxdepth 1 -name 'claude_desktop_config.json.bak.*' | wc -l | tr -d ' '
}

# ------------------------------------
# 1. 設定ファイルが無いとき: 作る。控えは作らない
# ------------------------------------
: > "$CALLS"
STUB_NETWORK_MISSING=1 bash "$setup_script" --config "$config" --no-build >/dev/null
check "設定ファイルを作る" test -f "$config"
check "command は docker" grep -q '"command": "docker"' "$config"
check "args にイメージ名が入る" grep -q '"tax-apps-mcp"' "$config"
check "控えは作らない（元が無いので）" test "$(backup_count)" = 0
check "ネットワークが無ければ作る" grep -q 'network create tax-apps-network' "$CALLS"
check "--no-build では build しない" bash -c '! grep -q "compose .*build" "$CALLS"'

# ------------------------------------
# 2. ほかの設定があるとき: 控えを取って、消さずに足す
# ------------------------------------
cat > "$config" <<'JSON'
{
  "globalShortcut": "Alt+Space",
  "mcpServers": {
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/c/work"] }
  }
}
JSON
: > "$CALLS"
output=$(bash "$setup_script" --config "$config" --no-build)
check "控えを1つ取る" test "$(backup_count)" = 1
check "ほかの MCP サーバーを消さない" grep -q 'server-filesystem' "$config"
check "ほかの項目を消さない" grep -q 'Alt+Space' "$config"
check "tax-apps を足す" grep -q '"tax-apps"' "$config"
check "残すものを報告する" grep -q 'filesystem' <<<"$output"
backup_file=$(find "$test_dir" -maxdepth 1 -name 'claude_desktop_config.json.bak.*' | head -1)
check "控えには tax-apps が入っていない（変更前のまま）" \
  bash -c '! grep -q tax-apps "$1"' _ "$backup_file"

# ------------------------------------
# 3. 同じ内容で叩き直したとき: 書かない・控えも増やさない
# ------------------------------------
before=$(cat "$config")
output=$(bash "$setup_script" --config "$config" --no-build)
check "同じなら書き換えない" test "$(cat "$config")" = "$before"
check "同じなら控えを増やさない" test "$(backup_count)" = 1
check "同じだと伝える" grep -q '同じ内容で登録されています' <<<"$output"

# ------------------------------------
# 4. --dry-run: 何も書かない
# ------------------------------------
printf '%s' '{"mcpServers":{}}' > "$config"
before=$(cat "$config")
output=$(bash "$setup_script" --config "$config" --dry-run)
check "--dry-run は書かない" test "$(cat "$config")" = "$before"
check "--dry-run は控えを増やさない" test "$(backup_count)" = 1
check "--dry-run でも結果を見せる" grep -q '"tax-apps"' <<<"$output"

# ------------------------------------
# 5. 読めない JSON: 1バイトも書かずに中止（終了コード 3）
# ------------------------------------
printf '%s' '{ "mcpServers": { oops }' > "$config"
before=$(cat "$config")
rc=0
bash "$setup_script" --config "$config" --no-build >/dev/null 2>"$test_dir/err" || rc=$?
check "読めない JSON では終了コード 3" test "$rc" = 3
check "読めない JSON には書かない" test "$(cat "$config")" = "$before"
check "読めない JSON では控えも作らない" test "$(backup_count)" = 1
check "読めない理由を出す" grep -q 'JSON として読めません' "$test_dir/err"

# mcpServers が配列など、形が違うときも同じ扱い
printf '%s' '{"mcpServers":[]}' > "$config"
rc=0
bash "$setup_script" --config "$config" --no-build >/dev/null 2>"$test_dir/err" || rc=$?
check "mcpServers の形が違えば中止" test "$rc" = 3
check "形が違う理由を出す" grep -q 'mcpServers' "$test_dir/err"

# ------------------------------------
# 6. ビルドはリポジトリ直下から叩く（bake の読み取り範囲）
# ------------------------------------
printf '%s' '{}' > "$config"
: > "$CALLS"
(cd "$test_dir" && bash "$setup_script" --config "$config" >/dev/null)
build_line=$(grep 'compose ' "$CALLS" | head -1)
check "compose はリポジトリ直下で動く" \
  test "$(cd "${build_line%% | *}" && pwd)" = "$project_root"
check "compose は -f をリポジトリ直下からの絶対パスで渡す" \
  grep -q -- "-f $project_root/apps/mcp-server/docker-compose.yml --profile mcp build mcp-server" "$CALLS"

# ------------------------------------
# 7. イメージが無ければ知らせる
# ------------------------------------
printf '%s' '{}' > "$config"
output=$(STUB_IMAGE_MISSING=1 bash "$setup_script" --config "$config" --no-build 2>&1)
check "イメージが無ければ警告する" grep -q 'まだありません' <<<"$output"

# ------------------------------------
# 8. 作ったイメージが起動できなければ登録しない
# ------------------------------------
printf '%s' '{}' > "$config"
rc=0
output=$(STUB_SMOKE_BROKEN=1 bash "$setup_script" --config "$config" 2>&1) || rc=$?
check "起動できないイメージは終了コード 1" test "$rc" -eq 1
check "起動できない理由を出す" grep -q 'does not provide an export' <<<"$output"
check "起動できないイメージは設定に書かない" test "$(cat "$config")" = '{}'
check "作ったイメージは起動を確かめる" grep -q 'run -i --rm --network none tax-apps-mcp' "$CALLS"

if (( failures )); then
  echo "setup-mcp.test.sh: FAILED" >&2
  exit 1
fi
echo "setup-mcp.test.sh: all checks passed"
