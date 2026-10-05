"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { CaseListItem, CaseStatus } from "@/types/shared"
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
    selectedIds: Set<number>
    onToggleSelected: (id: number) => void
    allSelected: boolean
    onToggleAll: () => void
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

// ── Status color bar (left border) ────────────────────────
// グレー9段階は隣り合う段階を肉眼で区別できず、さらに「見積前」と「見送り」が同じ色で
// 全く同じ表示だった。読み取れる粒度まで粗くして「受託前 / 進行中 / 完了」の3段階にまとめ、
// 打ち切った「見送り」だけ破線で別扱いにする。
//
// Tailwind の border-l-* は使えない。globals.css の
// `:where(.case-workspace) :where([class*="border"]) { border-color: #e2e8f0 }` が
// レイヤの外側にあるため、@layer utilities の Tailwind ユーティリティを
// 詳細度に関係なく上書きする（実測: どのステータスも slate-200 で描かれていた）。
type StatusBorder = { color: string; style: 'solid' | 'dashed' }

const STATUS_BORDER_BEFORE: StatusBorder = { color: '#cbd5e1', style: 'solid' }
const STATUS_BORDER_ONGOING: StatusBorder = { color: '#475569', style: 'solid' }
const STATUS_BORDER_DONE: StatusBorder = { color: '#0f172a', style: 'solid' }
const STATUS_BORDER_DECLINED: StatusBorder = { color: '#94a3b8', style: 'dashed' }

const STATUS_BORDERS: Record<CaseStatus, StatusBorder> = {
    '見積前': STATUS_BORDER_BEFORE,
    '見積中': STATUS_BORDER_BEFORE,
    '見送り': STATUS_BORDER_DECLINED,
    '受託': STATUS_BORDER_ONGOING,
    '手続中': STATUS_BORDER_ONGOING,
    '最終確認': STATUS_BORDER_ONGOING,
    '申告済': STATUS_BORDER_DONE,
    '請求済': STATUS_BORDER_DONE,
    '入金済': STATUS_BORDER_DONE,
}

// ── Mini badge for stacked cells ─────────────────────────────
function MiniBadge({ label, style }: { label: string; style: { dot: string; bg: string; text: string } }) {
    return (
        <span className={`inline-flex max-w-[92px] items-center gap-1 truncate rounded-full border border-black/10 px-1.5 py-0.5 text-[11px] font-medium leading-none ${style.bg} ${style.text}`}>
            <span className={`h-1 w-1 rounded-full ${style.dot}`} />
            <span className="truncate">{label}</span>
        </span>
    )
}

// ── Amount sort header ───────────────────────────────────────
function AmountSortHeader({ sort, onToggle }: { sort: "asc" | "desc" | null; onToggle: () => void }) {
    return (
        <div className="flex justify-end">
            <Button
                variant="ghost"
                onClick={onToggle}
                className="h-10 px-2 text-xs"
                aria-label={`売上で並べ替え${sort ? `（${sort === "asc" ? "昇順" : "降順"}）` : ""}`}
            >
                売上
                <SortIcon direction={sort || false} />
            </Button>
        </div>
    )
}

export function createColumns({ amountSort, toggleAmountSort, rowNumberOffset, selectedIds, onToggleSelected, allSelected, onToggleAll }: ColumnOptions): ColumnDef<CaseListItem>[] {
    return [
    {
        id: "select", size: 32,
        header: () => <label className="flex min-h-11 min-w-9 items-center justify-center"><input type="checkbox" aria-label="このページの案件をすべて選択" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 accent-blue-700" /></label>,
        cell: ({ row }) => <label className="flex min-h-11 min-w-9 items-center justify-center"><input type="checkbox" aria-label={`${row.original.deceasedName}様の案件を選択`} checked={selectedIds.has(row.original.id)} onChange={() => onToggleSelected(row.original.id)} className="h-4 w-4 accent-blue-700" /></label>,
    },
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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/20 bg-white text-black transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${c.deceasedName}様の案件を編集`}
                >
                    <PencilLine className="h-4 w-4" />
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
            <div className="text-center text-xs text-muted-foreground tabular-nums">
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
            const border = STATUS_BORDERS[c.status as CaseStatus] || STATUS_BORDER_BEFORE
            return (
                <div
                    className="min-w-0 pl-2"
                    style={{ borderLeftWidth: 3, borderLeftColor: border.color, borderLeftStyle: border.style }}
                >
                    <div className="min-w-0 leading-tight">
                        {c.deceasedNameKana && (
                            <div className="truncate text-[11px] text-muted-foreground">{c.deceasedNameKana}</div>
                        )}
                        <div className="block truncate text-sm font-bold text-foreground">
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
        size: 190,
        header: ({ column }) => <SortableHeader column={column}>申告期限</SortableHeader>,
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
            // 以前は各行が何の日付かを title 属性でしか説明していなかった。
            // 行の意味は見出しラベルで示し、残り日数は日付の後ろへ回す。
            return (
                    <div className="space-y-1 leading-tight">
                    <div className={`grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1 text-[11px] ${deadlineClassName}`}>
                        <span className="whitespace-nowrap text-[11px] font-normal text-muted-foreground">期限</span>
                        <span className="flex items-center gap-1">
                            <span className="tabular-nums">{deadlineDate}</span>
                            <span className={`shrink-0 rounded px-1 py-0.5 text-[11px] font-medium ${!ended && !completed ? deadlineStatus.badgeClassName : "text-slate-600"}`}>{remainingLabel}</span>
                        </span>
                    </div>
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="whitespace-nowrap text-[11px]">相続開始</span>
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
                    <div className="truncate text-xs font-medium text-foreground">
                        <span className="mr-1 text-[11px] text-slate-500">担当</span>{c.assignee?.name || <span className="text-muted-foreground">-</span>}
                    </div>
                    {c.internalReferrer?.name && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            <span className="mr-1 text-[11px]">紹介</span>{c.internalReferrer.name}
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
                            <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-1 text-xs font-medium text-black">
                                <span className="text-[11px]">確定</span>
                                <span className="whitespace-nowrap text-right tabular-nums">{formatCurrency(feeGross)}</span>
                            </div>
                            {estGross > 0 && (
                                <div className="mt-0.5 grid grid-cols-[28px_minmax(0,1fr)] items-center gap-1 text-[11px] text-muted-foreground">
                                    <span>見込</span>
                                    <span className="whitespace-nowrap text-right tabular-nums">{formatCurrency(estGross)}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-1 text-xs font-medium text-foreground">
                            <span className="text-[11px]">見込</span>
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
            const hasMemo = c.hasMemo
            return (
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-xs font-medium text-foreground" title={c.summary || undefined}>{c.summary || "-"}</div>
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
