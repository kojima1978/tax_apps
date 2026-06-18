"use client"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/EmptyState"
import { Search, FolderOpen } from "lucide-react"
import type { InheritanceCase } from "@/types/shared"
import { isHandlingEnded } from "@/types/constants"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    hasFilters?: boolean
    onClearFilters?: () => void
}

function getResponsiveColumnClass(columnId: string): string {
    if (columnId === "assignee" || columnId === "amount") return "hidden md:table-cell"
    return ""
}

export function DataTable<TData, TValue>({
    columns,
    data,
    hasFilters,
    onClearFilters,
}: DataTableProps<TData, TValue>) {
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const rows = table.getRowModel().rows

    return (
        <div className="w-full">
            <div className="w-fit max-w-full rounded-md border overflow-hidden">
                <Table
                    className="table-fixed text-[10px]"
                    style={{ width: table.getTotalSize(), maxWidth: "100%" }}
                >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn("h-7 px-px py-1 text-[10px]", getResponsiveColumnClass(header.column.id))}
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {rows.length ? (
                            rows.map((row, index) => {
                                const caseRow = row.original as InheritanceCase
                                const isEnded = isHandlingEnded(caseRow.status, caseRow.isUndivided)
                                return (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        index % 2 === 1 && "bg-muted/30",
                                        isEnded && "opacity-50"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn("px-px py-1 align-top text-[10px] leading-tight", getResponsiveColumnClass(cell.column.id))}
                                            style={{ width: cell.column.getSize() }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-48"
                                >
                                    {hasFilters ? (
                                        <EmptyState
                                            icon={Search}
                                            title="条件に一致する案件がありません"
                                            description="検索条件やフィルタを変更してください"
                                            action={onClearFilters ? { label: "フィルタをクリア", onClick: onClearFilters } : undefined}
                                        />
                                    ) : (
                                        <EmptyState
                                            icon={FolderOpen}
                                            title="案件が登録されていません"
                                            description="新規案件を登録してください"
                                            action={{ label: "新規案件登録", href: "/new" }}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
