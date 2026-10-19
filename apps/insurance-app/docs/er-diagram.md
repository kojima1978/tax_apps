# ER図 — 保険証券分析・診断ダッシュボード

```mermaid
erDiagram
    cases {
        TEXT id PK "UUID"
        TEXT title "ケースタイトル"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    agencies {
        TEXT id PK "UUID"
        TEXT case_id FK, UK "cases.id (UNIQUE)"
        TEXT name "代理店名"
        TEXT representative "取扱者名"
        TEXT phone "電話番号"
        TEXT logo_data_url "ロゴ画像 (data URL)"
        INTEGER print_logo "印刷表紙にロゴを載せるか (既定1)"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    family_members {
        TEXT id PK "UUID"
        TEXT case_id FK "cases.id"
        TEXT name "氏名"
        TEXT name_kana "フリガナ"
        TEXT relationship "続柄"
        TEXT birth_date "生年月日 (YYYY-MM-DD)"
        TEXT gender "性別 (male/female)"
        INTEGER sort_order "表示順"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    policies {
        TEXT id PK "UUID"
        TEXT case_id FK "cases.id"
        TEXT company_name "保険会社名"
        TEXT policy_type "保険種類"
        TEXT policy_number "証券番号"
        TEXT contract_date "契約日 (YYYY-MM-DD)"
        INTEGER contract_age "契約年齢"
        TEXT insured_member_id FK "family_members.id (被保険者)"
        TEXT beneficiary_member_id FK "family_members.id (受取人)"
        TEXT beneficiary_allocations "受取人ごとの受取割合 (JSON)"
        TEXT pension_settings "個人年金の受取設定 (JSON)"
        INTEGER death_benefit_disease "死亡保障・疾病 (円)"
        INTEGER death_benefit_accident "死亡保障・災害 (円)"
        INTEGER hosp_day_disease "入院日額・疾病 (円)"
        INTEGER hosp_day_accident "入院日額・災害 (円)"
        INTEGER diagnosis_benefit "診断一時金 (円)"
        INTEGER policy_end_age "保険期間終了年齢"
        TEXT currency "通貨 (JPY/USD)"
        REAL exchange_rate "互換用 (評価は app_state_meta の為替を使う)"
        REAL foreign_premium_amount "外貨建て保険料"
        REAL foreign_death_benefit_disease "外貨建て死亡保障・疾病"
        REAL foreign_death_benefit_accident "外貨建て死亡保障・災害"
        REAL foreign_hosp_day_disease "外貨建て入院日額・疾病"
        REAL foreign_hosp_day_accident "外貨建て入院日額・災害"
        REAL foreign_diagnosis_benefit "外貨建て診断一時金"
        REAL foreign_maturity_benefit "外貨建て満期保険金"
        TEXT payment_frequency "払込頻度"
        INTEGER premium_amount "1回あたり保険料 (円)"
        TEXT payment_details "払込の通貨・日付・実払額・為替 (JSON)"
        TEXT payment_end_date "払込終了年月日 (未使用・常に NULL)"
        INTEGER payment_end_age "払込終了年齢"
        INTEGER premium_payment_completed "払込済フラグ"
        INTEGER annual_premium "年間保険料 (円)"
        INTEGER maturity_benefit "満期保険金 (円)"
        TEXT surrender_values "年齢別の解約返戻金 (JSON)"
        TEXT surrender_projection "最終入力年齢より先の描き方"
        TEXT evaluation_overrides "個別評価の手動上書き (JSON)"
        TEXT consultant_note "コンサルタントメモ"
        INTEGER sort_order "表示順"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    app_state_meta {
        TEXT case_id PK, FK "cases.id"
        INTEGER schema_version "スキーマバージョン"
        TEXT updated_at "更新日時"
        TEXT last_exported_at "最終エクスポート日時"
        TEXT valuation_settings "評価用の為替 (JSON: usdJpyRate / fxRateDate)"
    }

    agency_masters {
        TEXT id PK "UUID"
        TEXT name "代理店名"
        TEXT representative "取扱者名"
        TEXT phone "電話番号"
        TEXT logo_data_url "ロゴ画像 (data URL)"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    insurance_type_descriptions {
        TEXT policy_type PK "保険種類"
        TEXT long_description "詳細説明"
        TEXT purpose "目的"
        TEXT updated_at "更新日時"
    }

    portfolio_insights {
        TEXT id PK "UUID"
        TEXT case_id FK "cases.id"
        TEXT type "gap/redundancy/recommendation"
        TEXT text "分析コメント"
        INTEGER is_custom "手入力フラグ"
        INTEGER sort_order "表示順"
        TEXT created_at "作成日時"
        TEXT updated_at "更新日時"
    }

    app_settings {
        TEXT setting_key PK "設定キー"
        TEXT value "設定値"
        TEXT updated_at "更新日時"
    }

    cases ||--o| agencies : "1:1 代理店情報"
    cases ||--o{ family_members : "1:N 家族"
    cases ||--o{ policies : "1:N 証券"
    cases ||--o| app_state_meta : "1:1 メタ情報"
    cases ||--o{ portfolio_insights : "1:N 分析コメント"
    family_members ||--o{ policies : "被保険者 (RESTRICT)"
    family_members |o--o{ policies : "受取人 (SET NULL)"
```

## リレーション一覧

| 親テーブル | 子テーブル | 関係 | FKカラム | 削除時 |
|---|---|---|---|---|
| cases | agencies | 1:1 | case_id (UNIQUE) | CASCADE |
| cases | family_members | 1:N | case_id | CASCADE |
| cases | policies | 1:N | case_id | CASCADE |
| cases | app_state_meta | 1:1 | case_id | CASCADE |
| cases | portfolio_insights | 1:N | case_id | CASCADE |
| family_members | policies | 1:N | insured_member_id | RESTRICT |
| family_members | policies | 0:N | beneficiary_member_id | SET NULL |
| 独立 | agency_masters | - | - | - |
| 独立 | insurance_type_descriptions | - | - | - |
| 独立 | app_settings | - | - | - |

## インデックス

| インデックス名 | テーブル | カラム |
|---|---|---|
| idx_family_members_case_id_sort_order | family_members | `(case_id, sort_order)` |
| idx_policies_case_id_sort_order | policies | `(case_id, sort_order)` |
| idx_policies_case_id_policy_number | policies | `(case_id, policy_number)` |
| idx_policies_insured_member_id | policies | `(insured_member_id)` |
| idx_policies_beneficiary_member_id | policies | `(beneficiary_member_id)` |
| idx_portfolio_insights_case_id | portfolio_insights | `(case_id, sort_order)` |

## 制約

- `family_members.gender`: `male` または `female`
- `policies.payment_frequency`: `monthly`、`annual`、`single`
- `policies.currency`: `JPY` または `USD`（既定 `JPY`）
- `portfolio_insights.type`: `gap`、`redundancy`、`recommendation`
- `agencies.case_id`: `UNIQUE`
- 被保険者 `insured_member_id` は削除時 `RESTRICT`
- 受取人 `beneficiary_member_id` は削除時 `SET NULL`
- `app_settings.setting_key`: 主キー。証券取込プロンプトは `policy_import_prompt`

## スキーマの変え方

マイグレーションの仕組みは無く、`lib/db.ts` が起動のたびに `CREATE TABLE IF NOT EXISTS` と、
列が無ければ `ALTER TABLE … ADD COLUMN` を流す。列を足すときは**両方に書く**
（新しい DB は `CREATE TABLE` から、既存の DB は `ALTER TABLE` から列を得る）。
SQLite の `ADD COLUMN` は列を末尾に足すので、既存の DB では列の並びがこの図と違う。

`*_settings` / `*_details` / `*_values` などの TEXT 列は JSON を入れている。中身の形は `types.ts` が決める。
