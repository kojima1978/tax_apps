"use client"

import React, { type ReactNode } from "react"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Trash2, Plus, Pencil, Check, X, ArrowUpDown, Ban, RotateCcw } from "lucide-react"

const ICON_BTN_MUTED = "h-8 w-8 text-muted-foreground hover:text-foreground"
const ICON_BTN_GREEN = "h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
const ICON_BTN_ORANGE = "h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
const ICON_BTN_DESTRUCTIVE = "h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"

export interface ColumnDef<T> {
    key: string
    label: string
    width?: string
    renderCell?: (item: T) => ReactNode
}

interface MasterListPageProps<T extends { id: string; active: boolean }> {
    title: string
    entityLabel: string
    returnTo: string | null
    isDirty: boolean
    isSaving: boolean
    items: T[]
    filteredItems: T[]
    showInactive: boolean
    onToggleShowInactive: () => void
    editingId: string | null
    columns: ColumnDef<T>[]
    // New item form
    newItemForm: ReactNode
    onAdd: () => void
    // Editing
    renderEditCell: (column: ColumnDef<T>) => ReactNode
    // Actions
    onStartEdit: (item: T) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onToggleActive: (id: string) => void
    onPermanentDelete: (id: string) => void
    onSave: () => void
    onSort: (field: string) => void
}

export function MasterListPage<T extends { id: string; active: boolean }>({
    title,
    entityLabel,
    returnTo,
    isDirty,
    isSaving,
    items,
    filteredItems,
    showInactive,
    onToggleShowInactive,
    editingId,
    columns,
    newItemForm,
    onAdd,
    renderEditCell,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleActive,
    onPermanentDelete,
    onSave,
    onSort,
}: MasterListPageProps<T>) {
    return (
        <div className="container mx-auto py-10 max-w-2xl relative pb-24">
            <div className="mb-6">
                <Link href={returnTo || "/settings"}>
                    <Button variant="outline">
                        {returnTo ? "前の画面に戻る" : "設定一覧に戻る"}
                    </Button>
                </Link>
                {isDirty && <span className="ml-4 text-sm text-amber-600 font-bold">※ 保存されていない変更があります</span>}
            </div>

            <h1 className="text-2xl font-bold mb-6">{title}</h1>

            <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6 space-y-6">
                <div className="flex items-end gap-2">
                    {newItemForm}
                    <Button onClick={onAdd} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        追加
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>登録済み{entityLabel}</Label>
                        <Button variant="outline" size="sm" onClick={onToggleShowInactive}>
                            {showInactive ? "有効のみ表示" : "すべて表示"}
                        </Button>
                    </div>
                    {items.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{entityLabel}が登録されていません。</p>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {columns.map(col => (
                                            <TableHead key={col.key} className={col.width ? `w-[${col.width}]` : ""}>
                                                <button
                                                    onClick={() => onSort(col.key)}
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    {col.label}
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </button>
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow key={item.id} className={item.active === false ? "bg-muted/50" : ""}>
                                            {editingId === item.id ? (
                                                <>
                                                    {columns.map(col => (
                                                        <TableCell key={col.key}>
                                                            {renderEditCell(col)}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={ICON_BTN_GREEN}
                                                                onClick={onSaveEdit}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={ICON_BTN_MUTED}
                                                                onClick={onCancelEdit}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    {columns.map((col, i) => (
                                                        <TableCell key={col.key} className={i === 0 ? "font-medium" : ""}>
                                                            {col.renderCell ? col.renderCell(item) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={ICON_BTN_MUTED}
                                                                onClick={() => onStartEdit(item)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            {item.active === false ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={ICON_BTN_GREEN}
                                                                        onClick={() => onToggleActive(item.id)}
                                                                        title="有効化"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={ICON_BTN_DESTRUCTIVE}
                                                                        onClick={() => onPermanentDelete(item.id)}
                                                                        title="完全削除"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={ICON_BTN_ORANGE}
                                                                    onClick={() => onToggleActive(item.id)}
                                                                    title="無効化"
                                                                >
                                                                    <Ban className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <StickyActionBar className="rounded-b-lg">
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
