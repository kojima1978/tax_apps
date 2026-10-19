"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { readCaseListNavigation, saveCaseListNavigation } from "@/lib/case-list-navigation"
import { useRouter, useSearchParams } from "next/navigation"
import { createColumns } from "@/components/cases/columns"
import { FilterBar } from "@/components/cases/FilterBar"
import { KPICards, type KPICardFilterKey } from "@/components/cases/KPICards"
import { BulkDeleteModal } from "@/components/BulkDeleteModal"
import dynamic from "next/dynamic"
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
import { CaseListPreferences } from "./CaseListPreferences"
import { CaseShortcuts } from "@/components/cases/CaseShortcuts"
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences"
import { LIST_VIEWS } from "@/lib/workspace-preferences"
import {
    applyKpiCardFilter,
    CASE_LIST_PAGE_SIZE,
    getActiveKpiFilter,
    getCaseListKpiFilters,
    getHasCaseFilters,
    parseCaseListFilterValue,
    parseCaseListUrlParams,
    toCaseListUrlSearch,
} from "./case-list-utils"

const EMPTY_CASES: CaseListItem[] = []
const ImportCSVModal = dynamic(() => import("@/components/ImportCSVModal").then(module => module.ImportCSVModal), {
    loading: () => <div role="status" className="fixed inset-x-4 top-20 z-50 rounded-lg border bg-white p-4 shadow-lg">CSV取り込みを読み込み中…</div>,
})

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
    const { preferences } = useWorkspacePreferences()
    const visibleColumnIds: readonly string[] = preferences.columns ?? LIST_VIEWS[preferences.listView].columns

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
    const restoredPosition = useRef(false)
    useEffect(() => {
        if (isLoading || isFetching || restoredPosition.current) return
        const context = readCaseListNavigation()
        if (!context || context.query !== toCaseListUrlSearch(queryParams)) { restoredPosition.current = true; return }
        const frame = requestAnimationFrame(() => {
            restoredPosition.current = true
            document.querySelectorAll(`[data-case-id="${context.openedId}"]`).forEach(row => row.setAttribute("data-last-opened", "true"))
            window.scrollTo({ top: context.scrollY, behavior: "instant" })
        })
        return () => cancelAnimationFrame(frame)
    }, [isLoading, isFetching, queryParams])
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

    const rowNumberOffset = ((queryParams.page || 1) - 1) * (queryParams.pageSize || CASE_LIST_PAGE_SIZE)
    const tableColumns = useMemo(
        () => createColumns({ amountSort, toggleAmountSort, rowNumberOffset, selectedIds, onToggleSelected, allSelected, onToggleAll }).filter(column => {
            const id = column.id ?? ("accessorKey" in column ? column.accessorKey : "")
            return !["dateOfDeath", "status", "assignee", "amount", "paymentDates", "summary"].includes(String(id)) || visibleColumnIds.includes(String(id))
        }),
        [amountSort, toggleAmountSort, rowNumberOffset, selectedIds, onToggleSelected, allSelected, onToggleAll, visibleColumnIds]
    )

    const kpiFilters = useMemo(() => getCaseListKpiFilters(queryParams), [queryParams])
    const { data: kpiData, refetch: refetchKpis } = useCaseKpis(
        Object.keys(kpiFilters).length > 0 ? kpiFilters : undefined
    )

    const { assignees, departments, refetch: refetchMasters } = useAsyncMasters()
    const activeKpiFilter = useMemo(() => getActiveKpiFilter(queryParams), [queryParams])
    const hasFilters = useMemo(() => getHasCaseFilters(queryParams), [queryParams])

    const handleSearch = useCallback(() => {
        setQueryParams((prev) => (prev.search ?? "") === searchInput ? prev : ({ ...prev, search: searchInput, page: 1 }))
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
        setQueryParams({ page: 1, pageSize: CASE_LIST_PAGE_SIZE, hideClosed: false })
        setSearchInput("")
    }, [])

    const handleResetDefaults = useCallback(() => {
        setQueryParams(parseCaseListUrlParams(new URLSearchParams()))
        setSearchInput("")
        toast.success("初期表示に戻しました（今年度・終了案件を除外）")
    }, [toast])

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
        <div className="case-workspace mx-auto min-h-screen max-w-[1600px] px-3 py-4 lg:px-6" onClickCapture={event => {
            const anchor = (event.target as HTMLElement).closest("a")
            if (!anchor) return
            const match = new URL(anchor.href).pathname.match(/\/(\d+)\/?$/)
            if (!match) return
            const openedId = Number(match[1])
            if (!cases.some(item => item.id === openedId)) return
            saveCaseListNavigation({ query: toCaseListUrlSearch(queryParams), scrollY: window.scrollY, openedId, cases: cases.map(item => ({ id: item.id, name: item.deceasedName })) })
        }}>
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

            <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="案件の検索ツール">
            <FilterBar
                queryParams={queryParams}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                onResetDefaults={handleResetDefaults}
                assignees={assignees}
                departments={departments}
                totalCount={pagination?.total}
                isUpdating={isFetching}
                hasFilters={hasFilters}
            />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-b-xl border-t bg-slate-50/70 px-3 py-2 sm:px-4">
                <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label="対応待ち案件">
                    <span className="mr-1 text-xs font-medium text-slate-500">クイック絞り込み</span>
                    {[{ label: "申告済・未請求", status: "申告済" }, { label: "請求済・未入金", status: "請求済" }, { label: "担当者未設定", status: null }].map(item => {
                        const active = item.status ? queryParams.status === item.status : Boolean(queryParams.unassigned)
                        return <button key={item.label} type="button" aria-pressed={active} className={`min-h-11 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"}`} onClick={() => setQueryParams(prev => ({ ...prev,
                            status: active ? undefined : item.status ?? undefined,
                            unassigned: !active && !item.status ? true : undefined,
                            ...(!active && !item.status ? { assigneeId: undefined, staffId: undefined } : {}),
                            deadlineSoon: undefined, deadlineOverdue: undefined,
                            caseAddedFrom: undefined, caseAddedTo: undefined, caseCompletedFrom: undefined, caseCompletedTo: undefined,
                            hideClosed: true, page: 1,
                        }))}>{item.label}</button>
                    })}
                </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="一覧の便利機能">
                <CaseListPreferences params={{ ...queryParams, search: searchInput }} onApply={params => { setQueryParams(params); setSearchInput(params.search ?? "") }} />
                <CaseShortcuts />
                {preferences.savedSearches.slice(0, 3).map(item => <button type="button" key={item.id} className="min-h-11 max-w-full truncate rounded-lg px-2.5 text-xs text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { const params = parseCaseListUrlParams(new URLSearchParams(item.query), false); setQueryParams(params); setSearchInput(params.search ?? "") }}>{item.name}</button>)}
            </div>
            </div>
            </div>

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
                filteredAmountTotals={data?.amountTotals}
                density={preferences.density}
                visibleColumnIds={visibleColumnIds}
                pagination={pagination}
                onClearFilters={handleClearAll}
                onRetry={() => {
                    void refetch()
                }}
                onPageChange={(newPage) => setQueryParams((prev) => ({ ...prev, page: newPage }))}
            />

            {showImportModal && <ImportCSVModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={() => {
                    void refetch()
                    void refetchKpis()
                    void refetchMasters()
                }}
            />}

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
