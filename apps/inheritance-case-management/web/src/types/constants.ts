import type { CaseStatus, AcceptanceStatus, HandlingStatus } from "./shared"

// Field length limits
export const MAX_SUMMARY_LENGTH = 10

// Badge styles for status display
export const STATUS_STYLES: Record<CaseStatus, { dot: string; bg: string; text: string }> = {
    '未着手': { dot: 'bg-gray-400', bg: 'bg-white', text: 'text-black' },
    '手続中': { dot: 'bg-white0', bg: 'bg-white', text: 'text-black' },
    '申告済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '請求済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '入金済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
}

export const HANDLING_STATUS_STYLES: Record<HandlingStatus, { dot: string; bg: string; text: string }> = {
    '対応中': { dot: 'bg-white0', bg: 'bg-white', text: 'text-black' },
    '対応終了': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '対応終了（未分割）': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '対応外': { dot: 'bg-gray-400', bg: 'bg-white', text: 'text-black' },
}

export const ACCEPTANCE_STYLES: Record<AcceptanceStatus, { dot: string; bg: string; text: string }> = {
    '未判定': { dot: 'bg-gray-400', bg: 'bg-white', text: 'text-black' },
    '受託': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '見送り': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
}

// Status options for filters and selects
export const CASE_STATUS_OPTIONS: readonly CaseStatus[] = ["未着手", "手続中", "申告済", "請求済", "入金済"] as const
export const HANDLING_STATUS_OPTIONS: readonly HandlingStatus[] = ["対応中", "対応終了", "対応終了（未分割）", "対応外"] as const
export const ACCEPTANCE_STATUS_OPTIONS: readonly AcceptanceStatus[] = ["未判定", "受託", "見送り"] as const

// Form-specific ordering (default value first)
export const ACCEPTANCE_FORM_OPTIONS: readonly AcceptanceStatus[] = ["未判定", "受託", "見送り"] as const

// Which acceptance statuses enable each case status in the form
export const STATUS_ENABLED_WHEN: Record<CaseStatus, readonly AcceptanceStatus[]> = {
    '未着手': ['未判定', '受託'],
    '手続中': ['受託'],
    '申告済': ['受託'],
    '請求済': ['受託'],
    '入金済': ['受託'],
}

// Auto-set handlingStatus when acceptance status changes
export const ACCEPTANCE_AUTO_HANDLING: Partial<Record<AcceptanceStatus, HandlingStatus>> = {
    '見送り': '対応外',
}

// Hint messages for restricted status options
export const ACCEPTANCE_HINTS: Partial<Record<AcceptanceStatus, string>> = {
    '未判定': '「手続中」「申告済」を選択するには、受託を「受託」に変更してください',
    '見送り': '見送りのため対応状況が自動的に「対応外」に設定されます',
}

// Status category helpers — used by KPI, analytics, deadline, columns
/** 申告完了済みステータス（期限チェック不要・売上確定） */
export const COMPLETED_STATUSES: readonly CaseStatus[] = ['申告済', '請求済', '入金済'] as const
/** ステータス判定ヘルパー */
export const isCompleted = (status: string): boolean => (COMPLETED_STATUSES as readonly string[]).includes(status)
/** 対応中以外（対応終了・対応終了（未分割）・対応外）はすべて非アクティブ */
export const isHandlingEnded = (handlingStatus?: string): boolean =>
    !!handlingStatus && handlingStatus !== '対応中'
/** 期限チェック対象外（完了系 or 非アクティブ） */
export const isDeadlineSkip = (status: string, handlingStatus?: string): boolean =>
    isCompleted(status) || isHandlingEnded(handlingStatus)

// Filter-specific labels
export const CASE_STATUS_FILTER_OPTIONS = CASE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const HANDLING_STATUS_FILTER_OPTIONS = HANDLING_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
export const ACCEPTANCE_STATUS_FILTER_OPTIONS = ACCEPTANCE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))

// Filter keys used for hasFilters check and KPI dependency
export const FILTER_KEYS = ['search', 'status', 'handlingStatus', 'acceptanceStatus', 'fiscalYear', 'department', 'assigneeId', 'internalReferrerId', 'staffId', 'referrerCompany', 'unassigned', 'noReferrer', 'caseAddedFrom', 'caseAddedTo', 'caseCompletedFrom', 'caseCompletedTo'] as const

// Fiscal year range
export const FISCAL_YEAR_START = 2015
export const FISCAL_YEAR_COUNT = 21
export const FISCAL_YEARS = Array.from({ length: FISCAL_YEAR_COUNT }, (_, i) => FISCAL_YEAR_START + FISCAL_YEAR_COUNT - 1 - i)

// Filter year options (FISCAL_YEARSと同じ範囲)
export const FILTER_YEAR_OPTIONS = FISCAL_YEARS

// Referrer mode toggle options
export const REFERRER_MODE_OPTIONS = [
    { value: "none" as const, label: "なし" },
    { value: "internal" as const, label: "社内" },
    { value: "external" as const, label: "社外" },
] as const

// Expense description presets
export const EXPENSE_DESCRIPTION_PRESETS = [
    "戸籍謄本",
    "登記簿謄本",
    "固定資産評価証明書",
    "残高証明書",
    "交通費",
] as const
