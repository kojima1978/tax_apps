"use client"

import { useState, useEffect, useMemo } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import type { CasesQueryParams } from "@/lib/api/cases"
import { getAllCases, bulkDeleteCases } from "@/lib/api/cases"
import type { InheritanceCase, Assignee, Department } from "@/types/shared"
import { getAssignees } from "@/lib/api/assignees"
import { getDepartments } from "@/lib/api/departments"
import { computeKPI } from "@/lib/kpi-utils"
import { FILTER_KEYS } from "@/types/constants"
import { Button } from "@/components/ui/Button"
import { RefreshCw, Download, Upload, Trash2 } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { parseError } from "@/hooks/use-error-handler"
import { useToast } from "@/components/ui/Toast"
import { KPICards } from "./KPICards"
import { FilterBar } from "./FilterBar"
import { Pagination } from "./Pagination"
import { ImportCSVModal } from "@/components/ImportCSVModal"
import { BulkDeleteModal } from "@/components/BulkDeleteModal"

export default function InheritanceMockupPage() {
    const toast = useToast()
    const [queryParams, setQueryParams] = useState<CasesQueryParams>({
        page: 1,
        pageSize: 30,
        fiscalYear: new Date().getFullYear(),
    })
    const [searchInput, setSearchInput] = useState("")

    const { data, isLoading, isError, error, refetch, isFetching } = useCases(queryParams)
    const { exportCSV, isExporting } = useExportCSV()
    const [showImportModal, setShowImportModal] = useState(false)
    const [showBulkDelete, setShowBulkDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const cases = data?.data ?? []
    const pagination = data?.pagination

    // KPI data & assignees
    const [allCases, setAllCases] = useState<InheritanceCase[]>([])
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const dataVersion = data?.pagination?.total
    const kpiFilters = Object.fromEntries(FILTER_KEYS.filter(k => queryParams[k]).map(k => [k, queryParams[k]]))
    const kpiDepsKey = JSON.stringify(kpiFilters)
    const refreshKPI = () => getAllCases(Object.keys(kpiFilters).length > 0 ? kpiFilters : undefined).then(setAllCases).catch(() => {})
    useEffect(() => {
        refreshKPI()
        getAssignees().then(setAssignees).catch(() => {})
        getDepartments().then(setDepartments).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataVersion, kpiDepsKey])

    const kpiData = useMemo(() => computeKPI(allCases), [allCases])

    const handleSearch = () => {
        setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }))
    }

    const handleFilterChange = (key: keyof CasesQueryParams, value: string | undefined) => {
        const parsed = key === 'assigneeId' && value ? Number(value) : (value || undefined)
        setQueryParams(prev => ({ ...prev, [key]: parsed, page: 1 }))
    }

    const handleSortChange = (sortBy: CasesQueryParams['sortBy'], sortOrder: CasesQueryParams['sortOrder']) => {
        setQueryParams(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))
    }

    const handleClearAll = () => {
        setQueryParams({ page: 1, pageSize: 30 })
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
        if (queryParams.status) parts.push(`ステータス: ${queryParams.status}`)
        if (queryParams.acceptanceStatus) parts.push(`受託: ${queryParams.acceptanceStatus}`)
        if (queryParams.department) parts.push(`部門: ${queryParams.department}`)
        if (queryParams.assigneeId) {
            const matched = assignees.find(item => item.id === queryParams.assigneeId)
            if (matched) parts.push(`担当: ${matched.name}`)
        }
        if (queryParams.search) parts.push(`検索: ${queryParams.search}`)
        return parts.length > 0 ? parts.join(' / ') : '全案件'
    }, [queryParams, assignees])

    const hasFilters = FILTER_KEYS.some(k => queryParams[k])

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-2xl font-bold">相続税申告案件一覧</h1>
                <div className="flex gap-2 items-center">
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
                        onClick={() => setShowImportModal(true)}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        CSV取込
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => exportCSV(hasFilters ? queryParams : undefined)}
                        disabled={isExporting}
                    >
                        <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                        {isExporting ? 'エクスポート中...' : hasFilters ? 'CSV出力(絞り込み)' : 'CSV出力'}
                    </Button>
                    {hasFilters && pagination?.total != null && pagination.total > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setShowBulkDelete(true)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            一括削除 ({pagination.total}件)
                        </Button>
                    )}
                </div>
            </div>

            {allCases.length > 0 && <KPICards data={kpiData} />}

            <FilterBar
                queryParams={queryParams}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
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
                    <DataTable
                        columns={columns}
                        data={cases}
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
