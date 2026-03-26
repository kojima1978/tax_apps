import type { CaseStatus, AcceptanceStatus } from "./shared"

// Field length limits
export const MAX_SUMMARY_LENGTH = 10

// Badge styles for status display
export const STATUS_STYLES: Record<CaseStatus, { dot: string; bg: string; text: string }> = {
    '未着手': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '手続中': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    '申告済': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '請求済': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
    '入金済': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
    '対応終了': { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-600' },
}

export const ACCEPTANCE_STYLES: Record<AcceptanceStatus, { dot: string; bg: string; text: string }> = {
    '受託可': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '受託不可': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    '未判定': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '保留': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

// Status options for filters and selects
export const CASE_STATUS_OPTIONS: readonly CaseStatus[] = ["未着手", "手続中", "申告済", "請求済", "入金済", "対応終了"] as const
export const ACCEPTANCE_STATUS_OPTIONS: readonly AcceptanceStatus[] = ["受託可", "受託不可", "未判定", "保留"] as const

// Form-specific ordering (default value first)
export const ACCEPTANCE_FORM_OPTIONS: readonly AcceptanceStatus[] = ["未判定", "受託可", "受託不可", "保留"] as const

// Which acceptance statuses enable each case status in the form
export const STATUS_ENABLED_WHEN: Record<CaseStatus, readonly AcceptanceStatus[]> = {
    '未着手': ['未判定', '受託可', '保留'],
    '手続中': ['受託可'],
    '申告済': ['受託可'],
    '請求済': ['受託可'],
    '入金済': ['受託可'],
    '対応終了': ['受託不可'],
}

// Auto-set status when acceptance status changes
export const ACCEPTANCE_AUTO_STATUS: Partial<Record<AcceptanceStatus, CaseStatus>> = {
    '未判定': '未着手',
    '保留': '未着手',
    '受託不可': '対応終了',
}

// Hint messages for restricted status options
export const ACCEPTANCE_HINTS: Partial<Record<AcceptanceStatus, string>> = {
    '未判定': '「手続中」「申告済」を選択するには、受託を「受託可」または「受託不可」に変更してください',
    '受託不可': '受託不可のため自動的に「対応終了」に設定されます',
    '保留': '保留中のため「手続中」「申告済」「入金済」を選択するには、受託を変更してください',
}

// Status category helpers — used by KPI, analytics, deadline, columns
/** 申告完了済みステータス（期限チェック不要・売上確定） */
export const COMPLETED_STATUSES: readonly CaseStatus[] = ['申告済', '請求済', '入金済'] as const
/** 期限チェック対象外ステータス（完了系 + 対応終了） */
export const DEADLINE_SKIP_STATUSES: readonly CaseStatus[] = [...COMPLETED_STATUSES, '対応終了'] as const
/** ステータス判定ヘルパー */
export const isCompleted = (status: string): boolean => (COMPLETED_STATUSES as readonly string[]).includes(status)
export const isDeadlineSkip = (status: string): boolean => (DEADLINE_SKIP_STATUSES as readonly string[]).includes(status)

// Filter-specific labels
export const CASE_STATUS_FILTER_OPTIONS = CASE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const ACCEPTANCE_STATUS_FILTER_OPTIONS = ACCEPTANCE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))

// Filter keys used for hasFilters check and KPI dependency
export const FILTER_KEYS = ['search', 'status', 'acceptanceStatus', 'fiscalYear', 'department', 'assigneeId'] as const

// Sort options for case list
export const SORT_OPTIONS = [
    { value: "dateOfDeath_asc", label: "死亡日 (古い順)" },
    { value: "dateOfDeath_desc", label: "死亡日 (新しい順)" },
    { value: "createdAt_desc", label: "登録日 (新しい順)" },
    { value: "createdAt_asc", label: "登録日 (古い順)" },
    { value: "deceasedName_asc", label: "氏名 (昇順)" },
    { value: "deceasedName_desc", label: "氏名 (降順)" },
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
