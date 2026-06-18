"use client"

import { ChevronRight, Info } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import type { RollingAnnualPoint } from "@/lib/analytics-utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface AnnualTrendTabProps {
    data: RollingAnnualPoint[]
}

function formatMan(v: number): string {
    return `${Math.round(v / 10000).toLocaleString()}万`
}

const CHART_DEFS = [
    {
        title: "売上",
        dataKey: "feeTotal" as const,
        name: "売上",
        stroke: "#111111",
        height: 300,
        yAxisFormatter: formatMan,
        tooltipFormatter: (v: number) => [formatCurrency(v), "売上"] as [string, string],
        yAxisWidth: 80,
    },
    {
        title: "件数",
        dataKey: "count" as const,
        name: "件数",
        stroke: "#525252",
        height: 250,
        yAxisFormatter: (v: number) => `${v}`,
        tooltipFormatter: (v: number) => [`${v}件`, "件数"] as [string, string],
        yAxisWidth: 40,
    },
] as const

export function AnnualTrendTab({ data }: AnnualTrendTabProps) {
    if (data.length === 0) {
        return <div className="text-center text-muted-foreground py-8">年計データがありません</div>
    }

    const xInterval = Math.max(0, Math.floor(data.length / 12) - 1)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold border-b pb-2">年計表（移動年計）</h2>
                <p className="text-sm text-muted-foreground">各月時点での直近12ヶ月の累計推移</p>

                <details className="group rounded-lg border bg-muted/30 text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3 font-medium">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        集計ルール
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <ul className="list-disc space-y-1 border-t px-4 py-3 pl-8 text-muted-foreground">
                        <li>対象: 完了案件（申告済・請求済・入金済）で<span className="font-medium text-foreground">請求日</span>が入力済みのもの</li>
                        <li>計上月: <span className="font-medium text-foreground">請求日</span>の年月</li>
                        <li>金額: 確定報酬額 −（社外）紹介料 ※社内紹介は控除なし（見積額ではなく確定額）</li>
                        <li>各月の値: その月を含む<span className="font-medium text-foreground">直近12ヶ月の累計</span>（移動年計）</li>
                        <li>データが12ヶ月そろうまでは表示されません</li>
                    </ul>
                </details>

                {CHART_DEFS.map((chart) => (
                    <div key={chart.dataKey} className="space-y-2">
                        <h3 className="text-lg font-medium">{chart.title}</h3>
                        <div className="bg-card rounded-lg border shadow-sm p-4">
                            <ResponsiveContainer width="100%" height={chart.height}>
                                <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={xInterval} />
                                    <YAxis
                                        tickFormatter={chart.yAxisFormatter}
                                        tick={{ fontSize: 11 }}
                                        width={chart.yAxisWidth}
                                    />
                                    <Tooltip
                                        formatter={chart.tooltipFormatter}
                                        labelFormatter={(l) => `${l} 時点`}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey={chart.dataKey}
                                        name={chart.name}
                                        stroke={chart.stroke}
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
