import type { CaseStatus, AcceptanceStatus } from "./shared"

// Badge styles for status display
export const STATUS_STYLES: Record<CaseStatus, { dot: string; bg: string; text: string }> = {
    '未着手': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '進行中': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    '完了': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '請求済': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
}

export const ACCEPTANCE_STYLES: Record<AcceptanceStatus, { dot: string; bg: string; text: string }> = {
    '受託可': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '受託不可': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    '未判定': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '保留': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

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

// Filter year options (recent years for filter dropdown, current year + 3 years back)
const currentYear = new Date().getFullYear()
export const FILTER_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i)
