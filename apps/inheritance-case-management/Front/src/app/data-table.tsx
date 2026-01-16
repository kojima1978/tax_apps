"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
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
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "fiscalYear", desc: true },
        { id: "dateOfDeath", desc: false },
    ])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        initialState: {
            sorting: [
                {
                    id: "fiscalYear",
                    desc: true,
                },
                {
                    id: "dateOfDeath",
                    desc: false,
                },
            ],
            pagination: {
                pageSize: 30,
            },
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4 gap-4">
                <Input
                    placeholder="被相続人氏名で検索..."
                    value={(table.getColumn("deceasedName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("deceasedName")?.setFilterValue(event.target.value)
                    }
                    className="max-w-xs"
                />
                <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="mr-2 text-muted-foreground whitespace-nowrap">年度:</span>
                    <select
                        value={(table.getColumn("fiscalYear")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => {
                            const val = event.target.value
                            table.getColumn("fiscalYear")?.setFilterValue(val ? parseInt(val, 10) : "")
                        }}
                        className="h-full bg-transparent outline-none"
                    >
                        <option value="">すべて</option>
                        <option value="2026">2026年度</option>
                        <option value="2025">2025年度</option>
                        <option value="2024">2024年度</option>
                        <option value="2023">2023年度</option>
                    </select>
                </div>
                <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="mr-2 text-muted-foreground whitespace-nowrap">受託:</span>
                    <select
                        value={(table.getColumn("acceptanceStatus")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("acceptanceStatus")?.setFilterValue(event.target.value)
                        }
                        className="h-full bg-transparent outline-none"
                    >
                        <option value="">すべて</option>
                        <option value="未判定">未判定</option>
                        <option value="受託可">受託可</option>
                        <option value="受託不可">受託不可</option>
                    </select>
                </div>
                <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="mr-2 text-muted-foreground whitespace-nowrap">進行:</span>
                    <select
                        value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("status")?.setFilterValue(event.target.value)
                        }
                        className="h-full bg-transparent outline-none"
                    >
                        <option value="">すべて</option>
                        <option value="未着手">未着手</option>
                        <option value="進行中">進行中</option>
                        <option value="完了">完了</option>
                    </select>
                </div>

                <Input
                    placeholder="担当者で検索..."
                    value={(table.getColumn("assignee")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("assignee")?.setFilterValue(event.target.value)
                    }
                    className="max-w-xs"
                />
            </div>
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
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
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
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    対象件数：{table.getFilteredRowModel().rows.length} 件
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        前へ
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        次へ
                    </Button>
                </div>
            </div>
        </div>
    )
}
