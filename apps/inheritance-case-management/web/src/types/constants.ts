import type { CaseStatus, AcceptanceStatus } from "./shared"

// Status options for filters and selects
export const CASE_STATUS_OPTIONS: readonly CaseStatus[] = ["未着手", "進行中", "完了", "請求済"] as const
export const ACCEPTANCE_STATUS_OPTIONS: readonly AcceptanceStatus[] = ["受託可", "受託不可", "未判定", "保留"] as const

// Filter-specific labels
export const CASE_STATUS_FILTER_OPTIONS = CASE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const ACCEPTANCE_STATUS_FILTER_OPTIONS = ACCEPTANCE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))

// Sort options for case list
export const SORT_OPTIONS = [
    { value: "createdAt_desc", label: "登録日 (新しい順)" },
    { value: "createdAt_asc", label: "登録日 (古い順)" },
    { value: "dateOfDeath_desc", label: "死亡日 (新しい順)" },
    { value: "dateOfDeath_asc", label: "死亡日 (古い順)" },
    { value: "deceasedName_asc", label: "氏名 (昇順)" },
    { value: "deceasedName_desc", label: "氏名 (降順)" },
    { value: "fiscalYear_desc", label: "年度 (新しい順)" },
    { value: "fiscalYear_asc", label: "年度 (古い順)" },
    { value: "taxAmount_desc", label: "税額 (高い順)" },
    { value: "taxAmount_asc", label: "税額 (低い順)" },
    { value: "feeAmount_desc", label: "報酬 (高い順)" },
    { value: "feeAmount_asc", label: "報酬 (低い順)" },
] as const

// Fiscal year range
export const FISCAL_YEAR_START = 2015
export const FISCAL_YEAR_COUNT = 21
export const FISCAL_YEARS = Array.from({ length: FISCAL_YEAR_COUNT }, (_, i) => FISCAL_YEAR_START + i)

// Filter year options (recent years for filter dropdown)
export const FILTER_YEAR_OPTIONS = [2025, 2024, 2023, 2022] as const
