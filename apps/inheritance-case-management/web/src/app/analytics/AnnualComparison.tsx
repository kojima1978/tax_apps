"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCurrency, type AnnualData } from "@/lib/analytics-utils"
import { ANALYTICS_STATUS_CSV } from "@/types/constants"

export function AnnualComparison({ data }: { data: AnnualData[] }) {
    const [metric, setMetric] = useState<"sales" | "count">("sales")
    const rows = [...data].sort((a, b) => a.year - b.year)
    const max = Math.max(1, ...rows.map(row => metric === "sales" ? Math.max(0, row.feeTotal) + Math.max(0, row.estimateTotal) : row.count))
    return <section aria-labelledby="annual-comparison-heading" className="min-w-0 rounded-xl border bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 id="annual-comparison-heading" className="text-base font-semibold">年度別の比較</h3><p className="mt-1 text-xs text-slate-600">同じ目盛りで比較できます。年度を選ぶと対象案件を開きます。</p></div>
            <div role="group" aria-label="年度比較の指標" className="flex rounded-lg bg-slate-100 p-1">{(["sales", "count"] as const).map(value => <button type="button" key={value} aria-pressed={metric === value} className={`min-h-11 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-600 ${metric === value ? "bg-white text-blue-800 shadow-sm" : "text-slate-600"}`} onClick={() => setMetric(value)}>{value === "sales" ? "売上" : "件数"}</button>)}</div>
        </div>
        {metric === "sales" && <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-teal-600" />確定</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400" />見込</span><span>税抜・社外紹介手数料控除後</span></div>}
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-600">対象年度の案件がありません。年度を変更して確認してください。</p> : <ul className="space-y-4">{rows.map(row => {
            const total = row.feeTotal + row.estimateTotal
            const label = metric === "sales" ? `${formatCurrency(total)}（確定 ${formatCurrency(row.feeTotal)}・見込 ${formatCurrency(row.estimateTotal)}）` : `${row.count}件`
            return <li key={row.year}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm"><Link className="inline-flex min-h-11 items-center rounded px-1 font-semibold text-blue-800 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-blue-600" href={`/?${new URLSearchParams({ fiscalYear: String(row.year), status: ANALYTICS_STATUS_CSV, hideClosed: "false" })}`}>{row.year}年度 →</Link><span className="tabular-nums text-slate-700">{label}</span></div>
                <div className="flex h-5 overflow-hidden rounded bg-slate-100" aria-hidden="true">
                    {metric === "sales" ? <><span className="bg-teal-600" style={{ width: `${Math.max(0, row.feeTotal) / max * 100}%` }} /><span className="bg-amber-400" style={{ width: `${Math.max(0, row.estimateTotal) / max * 100}%` }} /></> : <span className="bg-blue-600" style={{ width: `${row.count / max * 100}%` }} />}
                </div>
            </li>
        })}</ul>}
    </section>
}
