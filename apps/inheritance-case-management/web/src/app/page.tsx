"use client"

import { useState, useEffect, useMemo } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import type { CasesQueryParams } from "@/lib/api/cases"
import { getAllCases } from "@/lib/api/cases"
import type { InheritanceCase } from "@/types/shared"
import { Button } from "@/components/ui/Button"
import { RefreshCw, Download } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { parseError } from "@/hooks/use-error-handler"
import { KPICards } from "./KPICards"
import { FilterBar } from "./FilterBar"
import { Pagination } from "./Pagination"

export default function InheritanceMockupPage() {
    const [queryParams, setQueryParams] = useState<CasesQueryParams>({
        page: 1,
        pageSize: 30,
    })
    const [searchInput, setSearchInput] = useState("")

    const { data, isLoading, isError, error, refetch, isFetching } = useCases(queryParams)
    const { exportCSV, isExporting } = useExportCSV()
    const cases = data?.data ?? []
    const pagination = data?.pagination

    // KPI data
    const [allCases, setAllCases] = useState<InheritanceCase[]>([])
    useEffect(() => {
        getAllCases().then(setAllCases).catch(() => {})
    }, [])

    const kpiData = useMemo(() => {
        const now = new Date()
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const accepted = allCases.filter(c => c.acceptanceStatus === "受託可")
        const ongoing = accepted.filter(c => c.status === "進行中")
        const deadlineSoon = accepted.filter(c => {
            if (c.status === "完了") return false
            const death = new Date(c.dateOfDeath)
            const deadline = new Date(death)
            deadline.setMonth(deadline.getMonth() + 10)
            return deadline <= in30Days && deadline >= now
        })
        const completedThisMonth = accepted.filter(c => {
            if (c.status !== "完了") return false
            const updated = c.updatedAt ? new Date(c.updatedAt) : null
            return updated && updated.getMonth() === thisMonth && updated.getFullYear() === thisYear
        })

        return { total: allCases.length, ongoing: ongoing.length, deadlineSoon: deadlineSoon.length, completedThisMonth: completedThisMonth.length }
    }, [allCases])

    const handleSearch = () => {
        setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }))
    }

    const handleFilterChange = (key: keyof CasesQueryParams, value: string | undefined) => {
        setQueryParams(prev => ({ ...prev, [key]: value || undefined, page: 1 }))
    }

    const handleSortChange = (sortBy: string, sortOrder: string) => {
        setQueryParams(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))
    }

    const handleClearAll = () => {
        setQueryParams({ page: 1, pageSize: 30 })
        setSearchInput("")
    }

    const hasFilters = !!(queryParams.search || queryParams.status || queryParams.acceptanceStatus || queryParams.fiscalYear)

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
        </div>
    )
}
