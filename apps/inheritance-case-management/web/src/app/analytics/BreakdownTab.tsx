import { RankingTable } from "./RankingTable"

interface BreakdownTabProps {
    departmentTotals: { name: string; feeTotal: number; count: number }[]
    assigneeRanking: { name: string; feeTotal: number; count: number }[]
}

export function BreakdownTab({ departmentTotals, assigneeRanking }: BreakdownTabProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold border-b pb-2">内訳分析</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">部門別 合計</h3>
                        <RankingTable
                            data={departmentTotals}
                            columns={[
                                { label: "部門名" },
                                { label: "合計 (手取り・見込含)", align: "right" },
                                { label: "件数", align: "center" },
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">担当者別 合計</h3>
                        <RankingTable
                            data={assigneeRanking}
                            columns={[
                                { label: "担当者名" },
                                { label: "売上 (手取り・見込含)", align: "right" },
                                { label: "件数", align: "center" },
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
