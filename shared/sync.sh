#!/usr/bin/env bash
# shared/<束>/ の原本を、各アプリの src/shared/<束>/（サーバーが読むものは server/shared/<束>/）へ写す。
#
#   bash shared/sync.sh           写す
#   bash shared/sync.sh --check   写しが原本とずれていれば一覧を出して 1 で終わる（CI）
#
# 写しにするのは、各アプリの Docker のビルドがアプリのディレクトリの中しか見ないため
# （ビルドの読み取り範囲を広げると Bake の確認に当たる。ルートの CLAUDE.md の「ビルドを伴う compose はリポジトリ直下から」）。
# 写しを直接直すと次の sync で黙って消えるので、--check で必ず見つける。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 束:アプリ:テストも写すか:写す先（省略時 src/shared）
#   テストは vitest の無いアプリへ置くと tsc -b が落ちる。server/shared へはテストを写さない
#   （tsconfig.server.json は __tests__ しか外さないので、本番の dist-server に vitest の import が混ざる）
TARGETS=(
  staff-directory:bank-analyzer:test
  staff-directory:capital-gains-calc:test
  staff-directory:depreciation-calc:
  staff-directory:gift-tax-simulator:
  staff-directory:inheritance-tax-app:test
  staff-directory:inheritance-tax-docs:test
  staff-directory:retirement-tax-calc:test
  staff-directory:stock-valuation-form:test
  # 担当者を選ぶ欄の決まり（自分・最近選んだ人・並べ方・写しの連携の状態）だけを使う。
  # 見た目の部品（Tailwind の .tsx）も一緒に写るが、PB は import しないので画面には入らない。
  # テストは写さない（PB の vitest は __tests__ の下しか見ない。原本のテストは他のアプリで回る）
  staff-directory:private-banking:
  # 社員ごとの担当件数（各アプリは返す側、社員台帳は読む側）
  staff-workload:inheritance-case-management/web:test
  staff-workload:private-banking:
  staff-workload:stock-valuation-form::server/shared
  staff-workload:bank-analyzer::server/shared
  staff-workload:staff-directory:test
  # 在籍・退職の判定（退職日の翌日から退職。台帳と、写しを持つ案件管理・PB で同じ判定にする）
  staff-retirement:staff-directory::server/shared
  staff-retirement:inheritance-case-management/web:test
  staff-retirement:private-banking:
  # 担当者を選ぶダイアログ（shared/staff-directory）が「退職予定」の印に使う
  staff-retirement:bank-analyzer:
  staff-retirement:capital-gains-calc:
  staff-retirement:depreciation-calc:
  staff-retirement:gift-tax-simulator:
  staff-retirement:inheritance-tax-app:
  staff-retirement:inheritance-tax-docs:
  staff-retirement:retirement-tax-calc:
  staff-retirement:stock-valuation-form:
)

check=0
[[ "${1:-}" == "--check" ]] && check=1
drift=0
changed_apps=()

for t in "${TARGETS[@]}"; do
  IFS=: read -r bundle app with_test dest_dir <<<"$t"
  src="$ROOT/shared/$bundle"
  dest="$ROOT/apps/$app/${dest_dir:-src/shared}/$bundle"
  [[ $check -eq 0 ]] && mkdir -p "$dest"
  for f in "$src"/*; do
    name="$(basename "$f")"
    [[ "$name" == *.test.* && "$with_test" != "test" ]] && continue
    if [[ $check -eq 1 ]]; then
      if ! cmp -s "$f" "$dest/$name"; then
        echo "ずれ: ${dest#"$ROOT/"}/$name（原本 shared/$bundle/$name）"
        drift=1
      fi
    elif ! cmp -s "$f" "$dest/$name"; then
      # 中身が同じなら写さない（更新日時だけ進むと、作り直し忘れの判定が全アプリで鳴る）
      cp "$f" "$dest/$name"
      echo "写した: ${dest#"$ROOT/"}/$name"
      [[ " ${changed_apps[*]} " == *" $app "* ]] || changed_apps+=("$app")
    fi
  done
  # 原本に無いファイルが写し先に残っていないか（原本から消したのに写しだけ残る形）
  if [[ -d "$dest" ]]; then
    for f in "$dest"/*; do
      name="$(basename "$f")"
      if [[ ! -e "$src/$name" ]]; then
        echo "原本に無い: ${dest#"$ROOT/"}/$name"
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

if [[ $check -eq 0 ]]; then
  if [[ ${#changed_apps[@]} -eq 0 ]]; then
    echo "ok: 写しはすべて原本と同じでした（何も変えていません）"
  else
    # 写しはイメージに焼き込まれる。src を bind mount している dev のアプリ以外は、
    # 作り直すまで前の版で動き続ける（2026-11-07 に7アプリがこれで取り残された）
    echo ""
    echo "写しを更新したアプリ: ${changed_apps[*]}"
    echo "動いているアプリへ反映するには（必要なアプリだけ作り直す・モードは踏襲）:"
    echo "  docker/scripts/manage.sh build --stale"
  fi
fi
