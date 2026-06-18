import type { CasesQueryParams } from "@/lib/api/cases"
import { calcGrossAmount } from "@/lib/case-amount-utils"
import { FILTER_KEYS } from "@/types/constants"
import type { InheritanceCase } from "@/types/shared"
import type { KPICardFilterKey } from "@/components/cases/KPICards"

export const CASE_LIST_PAGE_SIZE = 100
export const DATE_FILTER_KEYS = ["caseAddedFrom", "caseAddedTo", "caseCompletedFrom", "caseCompletedTo"] as const

const KPI_QUICK_FILTER_KEYS = ["deadlineSoon", ...DATE_FILTER_KEYS] as const
const BOOLEAN_FILTER_KEYS = ["unassigned", "noReferrer", "deadlineSoon"] as const
const NUMBER_FILTER_KEYS = ["assigneeId", "internalReferrerId", "staffId", "fiscalYear"] as const

type FilterOnlyQueryParams = Omit<CasesQueryParams, "page" | "pageSize" | "sortBy" | "sortOrder">
type NamedMaster = { id: number; name: string }

export interface CaseListAmountTotals {
    confirmed: number
    estimate: number
    total: number
}

function formatDateOnly(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function hasFilterValue(value: unknown): boolean {
    return Boolean(value)
}

export function getThisMonthRange(): { from: string; to: string } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { from: formatDateOnly(start), to: formatDateOnly(end) }
}

export function getActiveKpiFilter(params: CasesQueryParams): KPICardFilterKey | null {
    if (params.deadlineSoon) return "deadlineSoon"
    const { from, to } = getThisMonthRange()
    if (params.caseAddedFrom === from && params.caseAddedTo === to) return "addedThisMonth"
    if (params.caseCompletedFrom === from && params.caseCompletedTo === to) return "completedThisMonth"
    return null
}

export function parseCaseListUrlParams(searchParams: URLSearchParams): CasesQueryParams {
    const params: CasesQueryParams = {
        page: 1,
        pageSize: CASE_LIST_PAGE_SIZE,
    }
    const page = searchParams.get("page")
    if (page) params.page = Number(page)
    const pageSize = searchParams.get("pageSize")
    if (pageSize) params.pageSize = Number(pageSize)
    const fiscalYear = searchParams.get("fiscalYear")

    for (const key of ["search", "status", "department"] as const) {
        const value = searchParams.get(key)
        if (value) (params as Record<string, unknown>)[key] = value
    }
    for (const key of ["assigneeId", "internalReferrerId", "staffId"] as const) {
        const value = searchParams.get(key)
        if (value) params[key] = Number(value)
    }

    const referrerCompany = searchParams.get("referrerCompany")
    if (referrerCompany) params.referrerCompany = referrerCompany
    for (const key of BOOLEAN_FILTER_KEYS) {
        if (searchParams.get(key) === "true") params[key] = true
    }
    for (const key of DATE_FILTER_KEYS) {
        const value = searchParams.get(key)
        if (value) params[key] = value
    }

    if (fiscalYear) {
        params.fiscalYear = Number(fiscalYear)
    } else if (!getHasCaseFilters(params)) {
        params.fiscalYear = new Date().getFullYear()
    }
    // ステータス未指定のときは終了案件（見送り・入金済）を既定で除外（旧「対応中」既定の踏襲）
    if (!params.status) {
        params.hideClosed = true
    }
    return params
}

export function toCaseListUrlSearch(params: CasesQueryParams): string {
    const sp = new URLSearchParams()
    if (params.fiscalYear) sp.set("fiscalYear", String(params.fiscalYear))
    if (params.search) sp.set("search", params.search)
    if (params.status) sp.set("status", params.status)
    if (params.department) sp.set("department", params.department)
    if (params.assigneeId) sp.set("assigneeId", String(params.assigneeId))
    if (params.internalReferrerId) sp.set("internalReferrerId", String(params.internalReferrerId))
    if (params.staffId) sp.set("staffId", String(params.staffId))
    if (params.referrerCompany) sp.set("referrerCompany", params.referrerCompany)
    if (params.unassigned) sp.set("unassigned", "true")
    if (params.noReferrer) sp.set("noReferrer", "true")
    if (params.deadlineSoon) sp.set("deadlineSoon", "true")
    for (const key of DATE_FILTER_KEYS) {
        if (params[key]) sp.set(key, params[key])
    }
    if (params.page && params.page > 1) sp.set("page", String(params.page))
    return sp.toString()
}

export function parseCaseListFilterValue(key: keyof CasesQueryParams, value: string | undefined) {
    if ((BOOLEAN_FILTER_KEYS as readonly string[]).includes(key)) {
        return value === "true" ? true : undefined
    }
    if ((NUMBER_FILTER_KEYS as readonly string[]).includes(key)) {
        return value ? Number(value) : undefined
    }
    return value || undefined
}

export function getHasCaseFilters(params: CasesQueryParams): boolean {
    return FILTER_KEYS.some((key) => hasFilterValue(params[key]))
}

export function getCaseListFilters(params: CasesQueryParams): FilterOnlyQueryParams {
    return Object.fromEntries(
        FILTER_KEYS
            .filter((key) => hasFilterValue(params[key]))
            .map((key) => [key, params[key]])
    ) as FilterOnlyQueryParams
}

export function getCaseListKpiFilters(params: CasesQueryParams): FilterOnlyQueryParams {
    return Object.fromEntries(
        FILTER_KEYS
            .filter((key) => !(KPI_QUICK_FILTER_KEYS as readonly string[]).includes(key))
            .filter((key) => hasFilterValue(params[key]))
            .map((key) => [key, params[key]])
    ) as FilterOnlyQueryParams
}

export function calculateCaseListAmountTotals(cases: InheritanceCase[]): CaseListAmountTotals {
    return cases.reduce(
        (totals, caseItem) => {
            if ((caseItem.feeAmount || 0) > 0) {
                totals.confirmed += calcGrossAmount(caseItem, "fee")
            } else {
                totals.estimate += calcGrossAmount(caseItem, "estimate")
            }
            totals.total = totals.confirmed + totals.estimate
            return totals
        },
        { confirmed: 0, estimate: 0, total: 0 }
    )
}

export function getCaseListFilterDescription(params: CasesQueryParams, assignees: NamedMaster[]): string {
    const parts: string[] = []
    if (params.fiscalYear) parts.push(`${params.fiscalYear}年度`)
    if (params.status) parts.push(`ステータス: ${params.status}`)
    if (params.department) parts.push(`部門: ${params.department}`)
    if (params.assigneeId) {
        const matched = assignees.find((item) => item.id === params.assigneeId)
        if (matched) parts.push(`担当者: ${matched.name}`)
    }
    if (params.internalReferrerId) {
        const matched = assignees.find((item) => item.id === params.internalReferrerId)
        if (matched) parts.push(`紹介者: ${matched.name}`)
    }
    if (params.staffId) {
        const matched = assignees.find((item) => item.id === params.staffId)
        if (matched) parts.push(`${matched.name}の担当・紹介案件`)
    }
    if (params.referrerCompany) parts.push(`紹介会社: ${params.referrerCompany}`)
    if (params.unassigned) parts.push("担当者: 未設定")
    if (params.noReferrer) parts.push("紹介者: なし")
    if (params.search) parts.push(`検索: ${params.search}`)
    return parts.length > 0 ? parts.join(" / ") : "全案件"
}
