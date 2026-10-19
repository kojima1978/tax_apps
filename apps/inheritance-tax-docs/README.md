# 相続税申告 資料準備ガイド

相続税申告に必要な資料の準備・確認・管理をサポートするWebアプリケーションです。

## 書類リスト種別

1ページ内でドロップダウン切替。localStorage で種別ごとにデータを自動保存。

| 種別 | 説明 |
|:-----|:-----|
| 相続税申告 | 相続税申告に必要な全書類の管理（11カテゴリ） |
| 相続シミュレーション | シミュレーション用に必要最小限の書類（1カテゴリ・9書類） |
| 非上場株式評価 | 非上場株式評価に必要な書類の管理（5カテゴリ） |

## 主な機能

### 書類管理

| 機能 | 説明 |
|:-----|:-----|
| カード型UI | カテゴリごとの展開/折畳カード。tax-docs と同じデザインパターン |
| 書類の編集 | モーダルダイアログで書類名・説明・取得方法をカスタマイズ |
| カスタム書類追加 | 独自の書類をカテゴリに追加 |
| 個別名（具体名） | サブアイテムとして具体的な書類名を追加（CornerDownRight表示） |
| ドラッグ&ドロップ | カテゴリ・書類それぞれD&Dで並び順を変更 |
| 代行可否設定 | 各書類の取得代行可否をワンクリック切替（青バッジ） |
| 提出済みチェック | 書類ごとのチェック + 提出日自動記録 + カテゴリ単位の全済みボタン |
| 緊急フラグ | 書類に緊急マークを設定（赤バッジ、印刷時も強調表示） |
| 対象外設定 | 不要な書類を対象外に（半透明+バッジ表示、印刷・進捗から除外） |
| カテゴリ無効化 | カテゴリ単位で対象外に設定（グレー表示、印刷時は非表示） |
| 書類・カテゴリ削除 | 確認ダイアログ付きの削除 |
| ゴミ箱・復元 | 削除した書類・カテゴリをゴミ箱へ退避。削除直後はトーストの「元に戻す」、後からはゴミ箱（ツールバー）から個別／一括で復元。種別ごとに localStorage 永続（直近50件）、JSON にも保存 |
| 進捗バー | カテゴリヘッダーにチェック進捗を表示 |

### UI機能

| 機能 | 説明 |
|:-----|:-----|
| ダークモード | ワンクリック切替、localStorage で記憶 |
| Toast通知 | 操作結果をポップアップ通知（成功/エラー/情報） |
| ポータルに戻る | ヘッダー左端にホームアイコン+リンク |
| 参考資料 | ヘッダーから `/resources` へ |
| localStorage自動保存 | 種別ごとにデータを自動保存・復元 |
| 初期化 | 書類カスタマイズを標準状態に戻す（確認ダイアログ付き） |

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | xlsx-js-style によるスタイル付きExcelファイル |
| 印刷/PDF保存 | リスト型レイアウト（1列/2列切替、提出済み非表示オプション） |
| JSON保存 | 設定をJSONファイルとして保存 |
| JSON読込 | JSONファイルから設定を復元（旧フォーマットの後方互換あり） |

### 参考資料（/resources）

専用ページで相続手続きに関する参考資料をダウンロード・閲覧する。**中身はサーバーの SQLite が持つ**（画面から追加・編集・削除・並び替えができ、ファイルはアップロードする）。

- 一覧・追加・編集・削除・並び替えは `/inheritance-tax-docs/api/resources`、ファイルは `/inheritance-tax-docs/files/<ファイル名>` から配る
- 1件は「ファイル（PDF / Excel / Word 等、50MBまで）」か「外部リンク」のどちらか
- DB が空のときだけ、`server/db.ts` の初期データ17件を登録し、`public/files/` のファイルを `/app/data/uploads/` へ写す（以降は `public/files/` を見ない）
- データはボリューム `inheritance-tax-docs-data`（`/app/data`）にあり、夜間バックアップの対象（`backup.sh` の `SQLITE_TARGETS`）

初期データ:

| タイトル | 形式 |
|----------|------|
| 相続・手続きスケジュール | PDF |
| 手続き＆チェックリスト | PDF |
| 相続税申告後サポート | PDF |
| 保険を使った相続税対策 | PDF |
| 不動産リスク診断チェック表 | PDF |
| 生計一親族チェックリスト | Excel |
| 名義預金、生前贈与について | PDF |
| 預金移動調査について | PDF |
| 贈与契約書ひな形 | Word |
| 未分割申告の確認書 | Word |
| 申告完了までのスケジュール | Excel |
| 戸籍謄本の広域交付制度 | PDF |
| 法定相続情報証明制度 | PDF |
| 利用者識別番号とは | 外部リンク（国税庁） |
| 税務調査について | Word |
| 生前対策・遺言書 | PDF |
| 名義財産検討シート | Excel |

### 画面レイアウト

- **テーマカラー**: 緑（emerald）ベース — tax-docs と統一
- **ヘッダーツールバー**: ポータルリンク、タイトル、種別切替、お客様名・被相続人名・担当者・連絡先入力
- **アクションバー**: 全展開/折りたたみ、印刷設定、ダークモード、操作ボタン（印刷/Excel/JSON保存・読込/リセット）
- **カテゴリカード**: ドラッグハンドル + 展開/折畳 + 丸数字 + カテゴリ名 + 進捗バー
- **書類カード**: チェック□ + 番号 + 書類名 + バッジ（委任可/急/対象外/追加） + 説明 + 入手方法 + 個別名サブアイテム

### 印刷対応（リスト型）

- **1行目**: チェック□ + 番号 + 書類名 + バッジ（急/取得代行可/追加）
- **2行目**: 説明（小さめグレー文字）
- **3行目**: 入手方法（「入手:」ラベル付き）
- 急フラグの書類は赤背景で強調
- 1列/2列レイアウト切替対応
- 提出済み書類の非表示オプション

## セットアップ

### Docker（推奨）

```bash
# 起動（いまのモードを変えるときもこれ。本番は --prod）
docker/scripts/manage.sh start --prod inheritance-tax-docs

# 再ビルド（稼働中のモードを踏襲）
docker/scripts/manage.sh build inheritance-tax-docs
```

http://localhost/inheritance-tax-docs/ でアクセスする（Nginx ゲートウェイ経由）。素の `docker compose up` は本番を dev に作り替えるので使わない。

| モード | 中身 | メモリ |
|:--|:--|:--|
| dev | `npm run dev`（`tsx watch server/index.ts`）。Express に Vite をミドルウェアとして組み込み、画面と API を 3003 で配信。`src` / `server` / `public` / `index.html` を読み取り専用で bind mount（監視はポーリングなので編集は再起動なしで反映）。非 root（`node`） | 512M（ヒープ 384） |
| 本番 | ビルド済みの画面と API を Node（Express）が 3003 で配信。非 root（`node`） | 192M（ヒープ 128） |

ヘルスチェックは `/inheritance-tax-docs/api/health`。DB（`/app/data/resources.sqlite`）を開いて読めることに加え、
DB ファイルと `/app/data` に書けるかまで見て、使えなければ `503 {"status":"degraded","database":"EACCES"}` のようにエラーコードを返します。

## 技術スタック

| カテゴリ | 技術 |
|:--------|:-----|
| ビルドツール | Vite 6 |
| UI | React 19, Tailwind CSS v4 |
| サーバー | Express 5, better-sqlite3（参考資料）, multer（アップロード） |
| 言語 | TypeScript 5.9 |
| ルーティング | react-router-dom 7 |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| Excel出力 | xlsx-js-style |
| アイコン | Lucide React |
| Docker | Port 3003, basePath: /inheritance-tax-docs |

## プロジェクト構造

```
inheritance-tax-docs/
├── src/
│   ├── App.tsx                          # ルーティング（/ + /resources）
│   ├── main.tsx                         # Reactエントリポイント（BrowserRouter）
│   ├── globals.css                      # グローバルスタイル（ダークモード・印刷・アニメーション）
│   ├── components/
│   │   ├── EditableListStep.tsx          # メインページコンポーネント（状態・DnD・モーダル統合）
│   │   ├── ResourcesPage.tsx            # 参考資料ページ（API から一覧、追加・編集・削除・並び替え）
│   │   └── ui/
│   │       ├── EditToolbar.tsx           # ヘッダーツールバー（種別切替・入力欄・アクション）
│   │       ├── SortableCategoryCard.tsx  # カテゴリカード（D&D・展開/折畳・進捗バー）
│   │       ├── SortableDocumentItem.tsx  # 書類カード（チェック・バッジ・詳細・個別名）
│   │       ├── PrintSection.tsx          # 印刷専用リスト型レイアウト
│   │       ├── DocumentFormModal.tsx     # 書類追加/編集モーダル
│   │       ├── TrashModal.tsx           # ゴミ箱（削除した書類・カテゴリの復元）モーダル
│   │       ├── EditableInput.tsx         # インライン編集/追加入力
│   │       ├── AddCategoryForm.tsx       # カテゴリ追加フォーム
│   │       ├── ConfirmDialog.tsx         # 確認ダイアログ（削除/リセット/インポート/エラー）
│   │       ├── Dialogs.tsx              # ダイアログ群コンテナ
│   │       ├── Toast.tsx                # Toast通知コンテナ
│   │       ├── EmptyState.tsx           # 空状態表示
│   │       └── VerticalDivider.tsx      # 縦区切り線
│   ├── constants/
│   │   ├── index.ts                     # 型定義（EditableDocument, EditableCategory等）・ストレージキー・会社情報
│   │   ├── documents.ts                 # 相続税申告の書類マスターデータ（11カテゴリ）
│   │   ├── simplifiedDocuments.ts       # 相続シミュレーションの書類マスターデータ（1カテゴリ）
│   │   ├── unlistedStockDocuments.ts    # 非上場株式の書類マスターデータ（5カテゴリ）
│   │   ├── excelStyles.ts              # Excelスタイル定義
│   │   └── messages.ts                 # Toast・ダイアログメッセージ定数
│   ├── hooks/
│   │   ├── useInheritanceTaxGuide.ts    # メイン状態管理（種別切替・localStorage・Excel出力）
│   │   ├── useEditableListEditing.ts    # 編集操作統合（サブフック合成）
│   │   ├── useDocumentEditing.ts        # 書類レベル操作（チェック・フラグ・個別名）
│   │   ├── useCategoryEditing.ts        # カテゴリレベル操作（展開・無効化・追加・削除）
│   │   ├── useDragAndDrop.ts            # D&D状態管理（カテゴリ+書類の二重レベル）
│   │   ├── useJsonImportExport.ts       # JSON保存/読込（旧フォーマット後方互換）
│   │   ├── useDeleteConfirm.ts          # 削除確認状態管理
│   │   ├── useDarkMode.ts              # ダークモード切替
│   │   ├── useOverlayDismiss.ts        # 背景を押し始めたときだけモーダルを閉じる（ドラッグ選択の誤閉じ防止）
│   │   └── useToast.ts                 # Toast通知管理
│   └── utils/
│       ├── editableListUtils.ts         # 純粋関数CRUD操作（カテゴリ・書類・個別名）
│       ├── excelExporter.ts             # Excel出力ロジック
│       ├── exportFileName.ts            # 出力ファイル名（R081005_名前_アプリ名.ext）
│       ├── helpers.ts                   # 日付フォーマット・丸数字等ユーティリティ
│       └── jsonDataManager.ts           # JSON保存/読込/バリデーション
├── server/
│   ├── index.ts                         # Express 5（API・アップロードファイル・本番の画面配信）
│   ├── db.ts                            # SQLite（better-sqlite3）・スキーマ・初期データ（17件）・health 用の書込み確認
│   └── routes/
│       └── resources.ts                 # 参考資料の CRUD・並び替え（multer でアップロード、上限50MB）
├── public/
│   └── files/                           # 参考資料の初期ファイル（16件。DB が空のときだけ uploads へ写す）
├── Dockerfile                           # base → deps → dev / builder → runner
├── docker-compose.yml                   # dev（bind mount・ボリューム inheritance-tax-docs-data）
├── docker-compose.prod.yml              # 本番オーバーライド（runner・Node が画面と API を配信）
├── tsconfig.server.json                 # サーバーのビルド設定
├── vite.config.ts                       # Vite設定（basePath, エイリアス）
└── package.json
```

### アーキテクチャ

```
App.tsx（react-router-dom）
├── / → EditableListStep.tsx（メインコンポーネント）
├── /resources → ResourcesPage.tsx（参考資料。/api/resources を読む）
│
└── EditableListStep.tsx
    ├── useInheritanceTaxGuide — 状態管理（種別切替・localStorage・出力）
    ├── useEditableListEditing — 編集操作統合
    │   ├── useDocumentEditing — 書類操作（チェック・フラグ・個別名）
    │   ├── useCategoryEditing — カテゴリ操作（展開・無効化・名前変更）
    │   ├── useDeleteConfirm — 削除確認
    │   └── useJsonImportExport — JSON保存/読込
    ├── useDragAndDrop — D&D
    ├── useDarkMode — ダークモード
    ├── useToast — Toast通知
    │
    ├── EditToolbar — ヘッダーツールバー
    ├── SortableCategoryCard — カテゴリカード（DnDContext内）
    │   └── SortableDocumentItem — 書類カード
    ├── DocumentFormModal — 書類追加/編集モーダル
    ├── PrintSection — 印刷専用セクション
    ├── Dialogs — ダイアログ群
    └── ToastContainer — Toast通知
```

### JSONデータ形式（v2.0）

```json
{
  "version": "2.0.0",
  "exportedAt": "2026-03-28T00:00:00.000Z",
  "docListType": "inheritance-tax",
  "clientName": "山田 太郎",
  "deceasedName": "山田 一郎",
  "personInCharge": "佐藤 花子",
  "personInChargeContact": "088-632-6228",
  "documentList": [
    {
      "id": "...",
      "name": "マイナンバー・印鑑証明書",
      "documents": [
        {
          "id": "...",
          "name": "相続人全員のマイナンバー資料のコピー",
          "description": "マイナンバーカード、住民票等",
          "howToGet": "お手元にあるものをご用意ください",
          "canDelegate": false,
          "checked": true,
          "checkedDate": "2026/03/28",
          "excluded": false,
          "urgent": false,
          "specificNames": [
            { "id": "...", "text": "山田 太郎のマイナンバーカード" }
          ],
          "isCustom": false
        }
      ],
      "isExpanded": true,
      "isDisabled": false
    }
  ]
}
```

> `documentList` に加えて、ゴミ箱（削除した書類・カテゴリ）を `trash` 配列として任意で含みます。`trash` の無い旧JSONも読み込めます（後方互換）。

旧フォーマット（v1.0 overlay-maps形式）のJSONファイルもインポート可能（後方互換）。
