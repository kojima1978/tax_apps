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
import { useCaseKpis, useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import { bulkDeleteCases } from "@/lib/api/cases"
import type { CasesQueryParams } from "@/lib/api/cases"
import type { CaseListItem } from "@/types/shared"
import { CaseListTableSection } from "./CaseListTableSection"
import { CaseListToolbar } from "./CaseListToolbar"
import {
    applyKpiCardFilter,
    calculateCaseListAmountTotals,
    CASE_LIST_PAGE_SIZE,
    getActiveKpiFilter,
    getCaseListKpiFilters,
    getHasCaseFilters,
    parseCaseListFilterValue,
    parseCaseListUrlParams,
    toCaseListUrlSearch,
} from "./case-list-utils"

const EMPTY_CASES: CaseListItem[] = []

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
    const [selection, setSelection] = useState<{ data: typeof data; ids: Set<number> }>({ data: undefined, ids: new Set() })
    // A newly fetched result clears selection, preventing hidden/stale targets.
    const selectedIds = useMemo(() => selection.data === data ? selection.ids : new Set<number>(), [selection, data])
    const onToggleSelected = useCallback((id: number) => {
        setSelection(prev => {
            const ids = new Set(prev.data === data ? prev.ids : [])
            if (ids.has(id)) ids.delete(id); else ids.add(id)
            return { data, ids }
        })
    }, [data])
    const allSelected = cases.length > 0 && cases.every(c => selectedIds.has(c.id))
    const onToggleAll = useCallback(() => setSelection({ data, ids: allSelected ? new Set() : new Set(cases.map(c => c.id)) }), [data, cases, allSelected])
    const [deleteTargets, setDeleteTargets] = useState<CaseListItem[]>([])
    const pagination = data?.pagination
    const amountSort = queryParams.sortBy === "bestAmount" ? queryParams.sortOrder ?? "asc" : null

    const toggleAmountSort = useCallback(() => {
        setQueryParams((prev) => {
            const current = prev.sortBy === "bestAmount" ? prev.sortOrder : null
            if (current === null || current === undefined) {
                return { ...prev, sortBy: "bestAmount", sortOrder: "desc", page: 1 }
            }
            if (current === "desc") {
                return { ...prev, sortBy: "bestAmount", sortOrder: "asc", page: 1 }
            }
            return { ...prev, sortBy: undefined, sortOrder: undefined, page: 1 }
        })
    }, [])

    const amountTotals = useMemo(() => calculateCaseListAmountTotals(cases), [cases])
    const rowNumberOffset = ((queryParams.page || 1) - 1) * (queryParams.pageSize || CASE_LIST_PAGE_SIZE)
    const tableColumns = useMemo(
        () => createColumns({ amountSort, toggleAmountSort, rowNumberOffset, selectedIds, onToggleSelected, allSelected, onToggleAll }),
        [amountSort, toggleAmountSort, rowNumberOffset, selectedIds, onToggleSelected, allSelected, onToggleAll]
    )

    const dataVersion = data?.pagination?.total
    const kpiFilters = useMemo(() => getCaseListKpiFilters(queryParams), [queryParams])
    const kpiDepsKey = useMemo(() => JSON.stringify(kpiFilters), [kpiFilters])
    const { data: kpiData, refetch: refetchKpis } = useCaseKpis(
        Object.keys(kpiFilters).length > 0 ? kpiFilters : undefined
    )

    const { assignees, departments } = useAsyncMasters([dataVersion, kpiDepsKey])
    const activeKpiFilter = useMemo(() => getActiveKpiFilter(queryParams), [queryParams])
    const hasFilters = useMemo(() => getHasCaseFilters(queryParams), [queryParams])

    const handleSearch = useCallback(() => {
        setQueryParams((prev) => ({ ...prev, search: searchInput, page: 1 }))
    }, [searchInput])

    const handleFilterChange = useCallback((key: keyof CasesQueryParams, value: string | undefined) => {
        const parsed = parseCaseListFilterValue(key, value)
        setQueryParams((prev) => ({
            ...prev,
            ...(key === "fiscalYear" ? { fiscalYears: undefined } : {}),
            [key]: parsed,
            page: 1,
        }))
    }, [])

    const handleKpiFilterClick = useCallback((filter: KPICardFilterKey) => {
        setQueryParams((prev) => applyKpiCardFilter(prev, filter))
    }, [])

    const handleClearAll = useCallback(() => {
        setQueryParams({ page: 1, pageSize: CASE_LIST_PAGE_SIZE })
        setSearchInput("")
    }, [])

    const handleBulkDelete = useCallback(async () => {
        setIsDeleting(true)
        try {
            await bulkDeleteCases(deleteTargets.map(c => c.id))
            setSelection({ data: undefined, ids: new Set() })
            setShowBulkDelete(false)
            void refetch()
            void refetchKpis()
        } catch {
            toast.error("一括削除に失敗しました")
        } finally {
            setIsDeleting(false)
        }
    }, [deleteTargets, refetch, refetchKpis, toast])

    return (
        <div className="case-workspace mx-auto min-h-screen max-w-[1600px] px-3 py-4 lg:px-6">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h1 className="text-xl font-bold">相続税申告案件一覧</h1>
                <CaseListToolbar
                    isFetching={isFetching}
                    isExporting={isExporting}
                    hasFilters={hasFilters}
                    selectedCount={selectedIds.size}
                    onRefresh={() => {
                        void refetch()
                        void refetchKpis()
                    }}
                    onImport={() => setShowImportModal(true)}
                    onExport={() => {
                        void exportCSV(hasFilters ? queryParams : undefined)
                    }}
                    onBulkDelete={() => {
                        setDeleteTargets(cases.filter(c => selectedIds.has(c.id)))
                        setShowBulkDelete(true)
                    }}
                />
            </div>

            {kpiData && (
                <KPICards
                    data={kpiData}
                    scopeLabel={queryParams.fiscalYear ? `${queryParams.fiscalYear}年度` : queryParams.fiscalYears ? `${queryParams.fiscalYears.replaceAll(",", "・")}年度` : "全年度"}
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

            {selectedIds.size > 0 && <div className="mb-2 flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900" aria-live="polite">
                <span>{selectedIds.size}件を選択中</span>
                <button type="button" className="min-h-11 px-2 underline" onClick={() => setSelection({ data, ids: new Set() })}>選択を解除</button>
            </div>}
            <CaseListTableSection
                isLoading={isLoading}
                isError={isError}
                error={error}
                isFetching={isFetching}
                cases={cases}
                selectedIds={selectedIds}
                onToggleSelected={onToggleSelected}
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
                    void refetchKpis()
                }}
            />

            <BulkDeleteModal
                isOpen={showBulkDelete}
                onClose={() => setShowBulkDelete(false)}
                onConfirm={handleBulkDelete}
                totalCount={deleteTargets.length}
                filterDescription={deleteTargets.map(c => c.deceasedName).join("、")}
                isDeleting={isDeleting}
            />
        </div>
    )
}
