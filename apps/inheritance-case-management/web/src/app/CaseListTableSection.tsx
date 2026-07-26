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
    cases: CaseListItem[]
    columns: ColumnDef<CaseListItem>[]
    hasFilters: boolean
    amountTotals: CaseListAmountTotals
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
    columns,
    hasFilters,
    amountTotals,
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
            {cases.length > 0 && (
                <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border bg-muted/50 px-3 py-2 text-xs md:mb-0 md:justify-end md:rounded-b-none">
                    <span className="font-medium text-muted-foreground">このページの売上合計</span>
                    <span className="font-bold">{formatCurrency(amountTotals.total)}</span>
                    <span className="text-black">確定 {formatCurrency(amountTotals.confirmed)}</span>
                    <span className="text-black/70">見込 {formatCurrency(amountTotals.estimate)}</span>
                    <span className="text-muted-foreground">/ {cases.length}件</span>
                </div>
            )}
            <DataTable
                columns={columns}
                data={cases}
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
