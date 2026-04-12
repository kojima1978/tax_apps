# 相続税申告 資料準備ガイド

相続税申告に必要な資料の準備・確認・管理をサポートするWebアプリケーションです。

## 書類リスト種別

1ページ内でドロップダウン切替。localStorage で種別ごとにデータを自動保存。

| 種別 | 説明 |
|:-----|:-----|
| 相続税申告 | 相続税申告に必要な全書類の管理（11カテゴリ） |
| 相続シミュレーション | シミュレーション用に必要最小限の書類（1カテゴリ・10書類） |
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
| 進捗バー | カテゴリヘッダーにチェック進捗を表示 |

### UI機能

| 機能 | 説明 |
|:-----|:-----|
| ダークモード | ワンクリック切替、localStorage で記憶 |
| Toast通知 | 操作結果をポップアップ通知（成功/エラー/情報） |
| ポータルに戻る | ヘッダー左端にホームアイコン+リンク |
| localStorage自動保存 | 種別ごとにデータを自動保存・復元 |
| 初期化 | 書類カスタマイズを標準状態に戻す（確認ダイアログ付き） |

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | xlsx-js-style によるスタイル付きExcelファイル |
| 印刷/PDF保存 | リスト型レイアウト（1列/2列切替、提出済み非表示オプション） |
| JSON保存 | 設定をJSONファイルとして保存 |
| JSON読込 | JSONファイルから設定を復元（旧フォーマットの後方互換あり） |

### 参考資料ダウンロード（/resources）

専用ページで相続手続きに関する参考資料をダウンロード可能。

| ファイル | 内容 |
|:--------|:-----|
| 相続手続きスケジュール | 葬儀後の手続きスケジュール（14日〜1年以内） |
| 手続き＆チェックリスト | 各種届出・手続き一覧と提出先・相談先 |
| 相続税申告後サポート | 二次相続対策・資産運用等の案内 |
| 保険を使った相続税対策 | 生命保険の非課税枠・生前贈与の節税方法 |
| 不動産リスク診断チェック表 | 保有不動産の10項目リスク診断 |
| 生計一親族チェックリスト | 生計一親族の判定チェックリスト（Excel） |

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
cd tax_apps/docker/scripts
manage.bat start
```

http://localhost/inheritance-tax-docs/ でアクセスできます（Nginx Gateway 経由）。

個別起動:

```bash
cd tax_apps/apps/inheritance-tax-docs
docker compose up -d
```

http://localhost:3003/inheritance-tax-docs/ でアクセスできます。

## 技術スタック

| カテゴリ | 技術 |
|:--------|:-----|
| ビルドツール | Vite 6 |
| UI | React 19, Tailwind CSS v4 |
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
│   │   ├── ResourcesPage.tsx            # 参考資料ダウンロードページ
│   │   └── ui/
│   │       ├── EditToolbar.tsx           # ヘッダーツールバー（種別切替・入力欄・アクション）
│   │       ├── SortableCategoryCard.tsx  # カテゴリカード（D&D・展開/折畳・進捗バー）
│   │       ├── SortableDocumentItem.tsx  # 書類カード（チェック・バッジ・詳細・個別名）
│   │       ├── PrintSection.tsx          # 印刷専用リスト型レイアウト
│   │       ├── DocumentFormModal.tsx     # 書類追加/編集モーダル
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
│   │   └── useToast.ts                 # Toast通知管理
│   └── utils/
│       ├── editableListUtils.ts         # 純粋関数CRUD操作（カテゴリ・書類・個別名）
│       ├── excelExporter.ts             # Excel出力ロジック
│       ├── helpers.ts                   # 日付フォーマット・丸数字等ユーティリティ
│       └── jsonDataManager.ts           # JSON保存/読込/バリデーション
├── public/
│   └── files/                           # 参考資料ダウンロード用ファイル（PDF/Excel）
├── docker-compose.yml                   # スタンドアロンDocker設定
├── docker-compose.prod.yml              # 本番オーバーライド（nginx静的配信）
├── vite.config.ts                       # Vite設定（basePath, エイリアス）
└── package.json
```

### アーキテクチャ

```
App.tsx（react-router-dom）
├── / → EditableListStep.tsx（メインコンポーネント）
├── /resources → ResourcesPage.tsx（参考資料ダウンロード）
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

旧フォーマット（v1.0 overlay-maps形式）のJSONファイルもインポート可能（後方互換）。
