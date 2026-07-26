"use client"

import Link from "next/link"
import { CalendarClock, ChevronRight, CircleDollarSign, UserRound } from "lucide-react"
import type { CaseListItem } from "@/types/shared"
import { calcBestGrossAmount } from "@/lib/case-amount-utils"
import { formatCurrency } from "@/lib/analytics-utils"
import { getDeadlineDate, getDeadlineStatus } from "@/lib/deadline-utils"
import { getCaseDetailHrefWithClosedSections } from "@/lib/case-detail-section-state"
import { isHandlingEnded } from "@/types/constants"

interface CaseMobileListProps {
    data: CaseListItem[]
}

function formatDate(date: string | Date): string {
    const value = new Date(date)
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${value.getFullYear()}/${month}/${day}`
}

export function CaseMobileList({ data }: CaseMobileListProps) {
    return (
        <ul className="space-y-2 md:hidden" aria-label="案件一覧">
            {data.map((caseItem) => {
                const deadline = getDeadlineDate(caseItem.dateOfDeath)
                const deadlineStatus = getDeadlineStatus(deadline)
                const isEnded = isHandlingEnded(caseItem.status, caseItem.isUndivided)

                return (
                    <li key={caseItem.id}>
                        <Link
                            href={getCaseDetailHrefWithClosedSections(caseItem.id)}
                            aria-label={`${caseItem.deceasedName}様の案件詳細を開く`}
                            className={`block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isEnded ? "opacity-65" : ""}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    {caseItem.deceasedNameKana && (
                                        <p className="truncate text-xs text-muted-foreground">{caseItem.deceasedNameKana}</p>
                                    )}
                                    <p className="truncate text-base font-bold">{caseItem.deceasedName}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="rounded-full border bg-muted px-2 py-1 text-xs font-medium">
                                        {caseItem.status}
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                </div>
                            </div>

                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div>
                                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                                        申告期限
                                    </dt>
                                    <dd className={`mt-1 font-medium tabular-nums ${isEnded ? "text-muted-foreground" : deadlineStatus.className}`}>
                                        {formatDate(deadline)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <UserRound className="h-4 w-4" aria-hidden="true" />
                                        担当
                                    </dt>
                                    <dd className="mt-1 truncate font-medium">{caseItem.assignee?.name || "未設定"}</dd>
                                </div>
                                <div>
                                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                                        売上
                                    </dt>
                                    <dd className="mt-1 font-medium tabular-nums">{formatCurrency(calcBestGrossAmount(caseItem))}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">年度・特記事項</dt>
                                    <dd className="mt-1 truncate font-medium">{caseItem.fiscalYear}年度・{caseItem.summary || "なし"}</dd>
                                </div>
                            </dl>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
