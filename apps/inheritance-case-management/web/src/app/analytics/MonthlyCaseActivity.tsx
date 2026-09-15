"use client"

import Link from "next/link"
import { useCaseKpis } from "@/hooks/use-cases"
import { getThisMonthRange } from "@/app/case-list-utils"

export function MonthlyCaseActivity({ years }: { years: Set<number> }) {
    const fiscalYears = [...years].sort().join(",")
    const { data, isError } = useCaseKpis(fiscalYears ? { fiscalYears } : undefined)
    const { from, to } = getThisMonthRange()
    if (isError) return <p className="text-sm text-red-700">当月の案件集計を取得できませんでした。</p>
    return <section aria-label="当月の案件活動" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <h2 className="text-xs font-medium">当月 <span className="font-normal text-slate-600">（{from.slice(0, 7).replace("-", "年")}月・選択年度が対象）</span></h2>
        <div className="flex items-center gap-3">
            {[
                { label: "当月追加", count: data?.addedThisMonth, start: "caseAddedFrom", end: "caseAddedTo" },
                { label: "当月完了", count: data?.completedThisMonth, start: "caseCompletedFrom", end: "caseCompletedTo" },
            ].map(item => <Link key={item.label} href={`/?${new URLSearchParams({ ...(fiscalYears ? { fiscalYears } : {}), [item.start]: from, [item.end]: to, hideClosed: "false" })}`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <span className="text-xs text-slate-600">{item.label}</span>
                <div className="text-sm font-semibold tabular-nums text-blue-800">{item.count ?? "…"}<span className="ml-1 text-xs font-normal">件 →</span></div>
            </Link>)}
        </div>
    </section>
}
