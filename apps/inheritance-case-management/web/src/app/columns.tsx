"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus, AcceptanceStatus } from "@/types/shared"
import { formatCurrency, calcNet } from "@/lib/analytics-utils"
import { STATUS_STYLES, ACCEPTANCE_STYLES } from "@/types/constants"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SortableHeader } from "@/components/ui/SortableHeader"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import Link from "next/link"
import { ProgressModalButton } from "./ProgressModal"
import { InlineSummaryCell } from "./InlineSummaryCell"

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
        cell: ({ row }) => (
            <div className="text-center font-medium">{row.getValue("fiscalYear")}年度</div>
        ),
    },
    {
        accessorKey: "dateOfDeath",
        header: ({ column }) => <SortableHeader column={column}>相続開始日</SortableHeader>,
        cell: ({ row }) => (
            <div>{new Date(row.getValue("dateOfDeath")).toLocaleDateString("ja-JP")}</div>
        ),
    },
    {
        id: "declarationDeadline",
        header: () => <span className="inline-flex items-center h-8">申告期限</span>,
        cell: ({ row }) => {
            const deadline = getDeadlineDate(row.getValue("dateOfDeath"))
            const dateStr = deadline.toLocaleDateString("ja-JP")

            if (row.original.status === "完了") {
                return <div className="text-muted-foreground">{dateStr}</div>
            }

            const status = getDeadlineStatus(deadline)
            return (
                <div className={status?.className ?? ""}>
                    {dateStr}
                    {status && (
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${status.badgeClassName}`}>
                            {status.badge}
                        </span>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "acceptanceStatus",
        header: ({ column }) => <SortableHeader column={column}>受託</SortableHeader>,
        cell: ({ row }) => {
            const acceptance = (row.getValue("acceptanceStatus") || "未判定") as AcceptanceStatus
            return <StatusBadge label={acceptance} style={ACCEPTANCE_STYLES[acceptance]} />
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>進行</SortableHeader>,
        cell: ({ row }) => {
            const status = row.getValue("status") as CaseStatus
            return <StatusBadge label={status} style={STATUS_STYLES[status]} />
        },
    },
    {
        id: "assignee",
        header: ({ column }) => <SortableHeader column={column}>担当者</SortableHeader>,
        cell: ({ row }) => <div>{row.original.assignee?.name || ""}</div>,
    },
    {
        accessorKey: "estimateAmount",
        header: ({ column }) => <SortableHeader column={column} className="text-right">見積額</SortableHeader>,
        cell: ({ row }) => (
            <div className="text-right font-medium">{formatCurrency(calcNet(row.original, "estimate"))}</div>
        ),
    },
    {
        accessorKey: "feeAmount",
        header: ({ column }) => <SortableHeader column={column} className="text-right">報酬額</SortableHeader>,
        cell: ({ row }) => (
            <div className="text-right font-medium">{formatCurrency(calcNet(row.original, "fee"))}</div>
        ),
    },
    {
        id: "actions",
        header: () => <span className="inline-flex items-center justify-center h-8 w-full">進捗</span>,
        cell: ({ row }) => {
            const progress = row.original.progress ?? []
            const lastCompleted = [...progress].reverse().find(s => s.date)
            return (
                <div className="flex items-center justify-center gap-1.5">
                    {lastCompleted && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {lastCompleted.name}
                        </span>
                    )}
                    <ProgressModalButton caseData={row.original} />
                </div>
            )
        },
    },
    {
        accessorKey: "summary",
        header: () => <span className="inline-flex items-center h-8">特記事項</span>,
        cell: ({ row }) => <InlineSummaryCell caseData={row.original} />,
    },
]
