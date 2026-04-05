"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus, AcceptanceStatus, HandlingStatus } from "@/types/shared"
import { formatCurrency, formatDateWithWareki, calcBestNet, toWareki } from "@/lib/analytics-utils"
import { STATUS_STYLES, HANDLING_STATUS_STYLES, ACCEPTANCE_STYLES, MAX_SUMMARY_LENGTH, isCompleted } from "@/types/constants"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SortableHeader, SortIcon } from "@/components/ui/SortableHeader"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { ProgressModalButton } from "./ProgressModal"
import { InlineSummaryCell } from "./InlineSummaryCell"

interface ColumnOptions {
    amountSort: "asc" | "desc" | null
    toggleAmountSort: () => void
    queryAssigneeId?: number
    queryInternalReferrerId?: number
    queryStaffId?: number
}

// ── Cell factory helpers ──────────────────────────────────

function statusCell<T extends string>(
    getValue: (row: InheritanceCase) => T,
    styleMap: Record<T, { bg: string; text: string }>,
) {
    return ({ row }: { row: { original: InheritanceCase; getValue: (key: string) => unknown } }) => {
        const value = getValue(row.original)
        return <StatusBadge label={value} style={styleMap[value]} />
    }
}

function AmountSortHeader({ sort, onToggle }: { sort: "asc" | "desc" | null; onToggle: () => void }) {
    return (
        <div className="flex justify-end">
            <Button variant="ghost" onClick={onToggle} className="h-8 text-xs px-2">
                売上
                <SortIcon direction={sort || false} />
            </Button>
        </div>
    )
}

export function createColumns({ amountSort, toggleAmountSort, queryAssigneeId, queryInternalReferrerId, queryStaffId }: ColumnOptions): ColumnDef<InheritanceCase>[] {
    const showRoleColumn = queryAssigneeId || queryInternalReferrerId || queryStaffId
    return [
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
        cell: ({ row }) => <div>{formatDateWithWareki(row.getValue("dateOfDeath"))}</div>,
    },
    {
        id: "declarationDeadline",
        header: () => <span className="inline-flex items-center h-8">申告期限</span>,
        cell: ({ row }) => {
            const deadline = getDeadlineDate(row.getValue("dateOfDeath"))
            const dateStr = `${deadline.toLocaleDateString("ja-JP")}（${toWareki(deadline)}）`

            if (row.original.handlingStatus === "対応終了") {
                return (
                    <div className="text-muted-foreground">
                        <div className="text-xs mb-0.5 line-through">対応終了</div>
                        <div className="line-through">{dateStr}</div>
                    </div>
                )
            }
            if (isCompleted(row.original.status)) {
                return (
                    <div className="text-muted-foreground">
                        <div className="text-xs mb-0.5"><span className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">申告済</span></div>
                        <div>{dateStr}</div>
                    </div>
                )
            }

            const status = getDeadlineStatus(deadline)
            return (
                <div className={status.className}>
                    <div className="text-xs mb-0.5"><span className={`px-1.5 py-0.5 rounded-full ${status.badgeClassName}`}>{status.badge}</span></div>
                    <div>{dateStr}</div>
                </div>
            )
        },
    },
    {
        accessorKey: "acceptanceStatus",
        header: ({ column }) => <SortableHeader column={column}>受託</SortableHeader>,
        cell: statusCell(
            (c) => (c.acceptanceStatus || "未判定") as AcceptanceStatus,
            ACCEPTANCE_STYLES,
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>進み具合</SortableHeader>,
        cell: statusCell(
            (c) => c.status as CaseStatus,
            STATUS_STYLES,
        ),
    },
    {
        accessorKey: "handlingStatus",
        header: ({ column }) => <SortableHeader column={column}>対応状況</SortableHeader>,
        cell: statusCell(
            (c) => (c.handlingStatus || "対応中") as HandlingStatus,
            HANDLING_STATUS_STYLES,
        ),
    },
    {
        id: "assignee",
        header: ({ column }) => <SortableHeader column={column}>担当者</SortableHeader>,
        cell: ({ row }) => <div>{row.original.assignee?.name || ""}</div>,
    },
    ...(showRoleColumn ? [{
        id: "role",
        header: () => <span className="inline-flex items-center h-8">役割</span>,
        cell: ({ row }: { row: { original: InheritanceCase } }) => {
            const c = row.original
            const targetId = queryStaffId || queryAssigneeId
            const isAssigned = targetId && c.assigneeId === targetId
            const isReferrer = queryInternalReferrerId
                ? c.internalReferrerId === queryInternalReferrerId
                : targetId && c.internalReferrerId === targetId
            return (
                <div className="flex gap-1">
                    {isAssigned && <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">担当</span>}
                    {isReferrer && <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700">紹介</span>}
                </div>
            )
        },
    } as ColumnDef<InheritanceCase>] : []),
    {
        id: "amount",
        header: () => <AmountSortHeader sort={amountSort} onToggle={toggleAmountSort} />,
        cell: ({ row }) => {
            const c = row.original
            const hasFee = (c.feeAmount || 0) > 0
            const amount = calcBestNet(c)
            return (
                <div className="text-right font-medium">
                    <div className={`text-xs mb-0.5 ${hasFee ? "text-green-700" : "text-blue-700"}`}>
                        {hasFee ? "確定" : "見込"}
                    </div>
                    <div>{formatCurrency(amount)}</div>
                </div>
            )
        },
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
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
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
        header: () => <span className="inline-flex items-center h-8">特記事項（{MAX_SUMMARY_LENGTH}文字まで）</span>,
        cell: ({ row }) => <InlineSummaryCell caseData={row.original} />,
    },
    ]
}
