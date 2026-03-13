"use client"

import { useState, useEffect, useMemo } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import type { CasesQueryParams } from "@/lib/api/cases"
import { getAllCases } from "@/lib/api/cases"
import type { InheritanceCase, Assignee } from "@/types/shared"
import { getAssignees } from "@/lib/api/assignees"
import { computeKPI } from "@/lib/kpi-utils"
import { Button } from "@/components/ui/Button"
import { RefreshCw, Download, Upload } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { parseError } from "@/hooks/use-error-handler"
import { KPICards } from "./KPICards"
import { FilterBar } from "./FilterBar"
import { Pagination } from "./Pagination"
import { ImportCSVModal } from "@/components/ImportCSVModal"

export default function InheritanceMockupPage() {
    const [queryParams, setQueryParams] = useState<CasesQueryParams>({
        page: 1,
        pageSize: 30,
    })
    const [searchInput, setSearchInput] = useState("")

    const { data, isLoading, isError, error, refetch, isFetching } = useCases(queryParams)
    const { exportCSV, isExporting } = useExportCSV()
    const [showImportModal, setShowImportModal] = useState(false)
    const cases = data?.data ?? []
    const pagination = data?.pagination

    // KPI data & assignees
    const [allCases, setAllCases] = useState<InheritanceCase[]>([])
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const dataVersion = data?.pagination?.total
    useEffect(() => {
        getAllCases().then(setAllCases).catch(() => {})
        getAssignees().then(setAssignees).catch(() => {})
    }, [dataVersion])

    const kpiData = useMemo(() => computeKPI(allCases), [allCases])

    const handleSearch = () => {
        setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }))
    }

    const handleFilterChange = (key: keyof CasesQueryParams, value: string | undefined) => {
        const parsed = key === 'assigneeId' && value ? Number(value) : (value || undefined)
        setQueryParams(prev => ({ ...prev, [key]: parsed, page: 1 }))
    }

    const handleSortChange = (sortBy: string, sortOrder: string) => {
        setQueryParams(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))
    }

    const handleClearAll = () => {
        setQueryParams({ page: 1, pageSize: 30 })
        setSearchInput("")
    }

    const hasFilters = !!(queryParams.search || queryParams.status || queryParams.acceptanceStatus || queryParams.fiscalYear || queryParams.assigneeId)

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
                        onClick={exportCSV}
                        disabled={isExporting}
                    >
                        <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                        {isExporting ? 'エクスポート中...' : 'CSV出力'}
                    </Button>
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
                    getAllCases().then(setAllCases).catch(() => {})
                }}
            />
        </div>
    )
}
