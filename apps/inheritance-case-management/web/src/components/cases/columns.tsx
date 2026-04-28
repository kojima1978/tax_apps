"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus, AcceptanceStatus, HandlingStatus } from "@/types/shared"
import { formatCurrency, formatDateWithWareki, toWareki } from "@/lib/analytics-utils"
import { calcGrossAmount } from "@/lib/case-amount-utils"
import { STATUS_STYLES, HANDLING_STATUS_STYLES, ACCEPTANCE_STYLES } from "@/types/constants"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SortableHeader, SortIcon } from "@/components/ui/SortableHeader"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { ProgressModalButton } from "./ProgressModal"
import { ProgressDots } from "./ProgressDots"
import { InlineSummaryCell } from "./InlineSummaryCell"
import { FileText } from "lucide-react"
import { isCompleted } from "@/types/constants"

interface ColumnOptions {
    amountSort: "asc" | "desc" | null
    toggleAmountSort: () => void
    rowNumberOffset: number
}

// ── Status color bar (left border) ──────────────────────────
const STATUS_BORDER_COLORS: Record<CaseStatus, string> = {
    '未着手': 'border-l-gray-400',
    '手続中': 'border-l-gray-500',
    '申告済': 'border-l-gray-600',
    '請求済': 'border-l-neutral-500',
    '入金済': 'border-l-neutral-600',
}

// ── Mini badge for stacked cells ─────────────────────────────
function MiniBadge({ label, style }: { label: string; style: { dot: string; bg: string; text: string } }) {
    return (
        <span className={`inline-flex max-w-[92px] items-center gap-1 truncate rounded-full border border-black/10 px-1.5 py-0.5 text-[10px] font-medium leading-none ${style.bg} ${style.text}`}>
            <span className={`h-1 w-1 rounded-full ${style.dot}`} />
            <span className="truncate">{label}</span>
        </span>
    )
}

// ── Amount sort header ───────────────────────────────────────
function AmountSortHeader({ sort, onToggle }: { sort: "asc" | "desc" | null; onToggle: () => void }) {
    return (
        <div className="flex justify-end">
            <Button variant="ghost" onClick={onToggle} className="h-7 px-1.5 text-[11px]">
                売上
                <SortIcon direction={sort || false} />
            </Button>
        </div>
    )
}

export function createColumns({ amountSort, toggleAmountSort, rowNumberOffset }: ColumnOptions): ColumnDef<InheritanceCase>[] {
    return [
    // ── NO列 ──────────────────────────────────────────────────
    {
        id: "rowNumber",
        size: 42,
        header: () => <span className="inline-flex items-center h-8">NO</span>,
        cell: ({ row }) => (
            <div className="text-center text-[11px] text-muted-foreground tabular-nums">
                {rowNumberOffset + row.index + 1}
            </div>
        ),
    },
    // ── 第1列：識別と基本属性 ─────────────────────────────────
    {
        accessorKey: "deceasedName",
        size: 210,
        header: ({ column }) => <SortableHeader column={column}>被相続人</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const handlingStatus = (c.handlingStatus || "対応中") as HandlingStatus
            const acceptanceStatus = (c.acceptanceStatus || "未判定") as AcceptanceStatus
            const borderColor = STATUS_BORDER_COLORS[c.status as CaseStatus] || "border-l-gray-300"
            return (
                <div className={`min-w-0 border-l-3 pl-2 ${borderColor}`}>
                    <div className="min-w-0 font-bold leading-tight">
                        <Link href={`/${c.id}`} className="block truncate text-[13px] text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                            {c.deceasedName || "(氏名未入力)"}
                        </Link>
                    </div>
                    <div className="mt-0.5 flex min-w-0 gap-1 overflow-hidden">
                        <MiniBadge label={handlingStatus} style={HANDLING_STATUS_STYLES[handlingStatus]} />
                        <MiniBadge label={acceptanceStatus} style={ACCEPTANCE_STYLES[acceptanceStatus]} />
                    </div>
                </div>
            )
        },
    },
    // ── 第2列：時間管理（デッドライン） ───────────────────────
    {
        accessorKey: "dateOfDeath",
        size: 210,
        header: ({ column }) => <SortableHeader column={column}>期限</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const deadline = getDeadlineDate(c.dateOfDeath)
            const dateStr = `${deadline.toLocaleDateString("ja-JP")}（${toWareki(deadline)}）`

            if (c.handlingStatus && c.handlingStatus !== "対応中") {
                return (
                    <div className="leading-tight">
                        <div className="truncate text-xs text-muted-foreground line-through">{dateStr}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {formatDateWithWareki(c.dateOfDeath)}
                        </div>
                    </div>
                )
            }
            if (isCompleted(c.status)) {
                return (
                    <div className="leading-tight">
                        <div className="truncate text-xs">
                            <span className="mr-1 rounded-full bg-white border border-black/10 px-1.5 py-0.5 text-[11px] text-black">申告済</span>
                            {dateStr}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {formatDateWithWareki(c.dateOfDeath)}
                        </div>
                    </div>
                )
            }

            const status = getDeadlineStatus(deadline)
            return (
                <div className="leading-tight">
                    <div className={`truncate text-xs ${status.className}`}>
                        <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] ${status.badgeClassName}`}>{status.badge}</span>
                        {dateStr}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {formatDateWithWareki(c.dateOfDeath)}
                    </div>
                </div>
            )
        },
    },
    // ── 第3列：フェーズと詳細進捗 ─────────────────────────────
    {
        accessorKey: "status",
        size: 130,
        header: ({ column }) => <SortableHeader column={column}>進捗</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="leading-tight">
                    <div>
                        <StatusBadge label={c.status} style={STATUS_STYLES[c.status as CaseStatus]} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                        <ProgressDots caseData={c} />
                        <ProgressModalButton caseData={c} />
                    </div>
                </div>
            )
        },
    },
    // ── 第4列：担当・リレーション ──────────────────────────────
    {
        id: "assignee",
        size: 135,
        header: ({ column }) => <SortableHeader column={column}>担当</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-xs font-medium text-foreground">
                        {c.assignee?.name || <span className="text-muted-foreground">-</span>}
                    </div>
                    {c.internalReferrer?.name && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {c.internalReferrer.name}
                        </div>
                    )}
                </div>
            )
        },
    },
    // ── 第5列：報酬・売上管理 ──────────────────────────────────
    {
        id: "amount",
        size: 145,
        header: () => <AmountSortHeader sort={amountSort} onToggle={toggleAmountSort} />,
        cell: ({ row }) => {
            const c = row.original
            const hasFee = (c.feeAmount || 0) > 0
            const feeGross = calcGrossAmount(c, "fee")
            const estGross = calcGrossAmount(c, "estimate")
            return (
                <div className="text-right leading-tight">
                    {hasFee ? (
                        <>
                            <div className="text-xs font-medium text-black">
                                <span className="text-[10px] mr-0.5">確定</span>
                                {formatCurrency(feeGross)}
                            </div>
                            {estGross > 0 && (
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                    <span className="text-[10px] mr-0.5">見込</span>
                                    {formatCurrency(estGross)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-xs font-medium text-foreground">
                            <span className="text-[10px] mr-0.5">見込</span>
                            {formatCurrency(estGross)}
                        </div>
                    )}
                </div>
            )
        },
    },
    // ── 第6列：補足と年度 ──────────────────────────────────────
    {
        accessorKey: "summary",
        size: 140,
        header: () => <span className="inline-flex items-center h-8">補足</span>,
        cell: ({ row }) => {
            const c = row.original
            const hasMemo = !!c.memo
            return (
                <div className="min-w-0 leading-tight">
                    <div><InlineSummaryCell caseData={c} /></div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>{c.fiscalYear}年度</span>
                        {hasMemo && <FileText className="h-3 w-3 text-muted-foreground/60" />}
                    </div>
                </div>
            )
        },
    },
    ]
}
