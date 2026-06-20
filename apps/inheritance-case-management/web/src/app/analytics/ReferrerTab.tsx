import { useMemo } from "react"
import { RankingTable } from "./RankingTable"
import { formatCurrency } from "@/lib/analytics-utils"
import { appendAnalyticsStatuses, appendSelectedYears } from "./drilldown-utils"

interface ReferrerTabProps {
    sortedCompanyRanking: { name: string; feeTotal: number; count: number; departments?: { name: string; feeTotal: number; count: number }[] }[]
    companySort: { col: string; desc: boolean }
    onCompanySort: (col: string) => void
    selectedYears: Set<number>
}

function buildCompanyHref(companyName: string, selectedYears: Set<number>): string {
    const params = new URLSearchParams()
    if (companyName === "なし") {
        params.set("noReferrer", "true")
    } else {
        params.set("referrerCompany", companyName)
    }
    appendAnalyticsStatuses(params)
    appendSelectedYears(params, selectedYears)
    return `/?${params.toString()}`
}

export function ReferrerTab({ sortedCompanyRanking, companySort, onCompanySort, selectedYears }: ReferrerTabProps) {
    const referrerTotal = useMemo(
        () => sortedCompanyRanking.reduce((sum, row) => sum + row.feeTotal, 0),
        [sortedCompanyRanking],
    )
    const referrerCountTotal = useMemo(
        () => sortedCompanyRanking.reduce((sum, row) => sum + row.count, 0),
        [sortedCompanyRanking],
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,180px)_minmax(56px,80px)] items-end gap-3 border-b pb-2">
                    <h2 className="text-xl font-semibold">外部紹介者</h2>
                    <div className="text-right text-sm font-semibold text-foreground">
                        合計 {formatCurrency(referrerTotal)}
                    </div>
                    <div className="text-center text-sm font-semibold text-foreground">
                        件数 {referrerCountTotal}件
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-black" />確定 = 請求済・入金済の確定報酬額</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-black/60" />見込 = 受託〜申告済の見積額</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />見積前・見積中・見送りは集計対象外</span>
                </div>
                <div className="space-y-2">
                    <RankingTable
                        data={sortedCompanyRanking}
                        columns={[
                            { label: "会社名" },
                            { label: "紹介料合計", align: "right", sortKey: "feeTotal" },
                            { label: "件数", align: "center", sortKey: "count" },
                        ]}
                        onSort={onCompanySort}
                        sortState={companySort}
                        showSubRows
                        showBreakdown
                        buildHref={(name) => buildCompanyHref(name, selectedYears)}
                    />
                </div>
            </div>
        </div>
    )
}
