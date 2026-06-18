"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createColumns } from "@/components/cases/columns"
import { FilterBar } from "@/components/cases/FilterBar"
import { KPICards, type KPICardFilterKey } from "@/components/cases/KPICards"
import { BulkDeleteModal } from "@/components/BulkDeleteModal"
import { ImportCSVModal } from "@/components/ImportCSVModal"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/Toast"
import { useAsyncMasters } from "@/hooks/use-async-masters"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import { bulkDeleteCases, getAllCases } from "@/lib/api/cases"
import type { CasesQueryParams } from "@/lib/api/cases"
import { calcBestGrossAmount } from "@/lib/case-amount-utils"
import { computeKPI } from "@/lib/kpi-utils"
import type { InheritanceCase } from "@/types/shared"
import { CaseListTableSection } from "./CaseListTableSection"
import { CaseListToolbar } from "./CaseListToolbar"
import {
    calculateCaseListAmountTotals,
    CASE_LIST_PAGE_SIZE,
    COMPLETED_STATUS_CSV,
    getActiveKpiFilter,
    getCaseListFilterDescription,
    getCaseListFilters,
    getCaseListKpiFilters,
    getHasCaseFilters,
    getThisMonthRange,
    ONGOING_STATUS,
    parseCaseListFilterValue,
    parseCaseListUrlParams,
    toCaseListUrlSearch,
} from "./case-list-utils"

const EMPTY_CASES: InheritanceCase[] = []

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

    const [queryParams, setQueryParams] = useState<CasesQueryParams>(() => parseCaseListUrlParams(searchParams))
    const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "")

    useEffect(() => {
        const qs = toCaseListUrlSearch(queryParams)
        const current = searchParams.toString()
        if (qs !== current) {
            router.replace(qs ? `?${qs}` : "/", { scroll: false })
        }
    }, [queryParams, router, searchParams])

    useEffect(() => {
        const onPopState = () => {
            const sp = new URLSearchParams(window.location.search)
            setQueryParams(parseCaseListUrlParams(sp))
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
    const cases = data?.data ?? EMPTY_CASES
    const pagination = data?.pagination
    const [amountSort, setAmountSort] = useState<"asc" | "desc" | null>(null)

    const toggleAmountSort = useCallback(() => {
        setAmountSort((prev) => prev === null ? "desc" : prev === "desc" ? "asc" : null)
    }, [])

    const sortedCases = useMemo(() => {
        if (!amountSort) return cases
        return [...cases].sort((a, b) => {
            const aAmount = calcBestGrossAmount(a)
            const bAmount = calcBestGrossAmount(b)
            return amountSort === "asc" ? aAmount - bAmount : bAmount - aAmount
        })
    }, [cases, amountSort])

    const amountTotals = useMemo(() => calculateCaseListAmountTotals(cases), [cases])
    const rowNumberOffset = ((queryParams.page || 1) - 1) * (queryParams.pageSize || CASE_LIST_PAGE_SIZE)
    const tableColumns = useMemo(
        () => createColumns({ amountSort, toggleAmountSort, rowNumberOffset }),
        [amountSort, toggleAmountSort, rowNumberOffset]
    )

    const [allCases, setAllCases] = useState<InheritanceCase[]>([])
    const dataVersion = data?.pagination?.total
    const kpiFilters = useMemo(() => getCaseListKpiFilters(queryParams), [queryParams])
    const kpiDepsKey = useMemo(() => JSON.stringify(kpiFilters), [kpiFilters])
    const refreshKPI = useCallback(() => {
        const filters = Object.keys(kpiFilters).length > 0 ? kpiFilters : undefined
        return getAllCases(filters).then(setAllCases).catch(() => {})
    }, [kpiFilters])

    useEffect(() => {
        void refreshKPI()
    }, [dataVersion, refreshKPI])

    const { assignees, departments } = useAsyncMasters([dataVersion, kpiDepsKey])
    const kpiData = useMemo(() => computeKPI(allCases), [allCases])
    const activeKpiFilter = useMemo(() => getActiveKpiFilter(queryParams), [queryParams])
    const hasFilters = useMemo(() => getHasCaseFilters(queryParams), [queryParams])

    const handleSearch = useCallback(() => {
        setQueryParams((prev) => ({ ...prev, search: searchInput, page: 1 }))
    }, [searchInput])

    const handleFilterChange = useCallback((key: keyof CasesQueryParams, value: string | undefined) => {
        const parsed = parseCaseListFilterValue(key, value)
        setQueryParams((prev) => ({ ...prev, [key]: parsed, page: 1 }))
    }, [])

    const handleKpiFilterClick = useCallback((filter: KPICardFilterKey) => {
        const { from, to } = getThisMonthRange()
        setQueryParams((prev) => {
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

            if (isActive) {
                // トグルOFF: status / 全件表示の指定も解除
                if (filter === "ongoing" || filter === "completed") return { ...next, status: undefined }
                if (filter === "total") return { ...next, hideClosed: undefined }
                return next
            }
            switch (filter) {
                case "deadlineSoon": return { ...next, deadlineSoon: true }
                case "addedThisMonth": return { ...next, caseAddedFrom: from, caseAddedTo: to }
                case "completedThisMonth": return { ...next, caseCompletedFrom: from, caseCompletedTo: to }
                case "ongoing": return { ...next, status: ONGOING_STATUS, hideClosed: undefined }
                case "completed": return { ...next, status: COMPLETED_STATUS_CSV, hideClosed: undefined }
                case "total": return { ...next, status: undefined, hideClosed: false }
                default: return next
            }
        })
    }, [])

    const handleClearAll = useCallback(() => {
        setQueryParams({ page: 1, pageSize: CASE_LIST_PAGE_SIZE })
        setSearchInput("")
    }, [])

    const handleBulkDelete = useCallback(async () => {
        setIsDeleting(true)
        try {
            await bulkDeleteCases(getCaseListFilters(queryParams))
            setShowBulkDelete(false)
            void refetch()
            void refreshKPI()
        } catch {
            toast.error("一括削除に失敗しました")
        } finally {
            setIsDeleting(false)
        }
    }, [queryParams, refetch, refreshKPI, toast])

    const filterDescription = useMemo(
        () => getCaseListFilterDescription(queryParams, assignees),
        [queryParams, assignees]
    )

    return (
        <div className="container mx-auto max-w-[1600px] px-3 py-6 lg:px-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h1 className="text-xl font-bold">相続税申告案件一覧</h1>
                <CaseListToolbar
                    isFetching={isFetching}
                    isExporting={isExporting}
                    hasFilters={hasFilters}
                    totalCount={pagination?.total}
                    onRefresh={() => {
                        void refetch()
                    }}
                    onImport={() => setShowImportModal(true)}
                    onExport={() => {
                        void exportCSV(hasFilters ? queryParams : undefined)
                    }}
                    onBulkDelete={() => setShowBulkDelete(true)}
                />
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

            <CaseListTableSection
                isLoading={isLoading}
                isError={isError}
                error={error}
                isFetching={isFetching}
                cases={sortedCases}
                columns={tableColumns}
                hasFilters={hasFilters}
                amountTotals={amountTotals}
                pagination={pagination}
                onClearFilters={handleClearAll}
                onRetry={() => {
                    void refetch()
                }}
                onPageChange={(newPage) => setQueryParams((prev) => ({ ...prev, page: newPage }))}
            />

            <ImportCSVModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={() => {
                    void refetch()
                    void refreshKPI()
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
