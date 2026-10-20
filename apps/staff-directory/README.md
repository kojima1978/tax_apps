# 社員台帳 (staff-directory)

全アプリで使う社員・部署・事務所の情報の置き場。各アプリは自分で社員を持たず、
**台帳ID** でここの人を参照する（名前は表示用の控えとして各アプリ側に写してよい）。

- 画面: http://localhost/staff-directory/ （社員 / 部署 / 事務所）
- Port 3031、Vite + React 19 + Tailwind v4 / Express 5 + better-sqlite3
- DB: `/app/data/staff.sqlite`（ボリューム `staff-directory-data`）。
  夜間バックアップ・リストア・訓練の対象（`backup.sh` の `SQLITE_TARGETS`）

## 決めごと

- **台帳ID は振り直さない・消さない**。辞めた人は退職日を入れるだけで、一覧の既定（在籍）から外れる。
  他アプリが過去の案件で参照し続けるため、社員を消す API は無い
- **社員番号は空でもよく、後から書き換えられる**（今はどのアプリも仮の番号）。
  入れた番号は重複できない。人の同一性は社員番号ではなく台帳ID で見る
- フリガナはカタカナで保存（ひらがな・半角カナは入力時に寄せる）。未入力の人は一覧の末尾
- 部署は所属者（退職者を含む）がいる間は消せない。使わなくなったら「使用」を外す
- 事務所は1件だけ（名称・郵便番号・住所・代表電話・FAX）
- **リポジトリは公開**なので、テストやシードに実在の社員の名前・電話番号を書かない

## API（`/staff-directory/api`）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/staff?status=active\|retired\|all` | 社員一覧（既定 active。フリガナ順） |
| GET / PUT | `/staff/:id` | 1人の取得・更新 |
| POST | `/staff` | 追加（台帳ID が振られる） |
| GET / POST | `/departments` | 部署一覧（在籍者数つき）・追加 |
| PUT / DELETE | `/departments/:id` | 部署の更新・削除（所属者がいれば 409） |
| GET / PUT | `/office` | 事務所情報 |
| GET | `/health` | DB の `SELECT 1` とファイル・フォルダの書込権限（失敗は 503） |

エラーは `{ "error": "日本語の理由" }`（入力不備 400 / 重複・参照不整合 409 / 無い 404）。
他アプリのサーバからはコンテナ間で `http://staff-directory:3031/staff-directory/api/...` を読む。
**台帳が止まっていても各アプリが動くこと**（控えの名前で表示を続ける）を前提にする。

## 案件管理からの取込

案件管理（itcm）の担当者・部署を台帳へ写す。何度流しても同じ（取込済みは読み飛ばす）。

```bash
# 一覧だけ（DB は変わらない）
cd apps/staff-directory && docker compose exec staff-directory npm run import:itcm
# 実行
cd apps/staff-directory && docker compose exec staff-directory npm run import:itcm -- --yes
```

- 部署は**同じ名前**の部署があれば結び付け、無ければ作る
- 担当者は**名前では結び付けない**（苗字だけの登録が多く、同姓の別人を同じ人にしてしまう）。
  台帳に同じ名前の人がいれば注意を出したうえで別人として作る
- 取込済みの人は**上書きしない**。台帳で直したフリガナや電話が、流し直しで消えないように
- 案件管理で使用停止の担当者は、停止にした日（日本時間）を退職日にして入れる
- 社員番号は引き継ぐが、台帳で使用済み・取込内で重複するものは空にして注意を出す
- 取込元とのつながりは `external_links`（`app='itcm'`）に残る。案件管理側を台帳ID 参照へ
  切り替えるときはここを引く

## テスト

```bash
docker/scripts/manage.sh test staff-directory
```

使い捨ての `staff-directory-test` コンテナで型検査 + vitest（DB は `:memory:`）。
