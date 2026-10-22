#!/usr/bin/env bash
# shared/<束>/ の原本を、各アプリの src/shared/<束>/ へ写す。
#
#   bash shared/sync.sh           写す
#   bash shared/sync.sh --check   写しが原本とずれていれば一覧を出して 1 で終わる（CI）
#
# 写しにするのは、各アプリの Docker のビルドがアプリのディレクトリの中しか見ないため
# （ビルドの読み取り範囲を広げると Bake の確認に当たる。CLAUDE.md の compose の節）。
# 写しを直接直すと次の sync で黙って消えるので、--check で必ず見つける。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 束:アプリ:テストも写すか（vitest の無いアプリへ *.test.ts を置くと tsc -b が落ちる）
TARGETS=(
  staff-directory:bank-analyzer:test
  staff-directory:capital-gains-calc:test
  staff-directory:depreciation-calc:
  staff-directory:gift-tax-simulator:
  staff-directory:inheritance-tax-app:test
  staff-directory:inheritance-tax-docs:test
  staff-directory:retirement-tax-calc:test
  staff-directory:stock-valuation-form:test
)

check=0
[[ "${1:-}" == "--check" ]] && check=1
drift=0

for t in "${TARGETS[@]}"; do
  IFS=: read -r bundle app with_test <<<"$t"
  src="$ROOT/shared/$bundle"
  dest="$ROOT/apps/$app/src/shared/$bundle"
  [[ $check -eq 0 ]] && mkdir -p "$dest"
  for f in "$src"/*; do
    name="$(basename "$f")"
    [[ "$name" == *.test.* && "$with_test" != "test" ]] && continue
    if [[ $check -eq 1 ]]; then
      if ! cmp -s "$f" "$dest/$name"; then
        echo "ずれ: apps/$app/src/shared/$bundle/$name（原本 shared/$bundle/$name）"
        drift=1
      fi
    else
      cp "$f" "$dest/$name"
    fi
  done
  # 原本に無いファイルが写し先に残っていないか（原本から消したのに写しだけ残る形）
  if [[ -d "$dest" ]]; then
    for f in "$dest"/*; do
      name="$(basename "$f")"
      if [[ ! -e "$src/$name" ]]; then
        echo "原本に無い: apps/$app/src/shared/$bundle/$name"
        drift=1
      fi
    done
  fi
done

if [[ $check -eq 1 ]]; then
  if [[ $drift -eq 1 ]]; then
    echo "原本（shared/）を直してから bash shared/sync.sh で配ってください"
    exit 1
  fi
  echo "ok: 写しはすべて原本と一致"
fi
