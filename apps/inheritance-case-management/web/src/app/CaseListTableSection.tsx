"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { RefreshCw } from "lucide-react"
import { DataTable } from "@/components/cases/data-table"
import { Pagination } from "@/components/cases/Pagination"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatCurrency } from "@/lib/analytics-utils"
import { parseError } from "@/hooks/use-error-handler"
import type { CaseListItem } from "@/types/shared"
import type { CaseListAmountTotals } from "./case-list-utils"

interface CaseListPagination {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

interface CaseListTableSectionProps {
    isLoading: boolean
    isError: boolean
    error: unknown
    isFetching: boolean
    selectedIds: Set<number>
    onToggleSelected: (id: number) => void
    cases: CaseListItem[]
    columns: ColumnDef<CaseListItem>[]
    hasFilters: boolean
    filteredAmountTotals?: CaseListAmountTotals
    density?: "standard" | "compact"
    visibleColumnIds?: readonly string[]
    pagination?: CaseListPagination
    onClearFilters: () => void
    onRetry: () => void
    onPageChange: (page: number) => void
}

export function CaseListTableSection({
    isLoading,
    isError,
    error,
    isFetching,
    cases,
    selectedIds,
    onToggleSelected,
    columns,
    hasFilters,
    filteredAmountTotals,
    density,
    visibleColumnIds,
    pagination,
    onClearFilters,
    onRetry,
    onPageChange,
}: CaseListTableSectionProps) {
    if (isLoading) {
        return <TableSkeleton rows={10} />
    }

    if (isError) {
        return <ErrorDisplay error={parseError(error)} onRetry={onRetry} />
    }

    return (
        <div className="relative">
            {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]" role="status" aria-live="polite">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        更新中...
                    </div>
                </div>
            )}
            {filteredAmountTotals && (
                <div className="mb-2 space-y-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs md:mb-0 md:rounded-b-none">
                    {filteredAmountTotals && <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="検索条件に一致する全件の売上合計">
                        <span className="font-medium">条件一致の全件合計</span>
                        <span className="text-sm font-bold">{formatCurrency(filteredAmountTotals.total)}</span>
                        <span>確定 {formatCurrency(filteredAmountTotals.confirmed)}</span>
                        <span>見込 {formatCurrency(filteredAmountTotals.estimate)}</span>
                        <span className="text-muted-foreground">/ {pagination?.total ?? cases.length}件（紹介料控除前）</span>
                    </div>}
                </div>
            )}
            <DataTable
                columns={columns}
                density={density}
                visibleColumnIds={visibleColumnIds}
                data={cases}
                selectedIds={selectedIds}
                onToggleSelected={onToggleSelected}
                hasFilters={hasFilters}
                onClearFilters={onClearFilters}
            />

            {pagination && (
                <Pagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    )
}
