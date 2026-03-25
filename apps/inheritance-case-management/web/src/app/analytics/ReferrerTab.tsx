import { RankingTable } from "./RankingTable"

interface ReferrerTabProps {
    sortedReferrerRanking: { name: string; feeTotal: number; count: number }[]
    referrerSort: { col: string; desc: boolean }
    onSort: (col: string) => void
    sortedCompanyRanking: { name: string; feeTotal: number; count: number }[]
    companySort: { col: string; desc: boolean }
    onCompanySort: (col: string) => void
}

export function ReferrerTab({ sortedReferrerRanking, referrerSort, onSort, sortedCompanyRanking, companySort, onCompanySort }: ReferrerTabProps) {
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
                    />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">紹介者別 実績</h3>
                    <RankingTable
                        data={sortedReferrerRanking}
                        columns={[
                            { label: "紹介者名" },
                            { label: "紹介料合計", align: "right", sortKey: "feeTotal" },
                            { label: "件数", align: "center", sortKey: "count" },
                        ]}
                        onSort={onSort}
                        sortState={referrerSort}
                    />
                </div>
            </div>
        </div>
    )
}
