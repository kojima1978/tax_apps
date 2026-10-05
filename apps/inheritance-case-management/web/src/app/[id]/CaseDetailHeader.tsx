"use client"

import { ChevronsUpDown } from "lucide-react"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import { formatWareki } from "@/lib/japanese-era"
import { STATUS_STYLES, isCompleted, isHandlingEnded } from "@/types/constants"
import type { CaseStatus, InheritanceCase } from "@/types/shared"

/**
 * 案件詳細の見出し。
 * 一覧の編集ボタンは `?sections=closed` を付けるので、開いた直後はセクションが
 * すべて閉じている。見出しが「案件詳細」だけだと、どの案件を開いているのかが
 * ファーストビューに1つも出ない状態だった（被相続人名はパンくずにしか無い）。
 */
export function CaseDetailHeader({
    formData,
    allOpen,
    onToggleAll,
}: {
    formData: InheritanceCase
    allOpen: boolean
    onToggleAll: () => void
}) {
    const statusStyle = STATUS_STYLES[formData.status as CaseStatus]
    const deadline = formData.dateOfDeath ? getDeadlineDate(formData.dateOfDeath) : null
    const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null
    const ended = isHandlingEnded(formData.status, formData.isUndivided)
    const completed = isCompleted(formData.status)
    const showRemaining = !!deadlineStatus && !ended && !completed

    return (
        <div className="mb-2 border-b pb-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    {formData.deceasedNameKana && (
                        <div className="truncate text-[11px] text-muted-foreground">{formData.deceasedNameKana}</div>
                    )}
                    <h1 className="truncate text-xl font-bold tracking-tight">
                        {formData.deceasedName || "(氏名未入力)"}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">様の案件</span>
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={onToggleAll}
                    className="flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    {allOpen ? "すべて閉じる" : "すべて開く"}
                </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {statusStyle && (
                    <span className={`inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        {formData.status}
                    </span>
                )}
                {deadline && (
                    <span className="inline-flex items-center gap-1">
                        <span className="text-muted-foreground">申告期限</span>
                        <span className={`tabular-nums ${ended ? "text-muted-foreground line-through" : showRemaining ? deadlineStatus.className : ""}`}>
                            {formatWareki(deadline.toISOString().slice(0, 10))}
                        </span>
                        {showRemaining && (
                            <span className={`rounded px-1 py-0.5 font-medium ${deadlineStatus.badgeClassName}`}>{deadlineStatus.badge}</span>
                        )}
                    </span>
                )}
                {formData.isUndivided && (
                    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-muted-foreground">未分割</span>
                )}
                <span className="text-muted-foreground">{formData.fiscalYear}年度</span>
            </div>
        </div>
    )
}
