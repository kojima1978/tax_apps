# PostgreSQL 照合順序の移行 作業指示書（別の PC 用）

この文書は、**この PC 以外で tax_apps を稼働させている PC** の DB を、libc に依存しない
照合順序 `C` へ移すための指示書です。AI エージェントにそのまま渡して実行させる前提で書いています。
上から順に実行し、**「止まる条件」に当たったらその場で作業を止めて人に報告すること**。

## 目的

PostgreSQL 4件（itcm / bank-analyzer / private-banking / stock-valuation-form）の DB を、
`LC_COLLATE=en_US.utf8`（libc 提供）から `LC_COLLATE=C`（Postgres 組み込みのバイト順）へ移す。
あわせて各クラスタの `template1` も `C` で作り直す。

### なぜ必要か

- `en_US.utf8` の並び順は **イメージの libc で決まる**。alpine（musl）はバイト順、bookworm（glibc）は
  言語順で、同じボリュームでも `image:` を1行変えるだけで並び順とインデックスが食い違う。
- しかも musl は照合順序のバージョンを返さない（`datcollversion` が NULL）ので、
  **Postgres 自身の不一致検知が働かず、警告ゼロのまま壊れる**。
- `template1` が `en_US.utf8` のままだと、リストアや新しく作る DB がまた libc 依存に戻る。

`C` へ移した後は、alpine / bookworm のどちらで開いても並び順は変わらない。

## 前提

- 作業はリポジトリのルート（`tax_apps/`）で、**Git Bash** から行う。
- `docker/scripts/manage.sh collation` が使える版（この文書と同じコミット以降）であること。
- 4アプリの DB コンテナが**起動していること**（停止中のアプリは移せない）。
- 所要時間の目安は1アプリ数分。移行中は**そのアプリだけ**が止まる（他のアプリは動き続ける）。

## 禁止事項

- Docker ボリュームを削除しない（`docker volume rm` / `docker compose down -v` / `manage.sh clean` を使わない）。
- DB を初期化しない。旧 DB（`<db>_pre_c`）を**確認前に**消さない。
- 検証済みのバックアップが無い状態で実データに触らない（`collation --yes` は自分でも確かめて拒否する）。
- `REINDEX` を手で実行しない（`collation` は新しい DB へ復元するのでインデックスは作り直される）。
- 移行の前に DB の `image:`（alpine ↔ bookworm）を変えない。
- `apps/bank-analyzer/docker-compose.yml` の `external: true` は**追加も削除もしない**（この PC に
  未コミットで入っていれば、そのまま残す）。
- 関係のない未コミット変更を修正・破棄・整形しない。`git add -A` / `git reset --hard` /
  `git checkout -- .` / `git stash`（ファイル指定なし）を使わない。
- Docker Desktop の Gordon / Docker AI / CLI hooks をグローバルに無効化しない。
- 移行を entrypoint・`apply`・`recover`・`due`・ウォッチドッグなど**自動の経路に載せない**。

## 手順

### 1. 未コミット変更の確認

```bash
git status --short
git diff --stat
```

- 未コミット変更は**記録だけして触らない**。
- `apps/bank-analyzer/docker-compose.yml` に変更がある（`external: true` など）場合は、手順2の
  「止まる条件」を参照する。

### 2. 最新の master を取り込む

```bash
git fetch origin
git pull --ff-only origin master
```

- `apps/bank-analyzer/docker-compose.yml` などの**ローカル変更と衝突して pull が拒否された場合**は、
  その**ファイルだけ**を退避して取り込み、戻す:

  ```bash
  git stash push -m "local-before-collation" -- apps/bank-analyzer/docker-compose.yml
  git pull --ff-only origin master
  git stash pop
  ```

  `stash pop` で競合したら、取り込んだ変更（`POSTGRES_INITDB_ARGS` の追加など）と
  ローカルの変更（`external: true` など）の**両方を残す**形で解消する。判断できなければ止まる。
- 止まる条件: `--ff-only` が失敗する（ローカルにコミットがある）／競合を両方残す形で解消できない。

取り込めたら確認する:

```bash
bash -n docker/scripts/manage.sh && bash -n docker/scripts/backup.sh && echo ok
docker/scripts/manage.sh help | grep collation
```

### 3. バックアップとリストア訓練

`collation --yes` は **24時間以内に成功した backup と drill** が無いと実行を拒否する。

```bash
docker/scripts/manage.sh backup
docker/scripts/manage.sh drill
```

- drill の最後に `Failed: 0` と `All drilled databases restored cleanly.` が出ること。
- 止まる条件: backup か drill が失敗する（原因を報告。移行には進まない）。

### 4. 現状の一覧（何も変えない）

```bash
docker/scripts/manage.sh collation
```

各アプリの判定は次のどれか:

| 判定 | 意味 | この後 |
|------|------|--------|
| `OK（libc 非依存）` | DB も template1 も `C` | 何もしない |
| `template1 が en_US.utf8（要 --yes）` | DB は移行済み、template1 だけ残っている | 手順5（アプリは止まらない） |
| `libc 依存（記録=なし）` | musl 生まれ。今の並びもバイト順 | 手順5（並びは変わらない） |
| `libc 依存（記録=2.36 など）` | glibc 生まれ。今の並びは言語順 | **手順5の前に手順4a** |
| `（接続できません）` / 一覧に出ない | DB コンテナが止まっている | `manage.sh start <app>` してから一覧をやり直す |

一覧の出力を報告用に控えておく。

### 4a. glibc 生まれの bank-analyzer だけ：移行前の口座の並びを控える

記録バージョンがある（`記録=2.36` など）DB は、並びが言語順からバイト順へ変わる。
画面で効くのは bank-analyzer の口座の並び（印刷順が同じ口座どうしの銀行名・支店名・口座番号の順）だけ。
移行前に控える（ファイルはリポジトリの外、例えば `/tmp` に置く）:

```bash
docker exec bank-analyzer-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select case_id, id from analyzer_account order by case_id, print_order, bank_name, branch_name, account_number"' > /tmp/ba-account-order-before.txt
wc -l /tmp/ba-account-order-before.txt
```

itcm / private-banking / stock-valuation-form は alpine（musl）生まれなので並びは変わらない。この手順は要らない。

### 5. アプリごとに移行する

**1アプリずつ**、表示 → 実行の順で叩く。対象は手順4で `OK` 以外だったアプリだけ。

```bash
docker/scripts/manage.sh collation <app>          # 手順の表示（何も変えない）
docker/scripts/manage.sh collation <app> --yes    # 実行
```

`<app>` は `inheritance-case-management` / `bank-analyzer` / `private-banking` / `stock-valuation-form`。

`--yes` の中身（スクリプトが自動で行う）:

1. DB 以外のサービスを止める（全体の停止マーカーは置かない）
2. `pg_dump` → `LC_COLLATE=C` の新しい DB（`<db>_c_tmp`）へ `pg_restore`
3. 全テーブルの件数を照合（1件でも違えば入れ替えずに中断）
4. 改名で入れ替え（`<db>` → `<db>_pre_c`、`<db>_c_tmp` → `<db>`）
5. 止めたサービスを起動
6. template1 を `C` で作り直す（中身が空のときだけ）

成功時の出力に次が含まれること:

- `件数一致: N テーブル / M 行`
- `<app> の <db> を LC_COLLATE=C へ移しました`
- `template1 を LC_COLLATE=C へ作り直しました`（template1 が既に `C` なら出ない）

止まる条件（どれも**元の DB は変わっていない**状態で止まる。手で直そうとせず報告する）:

- `24時間以内に成功したバックアップとリストア訓練がありません` → 手順3へ戻る
- `前回の残りがあります: <db>_c_tmp` など → 前回の中断の残り。中身を確かめずに消さない
- `件数が一致しません` / `復元に失敗しました` → `<db>_c_tmp` は調査用に残る
- `template1 にオブジェクトが N 件あります` → template1 に何か入っている。触らない
- `入れ替え後の照合順序が C になっていません`

`--yes` が終わったら、次のアプリへ進む前に手順6の確認をそのアプリについて行う。

### 6. 確認（アプリごと）

```bash
docker/scripts/manage.sh collation                 # そのアプリが OK（libc 非依存）になったこと
docker/scripts/manage.sh status                    # そのアプリが healthy であること
docker logs --since 10m <DB コンテナ名> 2>&1 | grep -i collation   # 何も出ないこと
```

DB コンテナ名: `itcm-postgres` / `bank-analyzer-postgres` / `private-banking-postgres` / `svf-postgres`。

手順4a を行った bank-analyzer は、移行後の並びも控えて比べる:

```bash
docker exec bank-analyzer-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select case_id, id from analyzer_account order by case_id, print_order, bank_name, branch_name, account_number"' > /tmp/ba-account-order-after.txt
diff /tmp/ba-account-order-before.txt /tmp/ba-account-order-after.txt && echo "並びは同じ"
```

差分が出ても**失敗ではない**（言語順からバイト順へ変わった結果）。変わった口座の件数と案件を
報告に書く。困る場合は口座の印刷順（`print_order`）を画面で付け直せば並びは固定できる。

### 7. 全アプリの最終確認

```bash
docker/scripts/manage.sh preflight
```

- チェック22（照合順序）で WARN が出ないこと。
- 他の WARN は今回の作業と関係なければ記録だけする（直さない）。

compose の変更（`POSTGRES_INITDB_ARGS`）は**空のボリュームを初期化するときだけ**効くので、
既存のデータには影響しない。コンテナへ反映しておくなら（DB コンテナが数秒作り直される）:

```bash
docker/scripts/manage.sh apply inheritance-case-management
docker/scripts/manage.sh apply bank-analyzer
docker/scripts/manage.sh apply private-banking
docker/scripts/manage.sh apply stock-valuation-form
```

反映後、`manage.sh status` で4アプリが healthy に戻ったことを確かめる。

### 8. 旧 DB の片付け（人の確認の後）

旧 DB（`<db>_pre_c`）は巻き戻し用に残っている。**画面で各アプリを開いて問題が無いと人が
確かめてから**消す。AI が自分の判断で消さないこと。

```bash
# 例: bank-analyzer
docker exec bank-analyzer-postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE bank_analyzer_pre_c"'
```

| アプリ | コンテナ | 旧 DB |
|--------|----------|-------|
| inheritance-case-management | `itcm-postgres` | `inheritance_tax_db_pre_c` |
| bank-analyzer | `bank-analyzer-postgres` | `bank_analyzer_pre_c` |
| private-banking | `private-banking-postgres` | `private_banking_pre_c` |
| stock-valuation-form | `svf-postgres` | `stock_valuation_pre_c` |

旧 DB の名前は `collation --yes` の出力（`旧 DB: ...`）でも確かめられる。

巻き戻す場合（消す前なら可能。アプリを止めてから）:

```sql
ALTER DATABASE "<db>" RENAME TO "<db>_c_tmp";
ALTER DATABASE "<db>_pre_c" RENAME TO "<db>";
```

## 完了報告に含める内容

- 手順1の未コミット変更の一覧と、触らなかったこと（`external: true` を変えたかどうかとその根拠）
- 取り込んだコミット（`git log -1 --oneline`）
- backup / drill の結果
- 手順4の一覧（移行前）と、手順7の一覧（移行後）
- アプリごとの `件数一致: N テーブル / M 行` と template1 の結果
- bank-analyzer の口座の並びの差分（手順4a を行った場合）
- `preflight` の Results 行とチェック22の結果
- 旧 DB を消したかどうか（消していない場合は残っている名前）
- 止まった場合は、止まった手順・出力の全文・DB の状態（`collation` の一覧）
