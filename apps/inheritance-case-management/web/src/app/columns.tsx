"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { InheritanceCase } from "@/types/shared"
import { formatCurrency } from "@/lib/analytics-utils"
import { SortableHeader } from "@/components/ui/SortableHeader"
import Link from "next/link"
import { useState } from "react"
import { Modal } from "@/components/ui/Modal"

export const columns: ColumnDef<InheritanceCase>[] = [
    {
        accessorKey: "deceasedName",
        header: ({ column }) => <SortableHeader column={column}>被相続人氏名</SortableHeader>,
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
        header: ({ column }) => <SortableHeader column={column}>年度</SortableHeader>,
        cell: ({ row }) => {
            return <div className="text-center font-medium">{row.getValue("fiscalYear")}年度</div>
        },
    },
    {
        accessorKey: "dateOfDeath",
        header: ({ column }) => <SortableHeader column={column}>相続開始日</SortableHeader>,
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
        header: ({ column }) => <SortableHeader column={column}>受託</SortableHeader>,
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("acceptanceStatus") || "未判定"}</div>
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>進行</SortableHeader>,
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("status")}</div>
        ),
    },
    {
        accessorKey: "assignee",
        header: ({ column }) => <SortableHeader column={column}>担当者</SortableHeader>,
        cell: ({ row }) => <div>{row.getValue("assignee")}</div>,
    },
    {
        accessorKey: "estimateAmount",
        header: ({ column }) => <SortableHeader column={column} className="text-right">見積額</SortableHeader>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("estimateAmount") || "0")
            const referralFeeRate = row.original.referralFeeRate || 0
            const netAmount = amount * (1 - referralFeeRate / 100)

            return <div className="text-right font-medium">{formatCurrency(netAmount)}</div>
        },
    },
    {
        accessorKey: "feeAmount",
        header: ({ column }) => <SortableHeader column={column} className="text-right">報酬額</SortableHeader>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("feeAmount") || "0")
            const referralFee = row.original.referralFeeAmount || 0
            const netAmount = amount - referralFee

            return <div className="text-right font-medium">{formatCurrency(netAmount)}</div>
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
