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

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const router = useRouter()
    const tableRef = React.useRef<HTMLDivElement>(null)
    const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const rows = table.getRowModel().rows

    // Keyboard navigation handler
    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            const rowCount = rows.length
            if (rowCount === 0) return

            switch (e.key) {
                case "ArrowDown":
                case "j":
                    e.preventDefault()
                    setFocusedRowIndex((prev) => Math.min(prev + 1, rowCount - 1))
                    break
                case "ArrowUp":
                case "k":
                    e.preventDefault()
                    setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
                    break
                case "Enter":
                    e.preventDefault()
                    if (focusedRowIndex >= 0 && focusedRowIndex < rowCount) {
                        const row = rows[focusedRowIndex]
                        const caseData = row.original as { id?: string }
                        if (caseData.id) {
                            router.push(`/${caseData.id}`)
                        }
                    }
                    break
                case "Home":
                    e.preventDefault()
                    setFocusedRowIndex(0)
                    break
                case "End":
                    e.preventDefault()
                    setFocusedRowIndex(rowCount - 1)
                    break
                case "Escape":
                    e.preventDefault()
                    setFocusedRowIndex(-1)
                    tableRef.current?.blur()
                    break
            }
        },
        [rows, focusedRowIndex, router]
    )

    // Reset focused row when data changes
    React.useEffect(() => {
        setFocusedRowIndex(-1)
    }, [data])

    return (
        <div
            ref={tableRef}
            className="w-full outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => {
                if (focusedRowIndex === -1 && rows.length > 0) {
                    setFocusedRowIndex(0)
                }
            }}
        >
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="px-2 py-1 h-8 text-xs">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
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
                                        const caseData = row.original as { id?: string }
                                        if (caseData.id) {
                                            router.push(`/${caseData.id}`)
                                        }
                                    }}
                                    onMouseEnter={() => setFocusedRowIndex(index)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-2 py-1 text-xs">
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
                                    className="h-24 text-center"
                                >
                                    結果がありません。
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end py-2">
                <div className="text-xs text-muted-foreground/60 hidden md:flex gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                    <span>行選択</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                    <span>詳細へ</span>
                </div>
            </div>
        </div>
    )
}
