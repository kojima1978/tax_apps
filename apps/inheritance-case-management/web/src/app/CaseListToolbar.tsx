"use client"

import { Download, MoreHorizontal, RefreshCw, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface CaseListToolbarProps {
    isFetching: boolean
    isExporting: boolean
    hasFilters: boolean
    totalCount?: number
    onRefresh: () => void
    onImport: () => void
    onExport: () => void
    onBulkDelete: () => void
}

export function CaseListToolbar({
    isFetching,
    isExporting,
    hasFilters,
    totalCount,
    onRefresh,
    onImport,
    onExport,
    onBulkDelete,
}: CaseListToolbarProps) {
    const canBulkDelete = hasFilters && totalCount != null && totalCount > 0

    const bulkDeleteLabel = `絞り込み中の${totalCount ?? 0}件を削除`

    const actionButtons = (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                className="w-full justify-start sm:w-auto sm:justify-center"
            >
                <Upload className="mr-2 h-4 w-4" />
                CSV取込
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="w-full justify-start sm:w-auto sm:justify-center"
            >
                <Download className={`mr-2 h-4 w-4 ${isExporting ? "animate-pulse" : ""}`} />
                {isExporting ? "エクスポート中..." : hasFilters ? "CSV出力（絞り込み）" : "CSV出力"}
            </Button>
            {canBulkDelete && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkDelete}
                    aria-label={bulkDeleteLabel}
                    className="w-full justify-start border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto sm:justify-center"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {bulkDeleteLabel}
                </Button>
            )}
        </>
    )

    return (
        <div className="flex items-center gap-1.5">
            <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isFetching}
                aria-label={isFetching ? "案件一覧を更新中" : "案件一覧を更新"}
            >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <div className="hidden items-center gap-1.5 sm:flex">{actionButtons}</div>
            <details className="group relative sm:hidden">
                <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border-2 border-input bg-background px-3 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <MoreHorizontal className="h-4 w-4" />
                    操作
                </summary>
                <div className="absolute right-0 z-40 mt-2 flex min-w-64 flex-col gap-2 rounded-xl border bg-background p-3 shadow-xl">
                    {actionButtons}
                </div>
            </details>
        </div>
    )
}
