"use client"

import { Download, RefreshCw, Trash2, Upload } from "lucide-react"
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

    return (
        <div className="flex gap-1.5 items-center">
            <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isFetching}
            >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={onImport}
            >
                <Upload className="mr-2 h-4 w-4" />
                CSV取込
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isExporting}
            >
                <Download className={`mr-2 h-4 w-4 ${isExporting ? "animate-pulse" : ""}`} />
                {isExporting ? "エクスポート中..." : hasFilters ? "CSV出力(絞り込み)" : "CSV出力"}
            </Button>
            {canBulkDelete && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkDelete}
                    className="text-black border-gray-300 hover:bg-gray-100"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    一括削除 ({totalCount}件)
                </Button>
            )}
        </div>
    )
}
