import type { CaseStatus } from "./shared"

// Field length limits
export const MAX_SUMMARY_LENGTH = 10

// Badge styles for status display（色は控えめにグレースケール中心）
export const STATUS_STYLES: Record<CaseStatus, { dot: string; bg: string; text: string }> = {
    '見積前': { dot: 'bg-gray-300', bg: 'bg-white', text: 'text-black' },
    '見積中': { dot: 'bg-gray-400', bg: 'bg-white', text: 'text-black' },
    '見送り': { dot: 'bg-gray-400', bg: 'bg-white', text: 'text-muted-foreground' },
    '受託': { dot: 'bg-gray-600', bg: 'bg-white', text: 'text-black' },
    '手続中': { dot: 'bg-gray-800', bg: 'bg-white', text: 'text-black' },
    '最終確認': { dot: 'bg-gray-900', bg: 'bg-white', text: 'text-black' },
    '申告済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '請求済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
    '入金済': { dot: 'bg-black', bg: 'bg-white', text: 'text-black' },
}

// Status options for filters and selects（統合ステータスの全選択肢・フロー順）
export const CASE_STATUS_OPTIONS: readonly CaseStatus[] = ["見積前", "見積中", "見送り", "受託", "手続中", "最終確認", "申告済", "請求済", "入金済"] as const

// Status category helpers — used by KPI, analytics, deadline, columns
/** 受託済みステータス（受託〜入金済） */
export const ACCEPTED_STATUSES: readonly CaseStatus[] = ['受託', '手続中', '最終確認', '申告済', '請求済', '入金済'] as const
/** 受託判定（売上・件数の集計対象） */
export const isAccepted = (status: string): boolean => (ACCEPTED_STATUSES as readonly string[]).includes(status)
/** 申告完了済みステータス（期限チェック不要・売上確定） */
export const COMPLETED_STATUSES: readonly CaseStatus[] = ['申告済', '請求済', '入金済'] as const
/** ステータス判定ヘルパー */
export const isCompleted = (status: string): boolean => (COMPLETED_STATUSES as readonly string[]).includes(status)
/** 対応終了（一覧の非アクティブ表示用）: 見送り・入金済・未分割 */
export const isHandlingEnded = (status: string, isUndivided?: boolean): boolean =>
    status === '見送り' || status === '入金済' || !!isUndivided
/** 期限チェック対象外（完了系・見送り・未分割） */
export const isDeadlineSkip = (status: string, isUndivided?: boolean): boolean =>
    isCompleted(status) || status === '見送り' || !!isUndivided

/** マイルストン日付フィールドと、それを自動セットするステータス（ステータス連動の単一入力） */
export type MilestoneDateField = 'caseAddedDate' | 'caseCompletedDate' | 'billedDate' | 'paidDate'
export const MILESTONE_DATES: { field: MilestoneDateField; label: string; statuses: readonly string[] }[] = [
    { field: 'caseAddedDate', label: '受託', statuses: ACCEPTED_STATUSES },
    { field: 'caseCompletedDate', label: '申告', statuses: COMPLETED_STATUSES },
    { field: 'billedDate', label: '請求', statuses: ['請求済', '入金済'] },
    { field: 'paidDate', label: '入金', statuses: ['入金済'] },
]
/** 指定マイルストン日付が、そのステータスで自動セット対象か */
export const isMilestoneTriggered = (field: MilestoneDateField, status?: string | null): boolean => {
    const m = MILESTONE_DATES.find(x => x.field === field)
    return !!m && !!status && m.statuses.includes(status)
}

// Filter-specific labels
export const CASE_STATUS_FILTER_OPTIONS = CASE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))

// Filter keys used for hasFilters check and KPI dependency
export const FILTER_KEYS = ['search', 'status', 'fiscalYear', 'department', 'assigneeId', 'internalReferrerId', 'staffId', 'referrerCompany', 'unassigned', 'noReferrer', 'deadlineSoon', 'caseAddedFrom', 'caseAddedTo', 'caseCompletedFrom', 'caseCompletedTo'] as const

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
