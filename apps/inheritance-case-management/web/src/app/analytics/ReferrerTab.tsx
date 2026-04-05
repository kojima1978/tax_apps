import { RankingTable } from "./RankingTable"

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
    if (selectedYears.size === 1) {
        params.set("fiscalYear", String([...selectedYears][0]))
    }
    return `/?${params.toString()}`
}

export function ReferrerTab({ sortedCompanyRanking, companySort, onCompanySort, selectedYears }: ReferrerTabProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold border-b pb-2">紹介者分析</h2>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">会社別 実績</h3>
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
                        buildHref={(name) => buildCompanyHref(name, selectedYears)}
                    />
                </div>
            </div>
        </div>
    )
}
