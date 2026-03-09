"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase } from "@/types/shared"
import { formatCurrency } from "@/lib/analytics-utils"
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
        cell: ({ row }) => <ProgressModalButton caseData={row.original} />,
    },
]
