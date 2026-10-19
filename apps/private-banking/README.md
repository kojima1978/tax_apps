# private-banking（ファミリー B/S）

顧客（世帯）ごとに家族・財産・負債をまとめ、ファミリー B/S と相続税の試算を出すアプリ。
画面・データ・計算の仕様は **`docs/SPEC.md`** が本体で、ここは動かし方だけを書く。

構成は Next.js 16（App Router）+ React 19 + TypeScript / Prisma 6 / PostgreSQL 16。
検証は Zod、グラフは recharts。

## 画面

すべて `/private-banking` の下（詳しくは `docs/SPEC.md` §3）。

| パス | 中身 |
|---|---|
| `/` | 顧客一覧 |
| `/quality` | データ品質（入力漏れ・不整合の一覧） |
| `/properties` | 不動産一覧（全顧客横断） |
| `/staff` | 担当者の台帳 |
| `/backup` / `/restore` | 全体の JSON バックアップ / 復元 |
| `/customers/{id}/…` | 顧客ごとの画面（プロフィール・家族・税・B/S・明細・履歴・操作記録・顧客単位のバックアップ） |

## 名前

| | |
|---|---|
| URL | `/private-banking/`（`next.config.ts` の `basePath`） |
| コンテナ | `private-banking-app`（サービス名 `private-banking-web`）/ `private-banking-postgres` |
| ポート | 3025（画面）/ 3026（DB。どちらも `127.0.0.1` だけで待ち受ける） |
| ボリューム | `private-banking_private_banking_postgres`（DB）/ `private-banking_private_banking_next`（dev の `.next`） |

外からはゲートウェイ（nginx）経由で `/private-banking/` に入る。上流は `private-banking-app:3025`。

## コマンド

```bash
# 起動（dev）
docker/scripts/manage.sh start private-banking

# 本番モードへ切り替えて起動（パスワードの生成と ALTER ROLE はここで走る）
docker/scripts/manage.sh start --prod private-banking

# 再ビルド（いま動いているモードを踏襲する）
docker/scripts/manage.sh build private-banking

# 編集しながら開発する間、別ターミナルで開いておく（フォアグラウンド）
docker/scripts/manage.sh watch private-banking

# テスト（型検査 + vitest。稼働中のコンテナの中で回る）
docker/scripts/manage.sh test private-banking
```

- **起動は `manage.sh` から行う**。素の `docker compose up` は base の compose だけを読むので
  本番で動いているアプリを dev サーバに作り替え、個別に `-f docker-compose.prod.yml` を並べて叩くと
  本番パスワードの生成（`ensure_production_env`）が飛んで、entrypoint が開発用の既定パスワードを
  弾いて restart ループになる

## dev はソースを bind mount しない

**dev でもソースはイメージ同梱 + `docker compose watch` で同期する**（`manage.sh watch`）。
Docker Desktop for Windows の bind mount は起動直後の `scandir` が EFAULT を返すことがあり、
Next の dev サーバはスキャンに失敗したディレクトリ配下のルートを警告1行だけ残して丸ごと落とす
（「`✓ Ready` なのに 404」のまま動き続ける）。bind mount を無くしてこの経路ごと消した。

- `watch` の同期先（`docker-compose.yml` の `develop.watch`）:
  - `sync`: `./src` / `./public`
  - `rebuild`: `./prisma` / `package.json` / `package-lock.json` / `next.config.ts`
- **watch を止めている間の変更は入らない**。そのときは `manage.sh build private-banking`
- 同期はオーバーレイの上位層へ直接書くのでコンテナ内の inotify が鳴らない。**ポーリングが2箇所要る**:
  ルート表用の `WATCHPACK_POLLING`（compose の environment）と Turbopack の再コンパイル用の
  `watchOptions.pollIntervalMs`（`next.config.ts`）
- **スキャンガード**: 上の障害は health をすり抜けるので、`docker-entrypoint.sh` が dev サーバの出力を
  FIFO 経由で見張り、`Watchpack Error (initial scan)` が出たら落とす → `restart: unless-stopped` で
  上がり直す。next は `exec` せず子プロセスとして起動し、`docker stop` の TERM は trap で転送する
- dev の起動時に `/app/.next/dev` を消す（前回のビルド結果とのハッシュ食い違いで HMR が壊れるため）

## 本番

- `docker-compose.prod.yml` は `target: runner`・`read_only: true`（書けるのは tmpfs の `/tmp` だけ）・
  `volumes: !reset []`（base の `.next` ボリュームが本番ビルドを覆い隠さないよう、`!reset` が必須）
- **本番ではどの変更も `build` しないと入らない**
- entrypoint は `POSTGRES_PASSWORD` が空・`change-me`・`pb_dev_password` のままなら起動を拒む
- 本番イメージの Prisma CLI は `/app/prisma-cli` に別に入れてある（Dockerfile の `prisma-cli` ステージ）

## DB とマイグレーション

- 起動のたびに entrypoint が `prisma migrate deploy` を流す。スキーマの変更はマイグレーションを足して
  `prisma/migrations/` へ入れる
- DB は空のボリュームを `POSTGRES_INITDB_ARGS` で照合順序 `C` に初期化する。既存のボリュームを移すのは
  `manage.sh collation private-banking --yes`（手順書は `docker/COLLATION-MIGRATION.md`。この開発 PC は移行済み）
- Prisma クライアントは `npm ci` の `postinstall` でイメージに入る。**実行時に `prisma generate` しないこと**
  （書き込み層に残って `build` でも `apply` でも戻らない）
- health は `/private-banking/api/health`（DB まで見る）

## 相続税の計算

相続税額は**相続税シミュレーター（`inheritance-tax-app`）の API を呼んで**出す
（`src/app/api/inheritance-tax-calculate` / `inheritance-tax-secondary`）。

| 環境変数 | 既定 |
|---|---|
| `INHERITANCE_TAX_API_URL` | `http://inheritance-tax-app:3004/inheritance-tax-app/api/calculate` |
| `INHERITANCE_TAX_API_KEY` | 空 |

相続税シミュレーターが止まっていると試算は出ない（`tax-apps-network` 上のサービス名で叩く）。

## バックアップ

- 夜間の全体バックアップ（`docker/scripts/backup.sh`）が DB を `pg_dump` し、`.env` も一緒に持つ
  （`PG_TARGETS` / `SETTINGS_TARGETS`）。戻すのは `manage.sh restore private-banking`（`docker/RESTORE.md`）
- 画面の `/backup` / `/restore` は別の経路で、全体または1世帯を JSON で書き出し・読み込みする
  （`schemaVersion` 1）

## テスト

`npm test` は `npm run typecheck && vitest run`。`manage.sh test` は**稼働中のコンテナの中で**回し
（`TEST_TARGETS` の `private-banking:private-banking-app:npm test`）、同じものが CI の matrix にもある。

- `<アプリ名>-test` の使い捨てサービスは無いので、**本番モードで動いている間は手元では飛ばされる**
  （CI では回る）。手で回すなら `manage.sh start private-banking` で dev へ戻す
- `package.json` を変えたら `manage.sh build private-banking`（watch の `rebuild` でも作り直される）
- `npm run test:integration` は **実際の DB へつなぐ**（`clientCode` が `INTEGRATION-TEST` の世帯を作って消す）。
  既定の `test` では飛ばされる。顧客データの入った DB に対して叩くときはその前提で
