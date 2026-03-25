"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    hasFilters?: boolean
    onClearFilters?: () => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    hasFilters,
    onClearFilters,
}: DataTableProps<TData, TValue>) {
    const router = useRouter()
    const tableRef = React.useRef<HTMLDivElement>(null)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const rows = table.getRowModel().rows

    const { focusedRowIndex, setFocusedRowIndex, handleKeyDown, handleFocus } = useKeyboardNavigation({
        rowCount: rows.length,
        onEnter: (index) => {
            const caseData = rows[index].original as { id?: number }
            if (caseData.id) router.push(`/${caseData.id}`)
        },
        onEscape: () => tableRef.current?.blur(),
        resetDeps: [data],
    })

    return (
        <div
            ref={tableRef}
            className="w-full outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
        >
            <div className="rounded-md border overflow-x-auto">
                <p className="text-xs text-muted-foreground px-2 py-1 md:hidden">← 横にスクロールできます →</p>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="px-2 py-1 h-8 text-xs">
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
                            rows.map((row, index) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        focusedRowIndex === index && "bg-muted/50 ring-2 ring-inset ring-primary/20"
                                    )}
                                    onClick={() => {
                                        const caseData = row.original as { id?: number }
                                        if (caseData.id) router.push(`/${caseData.id}`)
                                    }}
                                    onMouseEnter={() => setFocusedRowIndex(index)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-2 py-1 text-sm">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
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
