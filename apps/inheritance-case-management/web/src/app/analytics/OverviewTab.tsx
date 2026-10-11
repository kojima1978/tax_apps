import { AnalyticsRules } from "./AnalyticsRules"
import { formatCurrency, fiscalYearWareki } from "@/lib/analytics-utils"
import type { AnnualData } from "@/lib/analytics-utils"
import Link from "next/link"
import { ArrowUpRight, CircleDollarSign, CheckCircle2, Clock3 } from "lucide-react"
import { ANALYTICS_CONFIRMED_STATUSES, ANALYTICS_ESTIMATE_STATUSES, ANALYTICS_STATUS_CSV } from "@/types/constants"
import { appendSelectedYears } from "./drilldown-utils"
import { AnnualComparison } from "./AnnualComparison"

type StatusTableConfig = {
    title: string
    columns: { label: string; highlight?: boolean }[]
    getValues: (d: AnnualData) => number[]
}

const STATUS_TABLES: StatusTableConfig[] = [
    {
        title: "年度別 受託状況内訳",
        columns: [{ label: "受託", highlight: true }, { label: "見送り" }, { label: "見積" }],
        getValues: (d) => [d.acceptanceCounts.accepted, d.acceptanceCounts.rejected, d.acceptanceCounts.undecided],
    },
    {
        title: "年度別 ステータス内訳",
        columns: [{ label: "申告済", highlight: true }, { label: "進行中" }, { label: "受託" }],
        getValues: (d) => [d.statusCounts.completed, d.statusCounts.ongoing, d.statusCounts.notStarted],
    },
]

const SUMMARY_CARDS = [
    { title: "売上の見通し", detail: "確定＋見込", cardClass: "bg-blue-700 text-white", valueClass: "text-2xl font-bold text-white lg:text-3xl", icon: CircleDollarSign, statuses: ANALYTICS_STATUS_CSV },
    { title: "確定売上", detail: "請求済・入金済", cardClass: "border-l-4 border-l-teal-600 bg-white", valueClass: "text-2xl font-bold text-teal-800 lg:text-3xl", icon: CheckCircle2, statuses: ANALYTICS_CONFIRMED_STATUSES.join(",") },
    { title: "見込売上", detail: "受託〜申告済", cardClass: "border-l-4 border-l-amber-500 bg-white", valueClass: "text-2xl font-bold text-amber-900 lg:text-3xl", icon: Clock3, statuses: ANALYTICS_ESTIMATE_STATUSES.join(",") },
] as const

const PERFORMANCE_HEADERS = [
    { title: "売上", detail: "（確定＋見込）" },
    { title: "売上", detail: "（確定）" },
    { title: "売上", detail: "（見込）" },
    { title: "件数", detail: "（確定＋見込）" },
    { title: "平均単価", detail: undefined },
] as const

interface SummaryTotals {
    grandTotalNet: number; grandTotalGross: number; grandCount: number
    salesTotalNet: number; salesTotalGross: number; salesCount: number
    estimateTotalNet: number; estimateTotalGross: number; estimateCount: number
    grandReferralInternal: number; grandReferralExternal: number
    salesReferralInternal: number; salesReferralExternal: number
    estimateReferralInternal: number; estimateReferralExternal: number
}

interface OverviewTabProps {
    summaryTotals: SummaryTotals
    annualData: AnnualData[]
    yearLabel: string
    selectedYears: Set<number>
}

export function OverviewTab({ summaryTotals, annualData, yearLabel, selectedYears }: OverviewTabProps) {
    const s = summaryTotals

    const cardData: { net: number; count: number; gross: number; referralFee: number; refInternal: number; refExternal: number }[] = [
        { net: s.grandTotalNet, count: s.grandCount, gross: s.grandTotalGross, referralFee: s.grandTotalGross - s.grandTotalNet, refInternal: s.grandReferralInternal, refExternal: s.grandReferralExternal },
        { net: s.salesTotalNet, count: s.salesCount, gross: s.salesTotalGross, referralFee: s.salesTotalGross - s.salesTotalNet, refInternal: s.salesReferralInternal, refExternal: s.salesReferralExternal },
        { net: s.estimateTotalNet, count: s.estimateCount, gross: s.estimateTotalGross, referralFee: s.estimateTotalGross - s.estimateTotalNet, refInternal: s.estimateReferralInternal, refExternal: s.estimateReferralExternal },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{yearLabel}の売上サマリー</h2><span className="text-xs text-slate-600">税抜・社外紹介手数料控除後</span></div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {SUMMARY_CARDS.map((card, i) => {
                    const params = new URLSearchParams({ status: card.statuses, hideClosed: "false" })
                    appendSelectedYears(params, selectedYears)
                    return (
                    <div key={card.detail} className={`min-w-0 rounded-xl border p-4 shadow-sm ${card.cardClass}`}>
                        <div className={`mb-3 flex items-start justify-between gap-2 ${i === 0 ? "text-white" : "text-slate-600"}`}>
                            <div><span className="block text-sm font-semibold">{card.title}</span><span className={`mt-1 block text-xs ${i === 0 ? "text-blue-100" : "text-slate-600"}`}>{card.detail}</span></div>
                            <card.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <div className={`${card.valueClass} break-all tabular-nums`}>{formatCurrency(cardData[i].net)}</div>
                            <div className={`text-sm ${i === 0 ? "text-blue-100" : "text-slate-600"}`}>{cardData[i].count} 件</div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <details className={`text-xs ${i === 0 ? "text-blue-100" : "text-slate-600"}`}>
                            <summary className="min-h-11 w-fit cursor-pointer py-3">計算内訳</summary>
                            <div className="space-y-1 pt-2">
                                <p>{i === 2 ? "見積総額" : i === 0 ? "報酬・見積総額" : "報酬総額"}：{formatCurrency(cardData[i].gross)}</p>
                                <p>社外紹介手数料：−{formatCurrency(cardData[i].refExternal)}</p>
                            </div>
                        </details>
                        <Link href={`/?${params}`} className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 ${i === 0 ? "text-white hover:bg-blue-600 focus-visible:ring-white" : "text-blue-800 hover:bg-blue-50 focus-visible:ring-blue-600"}`}>対象案件を見る<ArrowUpRight className="h-4 w-4" /></Link>
                        </div>
                    </div>
                )})}
            </div>
            <AnalyticsRules />
            <AnnualComparison data={annualData} />

            {/* Annual Performance */}
            <div className="space-y-4">
                <h2 className="border-b pb-1.5 text-lg font-semibold">
                    {yearLabel === "全期間" ? "年度別 業績推移" : `${yearLabel} 業績詳細`}
                </h2>
                <p className="text-xs text-slate-600 md:hidden">業績詳細の表は横にスクロールできます。</p>
                <div className="bg-card rounded-lg border shadow-sm overflow-x-auto" role="region" aria-label="年度別業績詳細表・横スクロール可能" tabIndex={0}>
                    <table className="min-w-[680px] w-full text-left text-xs">
                        <caption className="sr-only">{yearLabel}の売上・件数・平均単価</caption>
                        <thead className="bg-muted text-muted-foreground font-medium">
                            <tr>
                                <th className="w-28 p-2">年度</th>
                                {PERFORMANCE_HEADERS.map((header) => (
                                    <th key={`${header.title}-${header.detail || ""}`} className={`p-2 align-middle ${header.title === "件数" ? "text-center" : "text-right"}`}>
                                        <span className="block whitespace-nowrap text-xs">{header.title}</span>
                                        {header.detail && <span className="block whitespace-nowrap text-[11px] font-normal">{header.detail}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {annualData.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-600">選択した年度の案件はありません。</td></tr>}
                            {annualData.map(d => (
                                <tr key={d.year}>
                                    <th scope="row" className="p-2 font-medium">{d.year}年度<span className="ml-1 text-[11px] text-muted-foreground">({fiscalYearWareki(d.year)})</span></th>
                                    <td className="p-2 text-right text-sm font-bold">{formatCurrency(d.feeTotal + d.estimateTotal)}</td>
                                    <td className="p-2 text-right">{formatCurrency(d.feeTotal)}</td>
                                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(d.estimateTotal)}</td>
                                    <td className="p-2 text-center">{d.count}件</td>
                                    <td className="p-2 text-right">{formatCurrency(d.count > 0 ? (d.feeTotal + d.estimateTotal) / d.count : 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Status Breakdown Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {STATUS_TABLES.map((table) => (
                        <div key={table.title} className="bg-card rounded-lg border shadow-sm overflow-hidden">
                            <div className="p-3 bg-muted border-b text-sm font-medium text-muted-foreground">{table.title}</div>
                            <table className="w-full text-center text-xs">
                                <thead className="text-muted-foreground border-b bg-card">
                                    <tr>
                                        <th className="p-2">年度</th>
                                        {table.columns.map((col) => (
                                            <th key={col.label} className={`p-2 ${col.highlight ? "text-foreground font-bold" : "text-muted-foreground"}`}>{col.label}</th>
                                        ))}
                                        <th className="p-2">合計</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {annualData.map(d => {
                                        const values = table.getValues(d)
                                        return (
                                            <tr key={d.year}>
                                                <td className="p-2 font-medium">{d.year}年度<span className="text-muted-foreground text-xs ml-1">({fiscalYearWareki(d.year)})</span></td>
                                                {values.map((v, i) => <td key={i} className="p-2">{v}</td>)}
                                                <td className="p-2 font-bold">{values.reduce((a, b) => a + b, 0)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
