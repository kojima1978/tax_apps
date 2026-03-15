import { formatCurrency } from "@/lib/analytics-utils"
import type { AnnualData } from "@/lib/analytics-utils"

type StatusTableConfig = {
    title: string
    columns: { label: string; highlight?: boolean }[]
    getValues: (d: AnnualData) => number[]
}

const STATUS_TABLES: StatusTableConfig[] = [
    {
        title: "年度別 受託ステータス内訳",
        columns: [{ label: "受託可", highlight: true }, { label: "受託不可" }, { label: "未判定" }],
        getValues: (d) => [d.acceptanceCounts.accepted, d.acceptanceCounts.rejected, d.acceptanceCounts.undecided],
    },
    {
        title: "年度別 進行ステータス内訳",
        columns: [{ label: "完了（税務申告済）", highlight: true }, { label: "手続中" }, { label: "未着手" }],
        getValues: (d) => [d.statusCounts.completed, d.statusCounts.ongoing, d.statusCounts.notStarted],
    },
]

interface SummaryCardDef {
    title: string
    badge: string
    badgeClass: string
    cardClass: string
    valueClass: string
    hasIcon: boolean
    footnote: string
}

const SUMMARY_CARDS: SummaryCardDef[] = [
    { title: "事業総額 (売上 + 見込)", badge: "手取り実額", badgeClass: "bg-primary/10 text-primary", cardClass: "bg-white border-2 border-primary/20", valueClass: "text-3xl font-bold text-primary", hasIcon: true, footnote: "※請求総額" },
    { title: "売上実績 (完了案件)", badge: "手取り実額", badgeClass: "bg-muted text-foreground", cardClass: "bg-card border", valueClass: "text-2xl font-bold", hasIcon: false, footnote: "※請求総額" },
    { title: "見込額 (進行中のみ)", badge: "予測実額", badgeClass: "bg-muted text-foreground", cardClass: "bg-card border", valueClass: "text-2xl font-bold", hasIcon: false, footnote: "※見積総額" },
]

interface SummaryTotals {
    grandTotalNet: number; grandTotalGross: number; grandCount: number
    salesTotalNet: number; salesTotalGross: number; salesCount: number
    estimateTotalNet: number; estimateTotalGross: number; estimateCount: number
}

interface OverviewTabProps {
    summaryTotals: SummaryTotals
    annualData: AnnualData[]
    selectedYear: string
}

export function OverviewTab({ summaryTotals, annualData, selectedYear }: OverviewTabProps) {
    const { grandTotalNet, grandTotalGross, grandCount, salesTotalNet, salesTotalGross, salesCount, estimateTotalNet, estimateTotalGross, estimateCount } = summaryTotals

    const cardData: { net: number; count: number; gross: number }[] = [
        { net: grandTotalNet, count: grandCount, gross: grandTotalGross },
        { net: salesTotalNet, count: salesCount, gross: salesTotalGross },
        { net: estimateTotalNet, count: estimateCount, gross: estimateTotalGross },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SUMMARY_CARDS.map((card, i) => (
                    <div key={card.title} className={`p-6 rounded-lg shadow-sm ${card.cardClass} ${card.hasIcon ? "relative overflow-hidden" : ""}`}>
                        {card.hasIcon && (
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                            </div>
                        )}
                        <div className="text-sm font-medium text-muted-foreground mb-2">{card.title} <span className={`text-xs ${card.badgeClass} px-1 rounded`}>{card.badge}</span></div>
                        <div className="flex items-baseline gap-2">
                            <div className={card.valueClass}>{formatCurrency(cardData[i].net)}</div>
                            <div className="text-sm text-muted-foreground">/ {cardData[i].count} 件</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">{card.footnote}: {formatCurrency(cardData[i].gross)}</div>
                    </div>
                ))}
            </div>

            {/* Annual Performance */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">
                    {selectedYear === "all" ? "年度別 業績推移" : `${selectedYear}年度 業績詳細`}
                </h2>
                <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[500px]">
                        <thead className="bg-muted text-muted-foreground font-medium">
                            <tr>
                                <th className="p-3 w-32">年度</th>
                                <th className="p-3 text-right">売上実績 (手取り実額)</th>
                                <th className="p-3 text-right">見込額 (手取り実額)</th>
                                <th className="p-3 text-center">件数（完了＋手続中）</th>
                                <th className="p-3 text-right">平均単価</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {annualData.map(d => (
                                <tr key={d.year}>
                                    <td className="p-3 font-medium">{d.year}年度</td>
                                    <td className="p-3 text-right font-bold text-base">{formatCurrency(d.feeTotal)}</td>
                                    <td className="p-3 text-right text-muted-foreground">{formatCurrency(d.estimateTotal)}</td>
                                    <td className="p-3 text-center">{d.count}件</td>
                                    <td className="p-3 text-right">{formatCurrency(d.count > 0 ? (d.feeTotal + d.estimateTotal) / d.count : 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Status Breakdown Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    {STATUS_TABLES.map((table) => (
                        <div key={table.title} className="bg-card rounded-lg border shadow-sm overflow-hidden">
                            <div className="p-3 bg-muted border-b text-sm font-medium text-muted-foreground">{table.title}</div>
                            <table className="w-full text-sm text-center">
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
                                                <td className="p-2 font-medium">{d.year}年度</td>
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
