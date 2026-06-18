"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { InheritanceCase, CaseStatus } from "@/types/shared"
import { formatCurrency, toWareki } from "@/lib/analytics-utils"
import { calcGrossAmount } from "@/lib/case-amount-utils"
import { isHandlingEnded } from "@/types/constants"
import { SortableHeader, SortIcon } from "@/components/ui/SortableHeader"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { ProgressSummary } from "./ProgressSummary"
import { FileText, PencilLine } from "lucide-react"
import { isCompleted } from "@/types/constants"
import { getCaseDetailHrefWithClosedSections } from "@/lib/case-detail-section-state"

interface ColumnOptions {
    amountSort: "asc" | "desc" | null
    toggleAmountSort: () => void
    rowNumberOffset: number
}

function formatCompactWareki(date: string | Date): string {
    return toWareki(date)
        .replace(/^令和/, "R")
        .replace(/^平成/, "H")
        .replace(/^昭和/, "S")
        .replace(/^大正/, "T")
        .replace(/^明治/, "M")
        .replace(/年$/, "")
}

function formatSlashDate(date: string | Date): string {
    const value = new Date(date)
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${value.getFullYear()}/${month}/${day}`
}

// ── Status color bar (left border) ──────────────────────────
const STATUS_BORDER_COLORS: Record<CaseStatus, string> = {
    '見積前': 'border-l-gray-300',
    '見積中': 'border-l-gray-400',
    '見送り': 'border-l-gray-300',
    '受託': 'border-l-gray-500',
    '手続中': 'border-l-gray-600',
    '最終確認': 'border-l-gray-800',
    '申告済': 'border-l-gray-700',
    '請求済': 'border-l-neutral-500',
    '入金済': 'border-l-neutral-700',
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
            <Button variant="ghost" onClick={onToggle} className="h-7 px-1 text-[10px]">
                売上
                <SortIcon direction={sort || false} />
            </Button>
        </div>
    )
}

export function createColumns({ amountSort, toggleAmountSort, rowNumberOffset }: ColumnOptions): ColumnDef<InheritanceCase>[] {
    return [
    // ── 操作列：狭い画面でも常に左端に表示 ─────────────────────
    {
        id: "actions",
        size: 28,
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <Link
                    href={getCaseDetailHrefWithClosedSections(c.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-black/20 bg-white text-black transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${c.deceasedName}様の案件を編集`}
                >
                    <PencilLine className="h-3 w-3" />
                </Link>
            )
        },
    },
    // ── NO列 ──────────────────────────────────────────────────
    {
        id: "rowNumber",
        size: 34,
        header: () => <span className="inline-flex items-center h-8">NO</span>,
        cell: ({ row }) => (
            <div className="text-center text-[10px] text-muted-foreground tabular-nums">
                {rowNumberOffset + row.index + 1}
            </div>
        ),
    },
    // ── 第1列：識別と基本属性 ─────────────────────────────────
    {
        accessorKey: "deceasedName",
        size: 130,
        header: ({ column }) => <SortableHeader column={column}>被相続人</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const borderColor = STATUS_BORDER_COLORS[c.status as CaseStatus] || "border-l-gray-300"
            return (
                <div className={`min-w-0 border-l-3 pl-2 ${borderColor}`}>
                    <div className="min-w-0 leading-tight">
                        {c.deceasedNameKana && (
                            <div className="truncate text-[9px] text-muted-foreground">{c.deceasedNameKana}</div>
                        )}
                        <div className="block truncate text-[11px] font-bold text-foreground">
                            {c.deceasedName || "(氏名未入力)"}
                        </div>
                    </div>
                    {c.isUndivided && (
                        <div className="mt-0.5 flex min-w-0 gap-1 overflow-hidden">
                            <MiniBadge label="未分割" style={{ dot: 'bg-gray-500', bg: 'bg-white', text: 'text-muted-foreground' }} />
                        </div>
                    )}
                </div>
            )
        },
    },
    // ── 第2列：時間管理（デッドライン） ───────────────────────
    {
        accessorKey: "dateOfDeath",
        size: 145,
        header: ({ column }) => <SortableHeader column={column}>日付</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            const deadline = getDeadlineDate(c.dateOfDeath)
            const deadlineDate = `${formatSlashDate(deadline)}(${formatCompactWareki(deadline)})`
            const inheritanceDate = `${formatSlashDate(c.dateOfDeath)}(${formatCompactWareki(c.dateOfDeath)})`
            const ended = isHandlingEnded(c.status, c.isUndivided)
            const completed = isCompleted(c.status)
            const deadlineStatus = getDeadlineStatus(deadline)
            const remainingLabel = ended ? "終了" : completed ? "申告済" : deadlineStatus.badge
            const deadlineClassName = ended
                ? "text-muted-foreground line-through"
                : completed
                    ? "text-foreground"
                    : deadlineStatus.className
            return (
                <div className="space-y-0.5 leading-tight" title="1行目：申告期限、2行目：残り日数と相続開始日">
                    <div className={`grid grid-cols-[34px_minmax(0,1fr)] items-center gap-1 text-[8px] ${deadlineClassName}`}>
                        <span className="truncate font-medium">申告期限</span>
                        <span className="tabular-nums">{deadlineDate}</span>
                    </div>
                    <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-1 text-[8px] text-muted-foreground">
                        <span className={`truncate font-medium ${!ended && !completed ? deadlineStatus.className : ""}`}>{remainingLabel}</span>
                        <span className="tabular-nums">{inheritanceDate}</span>
                    </div>
                </div>
            )
        },
    },
    // ── 第3列：フェーズと詳細進捗 ─────────────────────────────
    {
        accessorKey: "status",
        size: 100,
        header: ({ column }) => <SortableHeader column={column}>進捗</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return <ProgressSummary caseData={c} />
        },
    },
    // ── 第4列：担当・リレーション ──────────────────────────────
    {
        id: "assignee",
        size: 70,
        header: ({ column }) => <SortableHeader column={column}>担当</SortableHeader>,
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-[10px] font-medium text-foreground">
                        {c.assignee?.name || <span className="text-muted-foreground">-</span>}
                    </div>
                    {c.internalReferrer?.name && (
                        <div className="mt-0.5 truncate text-[9px] text-muted-foreground">
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
        size: 85,
        header: () => <AmountSortHeader sort={amountSort} onToggle={toggleAmountSort} />,
        cell: ({ row }) => {
            const c = row.original
            const hasFee = (c.feeAmount || 0) > 0
            const feeGross = calcGrossAmount(c, "fee")
            const estGross = calcGrossAmount(c, "estimate")
            return (
                <div className="leading-tight">
                    {hasFee ? (
                        <>
                            <div className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-1 text-[10px] font-medium text-black">
                                <span className="text-[9px]">確定</span>
                                <span className="whitespace-nowrap text-right tabular-nums">{formatCurrency(feeGross)}</span>
                            </div>
                            {estGross > 0 && (
                                <div className="mt-0.5 grid grid-cols-[20px_minmax(0,1fr)] items-center gap-1 text-[9px] text-muted-foreground">
                                    <span>見込</span>
                                    <span className="whitespace-nowrap text-right tabular-nums">{formatCurrency(estGross)}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-1 text-[10px] font-medium text-foreground">
                            <span className="text-[9px]">見込</span>
                            <span className="whitespace-nowrap text-right tabular-nums">{formatCurrency(estGross)}</span>
                        </div>
                    )}
                </div>
            )
        },
    },
    // ── 第6列：補足と年度 ──────────────────────────────────────
    {
        accessorKey: "summary",
        size: 105,
        header: () => <span className="inline-flex items-center h-8">特記事項</span>,
        cell: ({ row }) => {
            const c = row.original
            const hasMemo = !!c.memo
            return (
                <div className="min-w-0 leading-tight">
                    <div className="whitespace-nowrap text-[10px] font-medium text-foreground">{c.summary || "-"}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span>{c.fiscalYear}年度</span>
                        {hasMemo && <FileText className="h-3 w-3 text-muted-foreground/60" />}
                    </div>
                </div>
            )
        },
    },
    ]
}
