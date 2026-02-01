"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { InheritanceCase } from "@tax-apps/shared"
import Link from "next/link"
import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Column } from "@tanstack/react-table"

// ソートアイコンを表示するヘルパー
function SortIcon<T>({ column }: { column: Column<T, unknown> }) {
    const sorted = column.getIsSorted()
    if (sorted === "asc") return <ArrowUp className="ml-1 h-4 w-4" />
    if (sorted === "desc") return <ArrowDown className="ml-1 h-4 w-4" />
    return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
}

export const columns: ColumnDef<InheritanceCase>[] = [
    {
        accessorKey: "deceasedName",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    被相続人氏名
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="lowercase">
                <Link href={`/${row.original.id}`} className="text-blue-600 hover:underline">
                    {row.getValue("deceasedName") || "(氏名未入力)"}
                </Link>
            </div>
        ),
    },
    {
        accessorKey: "fiscalYear",
        filterFn: "equals",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    年度
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => {
            return <div className="text-center font-medium">{row.getValue("fiscalYear")}年度</div>
        },
    },
    {
        accessorKey: "dateOfDeath",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    相続開始日
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("dateOfDeath"))
            return <div>{date.toLocaleDateString("ja-JP")}</div>
        },
    },
    {
        id: "declarationDeadline",
        header: "申告期限",
        cell: ({ row }) => {
            const deathDate = new Date(row.getValue("dateOfDeath"))
            const deadline = new Date(deathDate)
            deadline.setMonth(deadline.getMonth() + 10)
            return <div>{deadline.toLocaleDateString("ja-JP")}</div>
        },
    },
    {
        accessorKey: "acceptanceStatus",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    受託
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("acceptanceStatus") || "未判定"}</div>
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    進行
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("status")}</div>
        ),
    },
    {
        accessorKey: "assignee",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    担当者
                    <SortIcon column={column} />
                </Button>
            )
        },
        cell: ({ row }) => <div>{row.getValue("assignee")}</div>,
    },


    {
        accessorKey: "estimateAmount",
        header: ({ column }) => (
            <div className="text-right">
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    見積額
                    <SortIcon column={column} />
                </Button>
            </div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("estimateAmount") || "0")
            const referralFeeRate = row.original.referralFeeRate || 0
            const netAmount = amount * (1 - referralFeeRate / 100)

            const formatted = new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
            }).format(netAmount)

            return <div className="text-right font-medium">{formatted}</div>
        },
    },
    {
        accessorKey: "feeAmount",
        header: ({ column }) => (
            <div className="text-right">
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 text-xs px-2"
                >
                    報酬額
                    <SortIcon column={column} />
                </Button>
            </div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("feeAmount") || "0")
            const referralFee = row.original.referralFeeAmount || 0
            const netAmount = amount - referralFee

            const formatted = new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
            }).format(netAmount)

            return <div className="text-right font-medium">{formatted}</div>
        },
    },
    {
        id: "actions",
        header: "進捗",
        cell: ({ row }) => <ActionCell caseData={row.original} />,
    },
]

function ActionCell({ caseData }: { caseData: InheritanceCase }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setShowModal(true)}
            >
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={`${caseData.deceasedName} 様 - 進捗確認`}
                >
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-4">
                            ID: {caseData.id} | 相続開始日: {caseData.dateOfDeath}
                        </div>

                        <div className="border rounded-md divide-y">
                            <div className="grid grid-cols-12 bg-muted/50 p-2 text-xs font-semibold">
                                <div className="col-span-4">工程</div>
                                <div className="col-span-4">完了日</div>
                                <div className="col-span-4">備考</div>
                            </div>
                            {caseData.progress && caseData.progress.length > 0 ? (
                                caseData.progress.map((step) => (
                                    <div key={step.id} className="grid grid-cols-12 p-2 text-sm items-center">
                                        <div className="col-span-4 font-medium">{step.name}</div>
                                        <div className="col-span-4 text-muted-foreground">
                                            {step.date || "-"}
                                        </div>
                                        <div className="col-span-4 text-xs text-muted-foreground truncate">
                                            {step.memo || "-"}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    進捗データがありません
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t gap-2">
                            <Button variant="outline" onClick={() => setShowModal(false)}>
                                閉じる
                            </Button>
                            <Link href={`/${caseData.id}`}>
                                <Button variant="outline">
                                    詳細を編集
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    )
}
