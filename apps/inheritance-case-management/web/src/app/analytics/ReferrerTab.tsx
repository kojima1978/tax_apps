import { useMemo } from "react"
import { RankingTable } from "./RankingTable"
import { AnalyticsRules } from "./AnalyticsRules"
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
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                    <h2 className="text-xl font-semibold">外部紹介者</h2>
                    <div className="text-right text-sm font-semibold text-foreground">
                        合計 {formatCurrency(referrerTotal)}
                    </div>
                    <div className="text-center text-sm font-semibold text-foreground">
                        件数 {referrerCountTotal}件
                    </div>
                </div>
                <AnalyticsRules referral />
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
