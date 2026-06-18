"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { RefreshCw } from "lucide-react"
import { DataTable } from "@/components/cases/data-table"
import { Pagination } from "@/components/cases/Pagination"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatCurrency } from "@/lib/analytics-utils"
import { parseError } from "@/hooks/use-error-handler"
import type { InheritanceCase } from "@/types/shared"
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
    cases: InheritanceCase[]
    columns: ColumnDef<InheritanceCase>[]
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
                <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        更新中...
                    </div>
                </div>
            )}
            {cases.length > 0 && (
                <div className="flex w-full flex-wrap items-center justify-end gap-x-2 gap-y-0.5 rounded-t-md border px-2 py-1 text-[10px] bg-muted/50">
                    <span className="text-muted-foreground">売上合計</span>
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
