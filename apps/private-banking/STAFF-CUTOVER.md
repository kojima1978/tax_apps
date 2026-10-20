# 担当者を社員台帳の写しへ切り替える（別の PC・本番サーバー向け）

2026-10-21 から、PB の担当者（`Staff`）は社員台帳（`apps/staff-directory`）の**写し**になった。
追加・修正・退職は社員台帳だけで行い、PB の「担当者」画面は表示と「今すぐ読み直す」だけになる
（書き込みの API は 405）。開発 PC では切替済み。この手順書は**まだ切り替えていない PC** 用。

## 何が変わるか

- `Staff.staffDirectoryId`（台帳ID）列が増える。マイグレーション
  `20261021000000_link_staff_directory` は列とユニーク索引を足すだけで、既存の行は消さない
  （entrypoint の `migrate deploy` が起動時に当てる）
- 担当者の一覧が読まれたとき、前回から5分以上たっていれば台帳から写し直す。台帳の人は
  コード `SD-<台帳ID>`（台帳に社員番号があればその番号）で作られる
- **PB に元々いた担当者は「未連携」になる**。名前では結び付けない（苗字だけの登録が多く、
  同姓の別人を同じ人にしてしまうため）。未連携の人は選択の候補から外れ（`isActive=false`）、
  **担当していた顧客の表示はそのまま残る**ので、顧客ごとに台帳の人へ選び直す
- 顧客のバックアップ（JSON）の取込・全体復元は**担当者を作らない**。台帳ID → コード
  （→ 旧形式は一意な氏名）で今の一覧から探し、見つからなければ取り込まずにエラーにする

## 順番

社員台帳 → 案件管理（段階2）→ PB（段階3）の順。PB だけ先に上げると、台帳が無いので
全員が未連携のまま一覧が空になる（画面に「社員台帳に接続できませんでした」が出る）。

**AI に任せるときは `apps/staff-directory/README.md` の「別の PC・本番サーバーへの導入」を渡す**
（台帳の起動から PB の切替まで、確認のコマンドと止まる条件つきで1本にしてある）。以下は人が読む補足。

### 1. 事前確認（読むだけ・何も変えない）

切り替える前に、未連携になる担当者と、その人が担当している顧客の件数を控えておく。

```bash
cd apps/private-banking && docker compose exec private-banking-postgres sh -c \
  'psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-private_banking}" -c "
SELECT s.id, s.\"staffCode\", s.name, s.\"isActive\", count(h.id) AS clients
FROM \"Staff\" s LEFT JOIN \"Household\" h ON h.\"staffId\" = s.id
GROUP BY s.id ORDER BY clients DESC, s.\"staffCode\";"'
```

`clients` が 0 でない人の顧客が、切替後に選び直す対象になる。顧客名まで控えるなら:

```bash
cd apps/private-banking && docker compose exec private-banking-postgres sh -c \
  'psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-private_banking}" -c "
SELECT s.name AS staff, h.\"clientCode\", h.name
FROM \"Household\" h JOIN \"Staff\" s ON s.id = h.\"staffId\"
ORDER BY s.name, h.\"clientCode\";"'
```

### 2. 社員台帳が動いていること

```bash
docker/scripts/manage.sh status          # staff-directory が healthy か
```

無ければ `docker/scripts/manage.sh build staff-directory`（初回は `start staff-directory`）で上げ、
案件管理の担当者を取り込む（`apps/staff-directory/README.md` の「案件管理からの取込」）。
PB にしか居ない担当者がいれば、**この時点で台帳に登録しておく**（社員台帳の画面から）。

### 3. バックアップを取ってから上げる

```bash
docker/scripts/manage.sh backup
git pull
docker/scripts/manage.sh build inheritance-case-management   # 段階2が未適用なら
docker/scripts/manage.sh build private-banking               # 稼働中のモード（本番）を踏襲する
```

個別に `-f docker-compose.prod.yml` を並べて叩かないこと（本番パスワードの用意が飛ぶ）。

### 4. 確認

- `http://<サーバー>/private-banking/staff` に台帳の人が並ぶ。「最終の読み直し」に時刻が出る
- 在籍状態を「未連携」にすると、手順1で控えた人が出る（担当件数つき）。画面の上にも
  「社員台帳に居ない担当者が N人います」と出る
- ログに `Applying migration 20261021000000_link_staff_directory` が出ている

### 5. 顧客の担当者を選び直す

未連携の人が担当していた顧客を開き、「本人情報」の担当者欄で台帳の人へ選び直す
（未連携の人は今の値としてだけ表示され、候補には出ない）。担当履歴は付け替えた日で区切られ、
以前の担当者名は履歴に残る。

担当者を外したい（あとで決める）顧客は空にしておけば、顧客一覧の「データ品質」で
「担当者未設定」の顧客をまとめて選び、一括で設定できる（一括設定の対象は担当者が空の顧客だけ）。

全員を選び直して担当件数が 0 になった未連携の人は、残しておいても候補には出ない。
消すなら担当履歴から参照されていないことを確かめてから DB で消す（画面には削除の口は無い）。

## 戻すとき

列を足しただけなので、前の版のイメージへ戻してもそのまま動く（`staffDirectoryId` は無視される）。
ただし戻した版は担当者を画面で編集できるため、戻している間に作った担当者は次に上げたとき
未連携になる。
