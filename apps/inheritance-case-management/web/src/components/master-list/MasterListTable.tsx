import React, { type ReactNode } from "react"
import { ArrowUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EditActionButtons, RowActionButtons } from "@/components/master-list/MasterListActions"
import type { ColumnDef, MasterListItem } from "@/components/master-list/types"

interface MasterListTableProps<T extends MasterListItem> {
    columns: ColumnDef<T>[]
    filteredItems: T[]
    editingId: number | null
    renderEditCell?: (column: ColumnDef<T>) => ReactNode
    renderEditRow?: (item: T) => ReactNode
    onStartEdit: (item: T) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onToggleActive: (id: number) => void
    onPermanentDelete: (id: number) => void
    onSort: (field: string) => void
    groupBy?: (item: T) => string
}

export function MasterListTable<T extends MasterListItem>({
    columns,
    filteredItems,
    editingId,
    renderEditCell,
    renderEditRow,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleActive,
    onPermanentDelete,
    onSort,
    groupBy,
}: MasterListTableProps<T>) {
    return (
        <div className="border-y">
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow>
                        {columns.map(col => (
                            <TableHead key={col.key} style={col.width ? { width: col.width } : undefined}>
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
                    {filteredItems.map((item, idx) => {
                        const groupLabel = groupBy?.(item)
                        const prevGroupLabel = idx > 0 ? groupBy?.(filteredItems[idx - 1]) : undefined
                        const showGroupHeader = groupBy && groupLabel !== prevGroupLabel
                        return (
                            <React.Fragment key={item.id}>
                                {showGroupHeader && (
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={columns.length + 1} className="py-1.5 px-3 text-xs font-semibold text-muted-foreground tracking-wide">
                                            {groupLabel}
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow className={item.active === false ? "bg-muted/50" : ""}>
                                    {editingId === item.id && renderEditRow ? (
                                        <TableCell colSpan={columns.length + 1} className="bg-muted/10 p-0 align-top">
                                            {renderEditRow(item)}
                                        </TableCell>
                                    ) : editingId === item.id && renderEditCell ? (
                                        <>
                                            {columns.map(col => (
                                                <TableCell key={col.key} className={col.cellClassName}>
                                                    {renderEditCell(col)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <EditActionButtons onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} />
                                            </TableCell>
                                        </>
                                    ) : (
                                        <>
                                            {columns.map((col, i) => (
                                                <TableCell key={col.key} className={cn(i === 0 && "font-medium", col.cellClassName)}>
                                                    {col.renderCell ? col.renderCell(item) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <RowActionButtons
                                                    item={item}
                                                    onStartEdit={onStartEdit}
                                                    onToggleActive={onToggleActive}
                                                    onPermanentDelete={onPermanentDelete}
                                                />
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            </React.Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
