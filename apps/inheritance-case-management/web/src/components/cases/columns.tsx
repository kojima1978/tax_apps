"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus, AcceptanceStatus, HandlingStatus } from "@/types/shared"
import { formatCurrency, formatDateWithWareki, calcNet, toWareki } from "@/lib/analytics-utils"
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
}

// ── Status color bar (left border) ──────────────────────────
const STATUS_BORDER_COLORS: Record<CaseStatus, string> = {
    '未着手': 'border-l-gray-400',
    '手続中': 'border-l-blue-500',
    '申告済': 'border-l-green-500',
    '請求済': 'border-l-orange-500',
    '入金済': 'border-l-purple-500',
}

// ── Mini badge for stacked cells ─────────────────────────────
function MiniBadge({ label, style }: { label: string; style: { dot: string; bg: string; text: string } }) {
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
            <span className={`h-1 w-1 rounded-full ${style.dot}`} />
            {label}
        </span>
    )
}

// ── Amount sort header ───────────────────────────────────────
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

export function createColumns({ amountSort, toggleAmountSort }: ColumnOptions): ColumnDef<InheritanceCase>[] {
    return [
    // ── 第1列：識別と基本属性 ─────────────────────────────────
    {
        accessorKey: "deceasedName",
        header: ({ column }) => <SortableHeader column={column}>被相続人</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const handlingStatus = (c.handlingStatus || "対応中") as HandlingStatus
            const acceptanceStatus = (c.acceptanceStatus || "未判定") as AcceptanceStatus
            const borderColor = STATUS_BORDER_COLORS[c.status as CaseStatus] || "border-l-gray-300"
            return (
                <div className={`border-l-3 pl-2 ${borderColor}`}>
                    <div className="font-bold">
                        <Link href={`/${c.id}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                            {c.deceasedName || "(氏名未入力)"}
                        </Link>
                    </div>
                    <div className="flex gap-1 mt-0.5">
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
        header: ({ column }) => <SortableHeader column={column}>期限</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const deadline = getDeadlineDate(c.dateOfDeath)
            const dateStr = `${deadline.toLocaleDateString("ja-JP")}（${toWareki(deadline)}）`

            if (c.handlingStatus === "対応終了") {
                return (
                    <div>
                        <div className="text-muted-foreground line-through text-sm">{dateStr}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDateWithWareki(c.dateOfDeath)}
                        </div>
                    </div>
                )
            }
            if (isCompleted(c.status)) {
                return (
                    <div>
                        <div className="text-sm">
                            <span className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs mr-1">申告済</span>
                            {dateStr}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDateWithWareki(c.dateOfDeath)}
                        </div>
                    </div>
                )
            }

            const status = getDeadlineStatus(deadline)
            return (
                <div>
                    <div className={`text-sm ${status.className}`}>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs mr-1 ${status.badgeClassName}`}>{status.badge}</span>
                        {dateStr}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateWithWareki(c.dateOfDeath)}
                    </div>
                </div>
            )
        },
    },
    // ── 第3列：フェーズと詳細進捗 ─────────────────────────────
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>進捗</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <div>
                    <div>
                        <StatusBadge label={c.status} style={STATUS_STYLES[c.status as CaseStatus]} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
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
        header: ({ column }) => <SortableHeader column={column}>担当</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <div>
                    <div className="text-sm text-blue-700 font-medium">
                        {c.assignee?.name || <span className="text-muted-foreground">-</span>}
                    </div>
                    {c.internalReferrer?.name && (
                        <div className="text-xs text-orange-600 mt-0.5">
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
        header: () => <AmountSortHeader sort={amountSort} onToggle={toggleAmountSort} />,
        cell: ({ row }) => {
            const c = row.original
            const hasFee = (c.feeAmount || 0) > 0
            const feeNet = calcNet(c, "fee")
            const estNet = calcNet(c, "estimate")
            return (
                <div className="text-right">
                    {hasFee ? (
                        <>
                            <div className="text-sm font-medium text-green-700">
                                <span className="text-[10px] mr-0.5">確定</span>
                                {formatCurrency(feeNet)}
                            </div>
                            {estNet > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    <span className="text-[10px] mr-0.5">見込</span>
                                    {formatCurrency(estNet)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm font-medium text-blue-700">
                            <span className="text-[10px] mr-0.5">見込</span>
                            {formatCurrency(estNet)}
                        </div>
                    )}
                </div>
            )
        },
    },
    // ── 第6列：補足と年度 ──────────────────────────────────────
    {
        accessorKey: "summary",
        header: () => <span className="inline-flex items-center h-8">補足</span>,
        cell: ({ row }) => {
            const c = row.original
            const hasMemo = !!c.memo
            return (
                <div>
                    <div><InlineSummaryCell caseData={c} /></div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <span>{c.fiscalYear}年度</span>
                        {hasMemo && <FileText className="h-3 w-3 text-muted-foreground/60" />}
                    </div>
                </div>
            )
        },
    },
    ]
}
