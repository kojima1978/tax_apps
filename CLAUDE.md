# CLAUDE.md

このリポジトリで作業する Claude Code への指示。

## 作業の進め方（必ず守る）

- **返答は常に日本語**（コード・コマンド・エラーの引用は除く）。報告は最初の1〜2行に結論（直ったか・何が残ったか）を書く
- **一人運用・master に直接コミット**。一区切りしたら聞かずに commit → push → CI の結果確認まで行う。
  ステージするのはその作業で変えたファイルだけ（`git add -A` しない）。別セッションや Codex の作業中の変更、
  「コミットに含めない」と言われた変更には触らない
- **方針は根本解決**。古い書き方・古い API へのコード上の後方互換は残さなくてよい。
  ただし**保存済みのデータとバックアップは壊さない**（本番 PC で実データを運用している）。
  形を変えるときはマイグレーションか復元時の変換で受ける
- **選択肢を出すときは推奨を1つ明示する**。元に戻せる変更（UI・文言・リファクタ）は推奨で進めてから報告する。
  確認を取るのは、データ削除・DB スキーマ・本番運用・税額計算の仕様が変わるときだけ
- **作業中に見つけた関連の不具合・残骸**（未使用 CSS・依存・重複定数・古いコメントなど）は同じ作業で直す。
  「承認範囲外なので残しました」で止めない。破壊的なもの（データ・ボリューム・ブランチの削除）だけ確認する
- **直したら横展開する**: 同じ穴が他のアプリ・他の画面（新規／編集、1件入力／まとめて入力、印刷）にないか確かめて直す
- **UI を変えたら playwright-cli で画面と印刷プレビューを実際に確認**してから報告する。詰めすぎ・崩れ・はみ出しも見る
- **計算ロジックを変えたらテストを足す**。仕様が変わったら同じコミットで README・SPEC.md も直す
- **文書の確認を頼まれたら**、関連する文書を一覧にして全部見る（1ファイルずつ指示を待たない）
- 区切りごとに、聞かれる前にメモリへ要点を残す

## 重要な制約

- **ローカル環境を汚さない**: `npm install`、`npm run build` 等をローカルで実行しないこと。開発・動作確認はDocker経由で行う。
  **`preflight` のチェック23**が `apps/` の下にホスト側の `node_modules` を毎回探す ──
  `.gitignore` 済みなので `git status` には出ず、2026-10-13 には3アプリで合計 1.6GB まで
  育っていた（ビルドは全部 Docker の中なので、ホストのこれは何にも使われない）。
  **見つけたらその場で消すこと** ── ほかへ退避すると、パスが 260 文字を超えた時点で
  Windows では `rm` でもエクスプローラでも消せなくなる（`@prisma/engines` の下が実際に
  そうなり、短いパスへ rename してからでないと消せなかった）。

## コマンド

### 基本（`docker/scripts/manage.sh` を使う）

各アプリは個別の `docker-compose.yml` を持つ。共有ネットワーク `tax-apps-network` で接続。

```bash
# 全アプリ起動（開発モード）
docker/scripts/manage.sh start

# 全アプリ本番モード起動
docker/scripts/manage.sh start --prod

# 1アプリだけモードを切り替えて起動（混在稼働はこちら）
docker/scripts/manage.sh start --prod <app-name>
docker/scripts/manage.sh start <app-name>

# 特定アプリのみ再ビルド（稼働中のモードを踏襲）
docker/scripts/manage.sh build <app-name>

# compose の変更をコンテナへ反映（再ビルドなし・引数なしで全アプリ）
docker/scripts/manage.sh apply [app-name]

# ソース変更をコンテナへ同期（対応アプリのみ・フォアグラウンド）
docker/scripts/manage.sh watch <app-name>

# ログ確認
docker/scripts/manage.sh logs <app-name>

# 全アプリ停止
docker/scripts/manage.sh stop

# 落ちているアプリだけ起動し直す（ウォッチドッグ用・再ビルドなし）
docker/scripts/manage.sh recover

# 状態確認
docker/scripts/manage.sh status

# テスト（稼働中のコンテナの中で実行・引数省略で対象すべて）
docker/scripts/manage.sh test [app-name]

# 全体バックアップ / リストア
docker/scripts/manage.sh backup
docker/scripts/manage.sh restore [app|--all] [backup] [--yes]   # docker/RESTORE.md

# リストア訓練（使い捨てDBへ実際に復元して検証。引数省略で最新が対象）
docker/scripts/manage.sh drill

# 期限切れの無人処理だけ実行（バックアップ20時間・訓練168時間・掃除144時間・ループ検知3時間。ウォッチドッグ用）
docker/scripts/manage.sh due

# 画面のリロードループの検知（ゲートウェイのログを読むだけ・ロックも取らない）
docker/scripts/manage.sh loop-check

# 無人向けの掃除（確認なし・ボリュームには触らない）
docker/scripts/manage.sh prune

# デスクトップの警告ファイルを作り直す（Docker 不要・ロックも取らない）
docker/scripts/manage.sh alert
```

MCP サーバー（決算書 PDF から株式評価明細書への取込）を Claude デスクトップへ登録する:

```bash
# イメージ作成＋設定への登録を1回で（既存の設定はマージ・変更前の控えつき）
docker/scripts/setup-mcp.sh

# 何が変わるかだけ見る
docker/scripts/setup-mcp.sh --dry-run
```

**ビルドを伴う compose はリポジトリ直下から叩くこと**（`docker compose -f apps/<app>/docker-compose.yml …`）。
共有の `docker/Dockerfile.vite-static` を使う7アプリは、上の `cd apps/<app> && … --build` だと
Bake の読み取り範囲の外になり `failed to execute bake: exit status 1` だけ出して止まる。
`manage.sh` の中は `compose_from_project_root`（`lib/compose-build.sh`）を通し、通っていない
呼び出しは CI の `tests/compose-build.test.sh` が落とす。`BUILDX_BAKE_ENTITLEMENTS_FS=0` で確認ごと外さない。

### 要点（詳細は `docker/scripts/CLAUDE.md`）

- compose を変えたら `manage.sh apply [app]`（再ビルドしない。`docker restart` では反映されない）。ソースや `package.json` を変えたら `manage.sh build <app>`。作り直し忘れは `manage.sh build --stale`
- `build` / `apply` は稼働中のモードを踏襲する。モードを変えるのは `start`（`start --prod <app>` / `start <app>`）。**`-f docker-compose.prod.yml` を手で並べて叩かない**（本番シークレットの準備が飛び、restart ループになる）
- `stop` / `down` / `clean` は停止マーカーを置き、その間は自動復旧の対象外。全体の `start` で解除
- テストは `manage.sh test [app]`（稼働中のコンテナの中で走る）。`package.json` の `test` は `npm run typecheck && vitest run` の形。テストを足したら `TEST_TARGETS` と `.github/workflows/ci.yml` の両方に1行。実行時に `prisma generate` しない
- 運用スクリプトでは終了コードを握り潰さない。ロックなどの共通処理は `docker/scripts/lib/ops-common.sh` にだけ置く
- バックアップの暗号鍵 `~/.tax-apps/backup.key` の控えは手で取る（失うと暗号化アーカイブが全部読めなくなる）

### 詳細の置き場所

Claude Code はサブフォルダの `CLAUDE.md` を、そのフォルダのファイルを読んだときに自動で読み込む。**Docker の運用を変える作業・`manage.sh` を使う作業の前には `docker/scripts/CLAUDE.md` を先に読むこと。**

| ファイル | 中身 |
|---|---|
| `docker/scripts/CLAUDE.md` | build / apply / start とモード、manage.sh / backup.sh、テスト、自動起動・自動復旧 |
| `apps/CLAUDE.md` | compose の書き方（アンカー・メモリ上限・NODE_OPTIONS）、Dockerfile（非 root）、ソース同期（watch） |
| `apps/mcp-server/CLAUDE.md` | MCP サーバー（株式評価明細書への取込） |
| `apps/stock-valuation-form/CLAUDE.md` | 業種目データの取込・入れ直し・持ち運び |
| `apps/bank-analyzer/CLAUDE.md` | Django 版からの置き換え・DB・夜間バックアップ JSON |

### 個別アプリのスクリプト（Docker内で実行）
- Next.js系 / Vite系: `npm run dev` / `npm run build` / `npm run lint`
- 案件管理 (inheritance-case-management/web): `npm run dev` / `npm run db:generate` / `npm run db:push`
- 株式評価明細書・銀行取引分析は各アプリの `CLAUDE.md` を参照

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
