"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus, AcceptanceStatus } from "@/types/shared"
import { formatCurrency } from "@/lib/analytics-utils"
import { STATUS_STYLES, ACCEPTANCE_STYLES } from "@/types/constants"
import { SortableHeader } from "@/components/ui/SortableHeader"
import Link from "next/link"
import { ProgressModalButton } from "./ProgressModal"

export const columns: ColumnDef<InheritanceCase>[] = [
    {
        accessorKey: "deceasedName",
        header: ({ column }) => <SortableHeader column={column}>被相続人氏名</SortableHeader>,
        cell: ({ row }) => (
            <Link href={`/${row.original.id}`} className="text-blue-600 hover:underline">
                {row.getValue("deceasedName") || "(氏名未入力)"}
            </Link>
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
        cell: ({ row }) => {
            const acceptance = (row.getValue("acceptanceStatus") || "未判定") as AcceptanceStatus
            const style = ACCEPTANCE_STYLES[acceptance]
            return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {acceptance}
                </span>
            )
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>進行</SortableHeader>,
        cell: ({ row }) => {
            const status = row.getValue("status") as CaseStatus
            const style = STATUS_STYLES[status]
            return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {status}
                </span>
            )
        },
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
        cell: ({ row }) => {
            const progress = row.original.progress ?? []
            const total = progress.length
            const completed = progress.filter(s => s.date).length
            const percent = total > 0 ? (completed / total) * 100 : 0

            return (
                <div className="flex items-center gap-2">
                    {total > 0 && (
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-primary'}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {completed}/{total}
                            </span>
                        </div>
                    )}
                    <ProgressModalButton caseData={row.original} />
                </div>
            )
        },
    },
]
