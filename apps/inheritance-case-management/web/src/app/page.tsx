"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createColumns } from "@/components/cases/columns"
import { DataTable } from "@/components/cases/data-table"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import type { CasesQueryParams } from "@/lib/api/cases"
import { getAllCases, bulkDeleteCases } from "@/lib/api/cases"
import type { InheritanceCase } from "@/types/shared"
import { useAsyncMasters } from "@/hooks/use-async-masters"
import { computeKPI } from "@/lib/kpi-utils"
import { FILTER_KEYS } from "@/types/constants"
import { formatCurrency } from "@/lib/analytics-utils"
import { calcBestGrossAmount, calcGrossAmount } from "@/lib/case-amount-utils"
import { Button } from "@/components/ui/Button"
import { RefreshCw, Download, Upload, Trash2 } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { parseError } from "@/hooks/use-error-handler"
import { useToast } from "@/components/ui/Toast"
import { KPICards, type KPICardFilterKey } from "@/components/cases/KPICards"
import { FilterBar } from "@/components/cases/FilterBar"
import { Pagination } from "@/components/cases/Pagination"
import { ImportCSVModal } from "@/components/ImportCSVModal"
import { BulkDeleteModal } from "@/components/BulkDeleteModal"

const DATE_FILTER_KEYS = ["caseAddedFrom", "caseAddedTo", "caseCompletedFrom", "caseCompletedTo"] as const
const KPI_QUICK_FILTER_KEYS = ["deadlineSoon", ...DATE_FILTER_KEYS] as const

function formatDateOnly(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function getThisMonthRange(): { from: string; to: string } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { from: formatDateOnly(start), to: formatDateOnly(end) }
}

function getActiveKpiFilter(params: CasesQueryParams): KPICardFilterKey | null {
    if (params.deadlineSoon) return "deadlineSoon"
    const { from, to } = getThisMonthRange()
    if (params.caseAddedFrom === from && params.caseAddedTo === to) return "addedThisMonth"
    if (params.caseCompletedFrom === from && params.caseCompletedTo === to) return "completedThisMonth"
    return null
}

function isKpiQuickFilterKey(key: keyof CasesQueryParams): key is (typeof KPI_QUICK_FILTER_KEYS)[number] {
    return (KPI_QUICK_FILTER_KEYS as readonly string[]).includes(key as string)
}

/** URLクエリパラメータからCasesQueryParamsを復元 */
function parseUrlParams(searchParams: URLSearchParams): CasesQueryParams {
    const params: CasesQueryParams = {
        page: 1,
        pageSize: 100,
    }
    const page = searchParams.get("page")
    if (page) params.page = Number(page)
    const pageSize = searchParams.get("pageSize")
    if (pageSize) params.pageSize = Number(pageSize)
    const fiscalYear = searchParams.get("fiscalYear")
    for (const key of ["search", "status", "handlingStatus", "acceptanceStatus", "department"] as const) {
        const val = searchParams.get(key)
        if (val) (params as Record<string, unknown>)[key] = val
    }
    const assigneeId = searchParams.get("assigneeId")
    if (assigneeId) params.assigneeId = Number(assigneeId)
    const internalReferrerId = searchParams.get("internalReferrerId")
    if (internalReferrerId) params.internalReferrerId = Number(internalReferrerId)
    const staffId = searchParams.get("staffId")
    if (staffId) params.staffId = Number(staffId)
    const referrerCompany = searchParams.get("referrerCompany")
    if (referrerCompany) params.referrerCompany = referrerCompany
    if (searchParams.get("unassigned") === "true") params.unassigned = true
    if (searchParams.get("noReferrer") === "true") params.noReferrer = true
    if (searchParams.get("deadlineSoon") === "true") params.deadlineSoon = true
    for (const key of DATE_FILTER_KEYS) {
        const val = searchParams.get(key)
        if (val) params[key] = val
    }

    // fiscalYearがURLに明示されている場合はその値を使用
    // 他のフィルタ経由の遷移（staffId, referrerCompany等）でfiscalYear未指定なら全期間
    // フィルタが何もない初回アクセス時のみ今年度をデフォルトに
    if (fiscalYear) {
        params.fiscalYear = Number(fiscalYear)
    } else {
        const hasAnyFilter = FILTER_KEYS.some((key) => params[key])
        if (!hasAnyFilter) {
            params.fiscalYear = new Date().getFullYear()
        }
    }
    return params
}

/** CasesQueryParamsをURLクエリ文字列に変換（デフォルト値は省略） */
function toUrlSearch(params: CasesQueryParams): string {
    const sp = new URLSearchParams()
    if (params.fiscalYear) sp.set("fiscalYear", String(params.fiscalYear))
    if (params.search) sp.set("search", params.search)
    if (params.status) sp.set("status", params.status)
    if (params.handlingStatus) sp.set("handlingStatus", params.handlingStatus)
    if (params.acceptanceStatus) sp.set("acceptanceStatus", params.acceptanceStatus)
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

export default function InheritanceMockupPage() {
    return (
        <Suspense fallback={<TableSkeleton />}>
            <InheritanceMockupPageContent />
        </Suspense>
    )
}

function InheritanceMockupPageContent() {
    const toast = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [queryParams, setQueryParams] = useState<CasesQueryParams>(() => parseUrlParams(searchParams))
    const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "")

    // フィルタ状態をURLに同期（ブラウザバックで復元可能にする）
    useEffect(() => {
        const qs = toUrlSearch(queryParams)
        const current = searchParams.toString()
        if (qs !== current) {
            router.replace(qs ? `?${qs}` : "/", { scroll: false })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryParams])

    // ブラウザバック/フォワード時にURLからフィルタ状態を復元
    useEffect(() => {
        const onPopState = () => {
            const sp = new URLSearchParams(window.location.search)
            setQueryParams(parseUrlParams(sp))
            setSearchInput(sp.get("search") || "")
        }
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])

    const { data, isLoading, isError, error, refetch, isFetching } = useCases(queryParams)
    const { exportCSV, isExporting } = useExportCSV()
    const [showImportModal, setShowImportModal] = useState(false)
    const [showBulkDelete, setShowBulkDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const cases = data?.data ?? []
    const pagination = data?.pagination
    const [amountSort, setAmountSort] = useState<"asc" | "desc" | null>(null)

    const toggleAmountSort = useCallback(() => {
        setAmountSort(prev => prev === null ? "desc" : prev === "desc" ? "asc" : null)
    }, [])

    const sortedCases = useMemo(() => {
        if (!amountSort) return cases
        return [...cases].sort((a, b) => {
            const aAmount = calcBestGrossAmount(a)
            const bAmount = calcBestGrossAmount(b)
            return amountSort === "asc" ? aAmount - bAmount : bAmount - aAmount
        })
    }, [cases, amountSort])

    const amountTotals = useMemo(() => {
        let confirmed = 0, estimate = 0
        cases.forEach(c => {
            if ((c.feeAmount || 0) > 0) confirmed += calcGrossAmount(c, "fee")
            else estimate += calcGrossAmount(c, "estimate")
        })
        return { confirmed, estimate, total: confirmed + estimate }
    }, [cases])

    const rowNumberOffset = ((queryParams.page || 1) - 1) * (queryParams.pageSize || 100)
    const tableColumns = useMemo(() => createColumns({ amountSort, toggleAmountSort, rowNumberOffset }), [amountSort, toggleAmountSort, rowNumberOffset])

    // KPI data & assignees
    const [allCases, setAllCases] = useState<InheritanceCase[]>([])
    const dataVersion = data?.pagination?.total
    const kpiFilters = Object.fromEntries(FILTER_KEYS.filter(k => !isKpiQuickFilterKey(k) && queryParams[k]).map(k => [k, queryParams[k]]))
    const kpiDepsKey = JSON.stringify(kpiFilters)
    const refreshKPI = () => getAllCases(Object.keys(kpiFilters).length > 0 ? kpiFilters : undefined).then(setAllCases).catch(() => {})
    useEffect(() => {
        refreshKPI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataVersion, kpiDepsKey])

    const { assignees, departments } = useAsyncMasters([dataVersion, kpiDepsKey])

    const kpiData = useMemo(() => computeKPI(allCases), [allCases])
    const activeKpiFilter = useMemo(() => getActiveKpiFilter(queryParams), [queryParams])

    const handleSearch = () => {
        setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }))
    }

    const handleFilterChange = (key: keyof CasesQueryParams, value: string | undefined) => {
        const parsed = (key === 'unassigned' || key === 'noReferrer')
            ? (value === 'true' ? true : undefined)
            : (key === 'assigneeId' || key === 'internalReferrerId' || key === 'staffId' || key === 'fiscalYear') && value
                ? Number(value)
                : (value || undefined)
        setQueryParams(prev => ({ ...prev, [key]: parsed, page: 1 }))
    }

    const handleKpiFilterClick = useCallback((filter: KPICardFilterKey) => {
        const { from, to } = getThisMonthRange()
        setQueryParams(prev => {
            const isActive = getActiveKpiFilter(prev) === filter
            const next: CasesQueryParams = {
                ...prev,
                caseAddedFrom: undefined,
                caseAddedTo: undefined,
                caseCompletedFrom: undefined,
                caseCompletedTo: undefined,
                deadlineSoon: undefined,
                page: 1,
            }

            if (isActive) return next
            if (filter === "deadlineSoon") {
                return { ...next, deadlineSoon: true }
            }
            if (filter === "addedThisMonth") {
                return { ...next, caseAddedFrom: from, caseAddedTo: to }
            }
            return { ...next, caseCompletedFrom: from, caseCompletedTo: to }
        })
    }, [])

    const handleClearAll = () => {
        setQueryParams({ page: 1, pageSize: 100 })
        setSearchInput("")
    }

    const handleBulkDelete = async () => {
        setIsDeleting(true)
        try {
            const { page, pageSize, sortBy, sortOrder, ...filters } = queryParams
            await bulkDeleteCases(filters)
            setShowBulkDelete(false)
            refetch()
            refreshKPI()
        } catch {
            toast.error("一括削除に失敗しました")
        } finally {
            setIsDeleting(false)
        }
    }

    const filterDescription = useMemo(() => {
        const parts: string[] = []
        if (queryParams.fiscalYear) parts.push(`${queryParams.fiscalYear}年度`)
        if (queryParams.status) parts.push(`進み具合: ${queryParams.status}`)
        if (queryParams.handlingStatus) parts.push(`対応状況: ${queryParams.handlingStatus}`)
        if (queryParams.acceptanceStatus) parts.push(`受託: ${queryParams.acceptanceStatus}`)
        if (queryParams.department) parts.push(`部門: ${queryParams.department}`)
        if (queryParams.assigneeId) {
            const matched = assignees.find(item => item.id === queryParams.assigneeId)
            if (matched) parts.push(`担当: ${matched.name}`)
        }
        if (queryParams.internalReferrerId) {
            const matched = assignees.find(item => item.id === queryParams.internalReferrerId)
            if (matched) parts.push(`紹介者: ${matched.name}`)
        }
        if (queryParams.staffId) {
            const matched = assignees.find(item => item.id === queryParams.staffId)
            if (matched) parts.push(`${matched.name}の担当・紹介案件`)
        }
        if (queryParams.referrerCompany) parts.push(`紹介会社: ${queryParams.referrerCompany}`)
        if (queryParams.unassigned) parts.push(`担当者: 未設定`)
        if (queryParams.noReferrer) parts.push(`紹介者: なし`)
        if (queryParams.search) parts.push(`検索: ${queryParams.search}`)
        return parts.length > 0 ? parts.join(' / ') : '全案件'
    }, [queryParams, assignees])

    const hasFilters = FILTER_KEYS.some(k => queryParams[k])

    return (
        <div className="container mx-auto max-w-[1600px] px-3 py-6 lg:px-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h1 className="text-xl font-bold">相続税申告案件一覧</h1>
                <div className="flex gap-1.5 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImportModal(true)}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        CSV取込
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportCSV(hasFilters ? queryParams : undefined)}
                        disabled={isExporting}
                    >
                        <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                        {isExporting ? 'エクスポート中...' : hasFilters ? 'CSV出力(絞り込み)' : 'CSV出力'}
                    </Button>
                    {hasFilters && pagination?.total != null && pagination.total > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBulkDelete(true)}
                            className="text-black border-gray-300 hover:bg-gray-100"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            一括削除 ({pagination.total}件)
                        </Button>
                    )}
                </div>
            </div>

            {allCases.length > 0 && (
                <KPICards
                    data={kpiData}
                    activeFilter={activeKpiFilter}
                    onFilterClick={handleKpiFilterClick}
                />
            )}

            <FilterBar
                queryParams={queryParams}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                assignees={assignees}
                departments={departments}
                totalCount={pagination?.total}
                hasFilters={hasFilters}
            />

            {isLoading ? (
                <TableSkeleton rows={10} />
            ) : isError ? (
                <ErrorDisplay error={parseError(error)} onRetry={() => refetch()} />
            ) : (
                <div className="relative">
                    {isFetching && (
                        <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                更新中...
                            </div>
                        </div>
                    )}
                    {sortedCases.length > 0 && (
                        <div className="flex items-center justify-end gap-2 px-2 py-1 text-xs border rounded-t-md bg-muted/50">
                            <span className="text-muted-foreground">売上合計:</span>
                            <span className="font-bold">{formatCurrency(amountTotals.total)}</span>
                            <span className="text-xs text-black">確定 {formatCurrency(amountTotals.confirmed)}</span>
                            <span className="text-xs text-black/70">見込 {formatCurrency(amountTotals.estimate)}</span>
                            <span className="text-muted-foreground">/ {sortedCases.length}件</span>
                        </div>
                    )}
                    <DataTable
                        columns={tableColumns}
                        data={sortedCases}
                        hasFilters={hasFilters}
                        onClearFilters={handleClearAll}
                    />

                    {pagination && (
                        <Pagination
                            page={pagination.page}
                            pageSize={pagination.pageSize}
                            total={pagination.total}
                            totalPages={pagination.totalPages}
                            onPageChange={(newPage) => setQueryParams(prev => ({ ...prev, page: newPage }))}
                        />
                    )}
                </div>
            )}

            <ImportCSVModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={() => {
                    refetch()
                    refreshKPI()
                }}
            />

            <BulkDeleteModal
                isOpen={showBulkDelete}
                onClose={() => setShowBulkDelete(false)}
                onConfirm={handleBulkDelete}
                totalCount={pagination?.total ?? 0}
                filterDescription={filterDescription}
                isDeleting={isDeleting}
            />
        </div>
    )
}
