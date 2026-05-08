"use client"

import { useMemo, type ReactNode } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import { MasterBreadcrumb } from "@/components/master-list/MasterBreadcrumb"
import { MasterListTable } from "@/components/master-list/MasterListTable"
import { MasterSearchControl } from "@/components/master-list/MasterSearchControl"
import { Pagination } from "@/components/cases/Pagination"
import type { ColumnDef, MasterListItem } from "@/components/master-list/types"

export type { ColumnDef } from "@/components/master-list/types"

interface MasterListPageProps<T extends MasterListItem> {
    title: string
    entityLabel: string
    returnTo: string | null
    isDirty: boolean
    isSaving: boolean
    isLoading: boolean
    items: T[]
    filteredItems: T[]
    searchValue?: string
    searchPlaceholder?: string
    onSearchChange?: (value: string) => void
    showInactive: boolean
    onToggleShowInactive: () => void
    editingId: number | null
    columns: ColumnDef<T>[]
    newItemForm: ReactNode
    onAdd: () => void
    renderEditCell?: (column: ColumnDef<T>) => ReactNode
    renderEditRow?: (item: T) => ReactNode
    onStartEdit: (item: T) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onToggleActive: (id: number) => void
    onPermanentDelete: (id: number) => void
    onSave: () => void
    onSort: (field: string) => void
    page: number
    pageSize: number
    totalPages: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
    groupBy?: (item: T) => string
}

/** useMasterList の返り値から MasterListPage の共通 props を抽出するヘルパー */
export function getMasterListPageProps<T extends MasterListItem>(
    ml: {
        returnTo: string | null
        isDirty: boolean
        isSaving: boolean
        isLoading: boolean
        items: T[]
        filteredAndSortedItems: T[]
        searchQuery: string
        showInactive: boolean
        handleSearchChange: (value: string) => void
        handleToggleShowInactive: () => void
        editingId: number | null
        handleCancelEdit: () => void
        handleToggleActive: (id: number) => void
        handlePermanentDelete: (id: number) => void
        handleSave: () => void
        handleSort: (field: string) => void
        page: number
        pageSize: number
        totalPages: number
        handlePageChange: (page: number) => void
        handlePageSizeChange: (size: number) => void
    }
): Pick<MasterListPageProps<T>,
    'returnTo' | 'isDirty' | 'isSaving' | 'isLoading' | 'items' | 'filteredItems' |
    'searchValue' | 'onSearchChange' | 'showInactive' | 'onToggleShowInactive' | 'editingId' | 'onCancelEdit' |
    'onToggleActive' | 'onPermanentDelete' | 'onSave' | 'onSort' |
    'page' | 'pageSize' | 'totalPages' | 'onPageChange' | 'onPageSizeChange'
> {
    return {
        returnTo: ml.returnTo,
        isDirty: ml.isDirty,
        isSaving: ml.isSaving,
        isLoading: ml.isLoading,
        items: ml.items,
        filteredItems: ml.filteredAndSortedItems,
        searchValue: ml.searchQuery,
        onSearchChange: ml.handleSearchChange,
        showInactive: ml.showInactive,
        onToggleShowInactive: ml.handleToggleShowInactive,
        editingId: ml.editingId,
        onCancelEdit: ml.handleCancelEdit,
        onToggleActive: ml.handleToggleActive,
        onPermanentDelete: ml.handlePermanentDelete,
        onSave: ml.handleSave,
        onSort: ml.handleSort,
        page: ml.page,
        pageSize: ml.pageSize,
        totalPages: ml.totalPages,
        onPageChange: ml.handlePageChange,
        onPageSizeChange: ml.handlePageSizeChange,
    }
}

export function MasterListPage<T extends MasterListItem>({
    title,
    entityLabel,
    returnTo,
    isDirty,
    isSaving,
    isLoading,
    items,
    filteredItems,
    searchValue,
    searchPlaceholder = "検索",
    onSearchChange,
    showInactive,
    onToggleShowInactive,
    editingId,
    columns,
    newItemForm,
    onAdd,
    renderEditCell,
    renderEditRow,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleActive,
    onPermanentDelete,
    onSave,
    onSort,
    page,
    pageSize,
    totalPages,
    onPageChange,
    onPageSizeChange,
    groupBy,
}: MasterListPageProps<T>) {
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredItems.slice(start, start + pageSize)
    }, [filteredItems, page, pageSize])

    return (
        <div className="container mx-auto py-10 max-w-[1180px] relative pb-24 px-4">
            <MasterBreadcrumb returnTo={returnTo} title={title} />

            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    {isDirty && <span className="text-sm text-gray-700 font-bold">※ 未保存の変更あり</span>}
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                    {onSearchChange && (
                        <MasterSearchControl
                            value={searchValue ?? ""}
                            placeholder={searchPlaceholder}
                            onChange={onSearchChange}
                        />
                    )}
                    <Button variant="outline" size="sm" onClick={onToggleShowInactive} className="h-10 shrink-0 rounded-md px-4">
                        {showInactive ? "有効のみ表示" : "すべて表示"}
                    </Button>
                </div>
            </div>

            <div className="space-y-5">
                <div className="border-y py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        {newItemForm}
                        <Button onClick={onAdd} variant="outline" className="h-10 shrink-0 rounded-md px-5 lg:self-end">
                            <Plus className="h-4 w-4 mr-2" />
                            追加
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <Label>登録済み{entityLabel}</Label>
                        <div className="flex items-center gap-3">
                            <select
                                value={pageSize}
                                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                className="h-7 rounded border text-xs bg-background pl-1.5 pr-5"
                            >
                                <option value={25}>25件</option>
                                <option value={50}>50件</option>
                                <option value={100}>100件</option>
                            </select>
                            <span className="shrink-0 text-xs text-muted-foreground">{filteredItems.length} / {items.length} 件</span>
                        </div>
                    </div>
                    {isLoading ? (
                        <p className="text-muted-foreground text-sm">読み込み中...</p>
                    ) : items.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{entityLabel}が登録されていません。</p>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">条件に一致する{entityLabel}がありません。</p>
                    ) : (
                        <>
                            <MasterListTable
                                columns={columns}
                                filteredItems={paginatedItems}
                                editingId={editingId}
                                renderEditCell={renderEditCell}
                                renderEditRow={renderEditRow}
                                onStartEdit={onStartEdit}
                                onSaveEdit={onSaveEdit}
                                onCancelEdit={onCancelEdit}
                                onToggleActive={onToggleActive}
                                onPermanentDelete={onPermanentDelete}
                                onSort={onSort}
                                groupBy={groupBy}
                            />
                            <Pagination
                                page={page}
                                pageSize={pageSize}
                                total={filteredItems.length}
                                totalPages={totalPages}
                                onPageChange={onPageChange}
                            />
                        </>
                    )}
                </div>
            </div>

            <StickyActionBar>
                <Button
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                    variant="outline"
                    className={`min-w-[120px] font-bold shadow-sm ${isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                >
                    {isSaving ? "処理中..." : "変更を保存"}
                </Button>
            </StickyActionBar>
        </div>
    )
}
