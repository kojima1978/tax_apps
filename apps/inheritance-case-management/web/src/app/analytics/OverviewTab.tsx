import { AnalyticsRules } from "./AnalyticsRules"
import { formatCurrency, fiscalYearWareki } from "@/lib/analytics-utils"
import type { AnnualData } from "@/lib/analytics-utils"

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
    { title: "売上", detail: "（確定＋見込）", cardClass: "bg-white border", valueClass: "text-2xl font-bold text-foreground", isPrimary: true, footnote: "※請求総額" },
    { title: "売上", detail: "（確定）", cardClass: "bg-card border", valueClass: "text-2xl font-bold", footnote: "※請求総額" },
    { title: "売上", detail: "（見込）", cardClass: "bg-card border", valueClass: "text-2xl font-bold", footnote: "※見積総額" },
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
}

export function OverviewTab({ summaryTotals, annualData, yearLabel }: OverviewTabProps) {
    const s = summaryTotals

    const cardData: { net: number; count: number; gross: number; referralFee: number; refInternal: number; refExternal: number }[] = [
        { net: s.grandTotalNet, count: s.grandCount, gross: s.grandTotalGross, referralFee: s.grandTotalGross - s.grandTotalNet, refInternal: s.grandReferralInternal, refExternal: s.grandReferralExternal },
        { net: s.salesTotalNet, count: s.salesCount, gross: s.salesTotalGross, referralFee: s.salesTotalGross - s.salesTotalNet, refInternal: s.salesReferralInternal, refExternal: s.salesReferralExternal },
        { net: s.estimateTotalNet, count: s.estimateCount, gross: s.estimateTotalGross, referralFee: s.estimateTotalGross - s.estimateTotalNet, refInternal: s.estimateReferralInternal, refExternal: s.estimateReferralExternal },
    ]

    return (
        <div className="space-y-4">
            <AnalyticsRules />
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {SUMMARY_CARDS.map((card, i) => (
                    <div key={card.detail} className={`rounded-lg p-4 shadow-sm ${card.cardClass} ${'isPrimary' in card && card.isPrimary ? "relative overflow-hidden" : ""}`}>
                        <div className="mb-1.5 font-medium leading-tight text-muted-foreground">
                            <span className="block text-xs">{card.title}</span>
                            <span className="block text-[10px]">{card.detail}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <div className={card.valueClass}>{formatCurrency(cardData[i].net)}</div>
                            <div className="text-xs text-muted-foreground">/ {cardData[i].count} 件</div>
                        </div>
                        <details className="mt-2 text-xs text-muted-foreground">
                            <summary className="min-h-9 w-fit cursor-pointer py-2">計算内訳</summary>
                            <div className="space-y-1 border-t pt-2">
                                <p>{i === 2 ? "見積総額" : i === 0 ? "報酬・見積総額" : "報酬総額"}：{formatCurrency(cardData[i].gross)}</p>
                                <p>社外紹介手数料：−{formatCurrency(cardData[i].refExternal)}</p>
                            </div>
                        </details>
                    </div>
                ))}
            </div>

            {/* Annual Performance */}
            <div className="space-y-4">
                <h2 className="border-b pb-1.5 text-lg font-semibold">
                    {yearLabel === "全期間" ? "年度別 業績推移" : `${yearLabel} 業績詳細`}
                </h2>
                <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
                    <table className="min-w-[680px] w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-medium">
                            <tr>
                                <th className="w-28 p-2">年度</th>
                                {PERFORMANCE_HEADERS.map((header) => (
                                    <th key={`${header.title}-${header.detail || ""}`} className={`p-2 align-middle ${header.title === "件数" ? "text-center" : "text-right"}`}>
                                        <span className="block whitespace-nowrap text-xs">{header.title}</span>
                                        {header.detail && <span className="block whitespace-nowrap text-[10px] font-normal">{header.detail}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {annualData.map(d => (
                                <tr key={d.year}>
                                    <td className="p-2 font-medium">{d.year}年度<span className="ml-1 text-[10px] text-muted-foreground">({fiscalYearWareki(d.year)})</span></td>
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
