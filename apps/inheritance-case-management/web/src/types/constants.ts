import type { CaseStatus, AcceptanceStatus, HandlingStatus } from "./shared"

// Field length limits
export const MAX_SUMMARY_LENGTH = 10

// Badge styles for status display
export const STATUS_STYLES: Record<CaseStatus, { dot: string; bg: string; text: string }> = {
    '未着手': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '手続中': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    '申告済': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '請求済': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
    '入金済': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
}

export const HANDLING_STATUS_STYLES: Record<HandlingStatus, { dot: string; bg: string; text: string }> = {
    '対応中': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    '対応終了': { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-600' },
    '未分割': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

export const ACCEPTANCE_STYLES: Record<AcceptanceStatus, { dot: string; bg: string; text: string }> = {
    '受託可': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    '受託不可': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    '未判定': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
    '保留': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

// Status options for filters and selects
export const CASE_STATUS_OPTIONS: readonly CaseStatus[] = ["未着手", "手続中", "申告済", "請求済", "入金済"] as const
export const HANDLING_STATUS_OPTIONS: readonly HandlingStatus[] = ["対応中", "対応終了", "未分割"] as const
export const ACCEPTANCE_STATUS_OPTIONS: readonly AcceptanceStatus[] = ["受託可", "受託不可", "未判定", "保留"] as const

// Form-specific ordering (default value first)
export const ACCEPTANCE_FORM_OPTIONS: readonly AcceptanceStatus[] = ["未判定", "受託可", "受託不可", "保留"] as const

// Which acceptance statuses enable each case status in the form
export const STATUS_ENABLED_WHEN: Record<CaseStatus, readonly AcceptanceStatus[]> = {
    '未着手': ['未判定', '受託可', '保留', '受託不可'],
    '手続中': ['受託可'],
    '申告済': ['受託可'],
    '請求済': ['受託可'],
    '入金済': ['受託可'],
}

// Auto-set handlingStatus when acceptance status changes
export const ACCEPTANCE_AUTO_HANDLING: Partial<Record<AcceptanceStatus, HandlingStatus>> = {
    '受託不可': '対応終了',
}

// Hint messages for restricted status options
export const ACCEPTANCE_HINTS: Partial<Record<AcceptanceStatus, string>> = {
    '未判定': '「手続中」「申告済」を選択するには、受託を「受託可」に変更してください',
    '受託不可': '受託不可のため対応状況が自動的に「対応終了」に設定されます',
    '保留': '保留中のため「手続中」「申告済」「入金済」を選択するには、受託を変更してください',
}

// Status category helpers — used by KPI, analytics, deadline, columns
/** 申告完了済みステータス（期限チェック不要・売上確定） */
export const COMPLETED_STATUSES: readonly CaseStatus[] = ['申告済', '請求済', '入金済'] as const
/** ステータス判定ヘルパー */
export const isCompleted = (status: string): boolean => (COMPLETED_STATUSES as readonly string[]).includes(status)
/** 期限チェック対象外（完了系 or 対応終了） */
export const isDeadlineSkip = (status: string, handlingStatus?: string): boolean =>
    isCompleted(status) || handlingStatus === '対応終了'

// Filter-specific labels
export const CASE_STATUS_FILTER_OPTIONS = CASE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const HANDLING_STATUS_FILTER_OPTIONS = HANDLING_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const ACCEPTANCE_STATUS_FILTER_OPTIONS = ACCEPTANCE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))

// Filter keys used for hasFilters check and KPI dependency
export const FILTER_KEYS = ['search', 'status', 'handlingStatus', 'acceptanceStatus', 'fiscalYear', 'department', 'assigneeId', 'internalReferrerId', 'staffId', 'referrerCompany'] as const

// Fiscal year range
export const FISCAL_YEAR_START = 2015
export const FISCAL_YEAR_COUNT = 21
export const FISCAL_YEARS = Array.from({ length: FISCAL_YEAR_COUNT }, (_, i) => FISCAL_YEAR_START + FISCAL_YEAR_COUNT - 1 - i)

// Filter year options (FISCAL_YEARSと同じ範囲)
export const FILTER_YEAR_OPTIONS = FISCAL_YEARS
