# データベース ER図 (Mermaid)

## エンティティ関連図

```mermaid
erDiagram
    passbook_sessions ||--o{ passbook_pages : "has many"
    passbook_pages ||--o{ audit_logs : "has many"

    passbook_sessions {
        INTEGER id PK
        TEXT session_id UK "UUID"
        TEXT bank_name "銀行名"
        TEXT account_number "口座番号"
        DATETIME created_at "作成日時"
        DATETIME updated_at "更新日時"
        TEXT status "processing/completed/error"
        INTEGER total_pages "総ページ数"
    }

    passbook_pages {
        INTEGER id PK
        TEXT session_id FK "セッションID"
        INTEGER page_number "ページ番号"
        TEXT image_path "画像パス"
        JSON raw_ocr_result "生OCR結果"
        JSON processed_data "構造化データ"
        JSON corrected_data "修正済みデータ"
        FLOAT processing_time "処理時間(秒)"
        FLOAT confidence_score "信頼度"
        TEXT resolution "解像度"
        TEXT validation_status "valid/invalid/pending"
        JSON validation_errors "エラー配列"
        DATETIME created_at "作成日時"
        DATETIME updated_at "更新日時"
    }

    audit_logs {
        INTEGER id PK
        INTEGER page_id FK "ページID"
        INTEGER row_index "行インデックス"
        TEXT column_name "カラム名"
        TEXT old_value "修正前の値"
        TEXT new_value "修正後の値"
        TEXT correction_type "修正タイプ"
        DATETIME timestamp "修正日時"
    }

    correction_patterns {
        INTEGER id PK
        TEXT bank_name "銀行名(インデックス)"
        TEXT resolution_range "解像度範囲"
        JSON column_boundaries "列境界配列"
        FLOAT row_height_avg "平均行高さ"
        BOOLEAN has_seal "印影の有無"
        TEXT date_format "日付フォーマット"
        TEXT amount_position "金額位置"
        INTEGER usage_count "使用回数"
        FLOAT success_rate "成功率"
        DATETIME last_used "最終使用日時"
        DATETIME created_at "作成日時"
    }
```

## データフロー図

```mermaid
flowchart TD
    A[ユーザー] -->|1. セッション作成| B[passbook_sessions]
    B -->|session_id| C[passbook_pages]
    D[OCRエンジン] -->|raw_ocr_result| C
    E[バリデーター] -->|validation_errors| C

    C -->|processed_data| F[TransactionEditor]
    F -->|ユーザー修正| G[audit_logs]
    G -->|修正履歴| C

    C -->|corrected_data| H[学習システム]
    H -->|パターン保存| I[correction_patterns]

    I -.学習データ参照.-> D

    style B fill:#e1f5ff
    style C fill:#fff4e1
    style G fill:#f0f0f0
    style I fill:#e8f5e8
```

## 処理シーケンス図

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as Frontend
    participant A as API
    participant OCR as OCR Engine
    participant V as Validator
    participant DB as Database

    U->>F: 画像アップロード
    F->>A: POST /api/sessions/{id}/upload
    A->>DB: セッション検証

    A->>OCR: 画像処理
    OCR->>OCR: 前処理(印影除去・傾き補正)
    OCR->>OCR: PP-OCRv5推論
    OCR-->>A: raw_ocr_result

    A->>A: 表構造解析
    A->>V: バリデーション
    V->>V: 残高チェック
    V-->>A: validation_errors

    A->>DB: passbook_pages INSERT
    DB-->>A: page_id
    A-->>F: OCR結果 + バリデーション

    F->>U: エディタ表示
    U->>F: データ修正
    F->>A: POST /api/pages/{id}/correct

    A->>DB: corrected_data UPDATE
    A->>DB: audit_logs INSERT
    A->>V: 再バリデーション
    A->>DB: correction_patterns UPDATE

    A-->>F: 更新完了
    F-->>U: 反映
```

## データ変換フロー

```mermaid
flowchart LR
    A[原画像] -->|前処理| B[処理済み画像]
    B -->|PP-OCRv5| C[raw_ocr_result]

    C -->|構造化| D[processed_data]
    D -->|バリデーション| E{エラー?}

    E -->|あり| F[validation_errors]
    E -->|なし| G[valid]

    D -->|ユーザー修正| H[corrected_data]
    H -->|学習| I[correction_patterns]

    H -->|監査| J[audit_logs]

    style A fill:#f9f9f9
    style C fill:#ffecb3
    style D fill:#fff9c4
    style H fill:#c8e6c9
    style I fill:#b2dfdb
```

## テーブルサイズ推移

```mermaid
graph LR
    A[1セッション] -->|200 bytes| B[passbook_sessions]
    A -->|500 KB| C[passbook_pages x10]
    A -->|10 KB| D[audit_logs]
    A -->|2 KB| E[correction_patterns]

    F[1000セッション] -->|約500 MB| G[Database Total]
    F -->|約5 GB| H[Image Files]

    style B fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#e8f5e9
    style G fill:#ffebee
    style H fill:#fce4ec
```

## 状態遷移図（validation_status）

```mermaid
stateDiagram-v2
    [*] --> pending: OCR処理開始
    pending --> valid: バリデーション成功
    pending --> invalid: バリデーション失敗

    invalid --> valid: ユーザー修正
    valid --> invalid: 再バリデーション失敗

    valid --> [*]: エクスポート完了
```

## セッション状態遷移図

```mermaid
stateDiagram-v2
    [*] --> processing: セッション作成
    processing --> processing: ページ追加
    processing --> completed: 全ページ処理完了
    processing --> error: 処理エラー

    error --> processing: リトライ
    completed --> [*]: セッション終了
```

## クエリ最適化 - インデックス利用

```mermaid
graph TD
    A[クエリ実行] --> B{インデックスあり?}
    B -->|Yes| C[高速検索]
    B -->|No| D[フルスキャン]

    C --> E[session_id]
    C --> F[validation_status]
    C --> G[bank_name]

    D --> H[遅い]

    style C fill:#c8e6c9
    style D fill:#ffcdd2
```

## バックアップ戦略

```mermaid
flowchart TB
    A[毎日バックアップ] --> B{データ種別}

    B -->|SQLite| C[passbook.db]
    B -->|画像| D[uploads/]

    C --> E[SQLite .backup]
    D --> F[tar.gz圧縮]

    E --> G[data/backups/]
    F --> G

    G --> H[クラウドストレージ<br/>外部HDD]

    style G fill:#fff9c4
    style H fill:#c8e6c9
```

## データライフサイクル

```mermaid
gantt
    title データ保持期間
    dateFormat  YYYY-MM-DD
    section セッション
    作成           :a1, 2024-01-01, 1d
    処理中         :a2, after a1, 7d
    完了・保存     :a3, after a2, 90d
    アーカイブ     :a4, after a3, 365d

    section 画像
    アップロード   :b1, 2024-01-01, 1d
    処理完了後保持 :b2, after b1, 30d
    削除可能       :b3, after b2, 1d
```

---

## 使用方法

このMarkdownファイルは、GitHub、GitLab、VS Code（Mermaid拡張機能）などで、
図として自動レンダリングされます。

### VS Codeでの表示方法
1. Mermaid拡張機能をインストール
2. このファイルを開く
3. プレビューモードで表示

### オンラインエディタ
- https://mermaid.live/

---

最終更新: 2025年1月11日
バージョン: 3.1.0
