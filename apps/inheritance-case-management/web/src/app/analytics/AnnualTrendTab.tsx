"use client"

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
        stroke: "#2563eb",
        height: 300,
        yAxisFormatter: formatMan,
        tooltipFormatter: (v: number) => [formatCurrency(v), "売上"] as [string, string],
        yAxisWidth: 80,
    },
    {
        title: "件数",
        dataKey: "count" as const,
        name: "件数",
        stroke: "#16a34a",
        height: 250,
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
