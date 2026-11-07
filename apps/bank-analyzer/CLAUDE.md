# CLAUDE.md（bank-analyzer）

ルートの `CLAUDE.md` から移した。


## スクリプト（Docker内で実行）

- 銀行取引分析 (bank-analyzer): `npm run dev:all`（Vite 3007 + API 3107 を並走）/ `npm run build` + `npm run build:server`。本番は Node が 3007 で両方を配信
  - Django 版の置き換え。段階7（2026-10-10）で名前・ポート・DB ボリュームをそのまま引き継ぎ、段階8（同日）で Django 版のディレクトリと DB の `auth_*` / `django_*` を削除した（コードは `4962355e` に残る）。まだ Django 版で動いている別の PC の切替手順は `apps/bank-analyzer/CUTOVER.md`
  - **DB は Django が作った表（`analyzer_*`）をそのまま使う**。スキーマの変更はマイグレーションを手で書いて `migrate deploy`（entrypoint が起動時に流す）。`prisma db push` / `migrate dev` は本番 DB に叩かない
  - 夜間バックアップの JSON は `npm run backup:json`（出力先は環境変数 `OUTPUT_DIR`）。`backup.sh` が稼働中のコンテナの中で呼ぶ。**ファイル名と中身は Django 版の管理コマンドと同じ形に保つこと** ── 過去のバックアップと同じフォルダに並び、どちらも画面の「JSONから復元」で読める（`version` は `1.0` / `1.1` の両対応）
