"use client"

import Link from "next/link"
import { Download, MoreHorizontal, Plus, RefreshCw, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface CaseListToolbarProps {
    isFetching: boolean
    isExporting: boolean
    hasFilters: boolean
    selectedCount: number
    onRefresh: () => void
    onImport: () => void
    onExport: () => void
    onBulkDelete: () => void
}

export function CaseListToolbar({ isFetching, isExporting, hasFilters, selectedCount, onRefresh, onImport, onExport, onBulkDelete }: CaseListToolbarProps) {
    return <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && <Button variant="outline" disabled={isFetching} onClick={onBulkDelete} className="border-red-200 text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />選択した{selectedCount}件を削除
        </Button>}
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isFetching} aria-label={isFetching ? "案件一覧を更新中" : "案件一覧を更新"}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
        <details className="relative" onKeyDown={e => {
            if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus() }
        }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false }}>
            <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><MoreHorizontal className="h-4 w-4" />操作</summary>
            <div className="absolute right-0 z-40 mt-2 flex w-60 flex-col rounded-xl border bg-white p-2 shadow-lg" onClick={e => { const menu = e.currentTarget.closest("details"); if (menu) menu.open = false }}>
                <Button variant="ghost" onClick={onImport} className="justify-start"><Upload className="mr-2 h-4 w-4" />CSV取込</Button>
                <Button variant="ghost" onClick={onExport} disabled={isExporting} className="justify-start"><Download className="mr-2 h-4 w-4" />{isExporting ? "出力中..." : hasFilters ? "CSV出力（絞り込み）" : "CSV出力"}</Button>
            </div>
        </details>
        <Link href="/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><Plus className="h-4 w-4" />新規案件</Link>
    </div>
}
