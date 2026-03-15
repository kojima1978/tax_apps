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

export function AnnualTrendTab({ data }: AnnualTrendTabProps) {
    if (data.length === 0) {
        return <div className="text-center text-muted-foreground py-8">年計データがありません</div>
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold border-b pb-2">年計表（移動年計）</h2>
                <p className="text-sm text-muted-foreground">各月時点での直近12ヶ月の累計推移</p>

                {/* 売上グラフ */}
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">売上</h3>
                    <div className="bg-card rounded-lg border shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.length / 12) - 1)} />
                                <YAxis tickFormatter={formatMan} tick={{ fontSize: 11 }} width={80} />
                                <Tooltip formatter={(v: number) => [formatCurrency(v), "売上"]} labelFormatter={(l) => `${l} 時点`} />
                                <Legend />
                                <Line type="monotone" dataKey="feeTotal" name="売上" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 件数グラフ */}
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">件数</h3>
                    <div className="bg-card rounded-lg border shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.length / 12) - 1)} />
                                <YAxis tick={{ fontSize: 11 }} width={40} />
                                <Tooltip formatter={(v: number) => [`${v}件`, "件数"]} labelFormatter={(l) => `${l} 時点`} />
                                <Legend />
                                <Line type="monotone" dataKey="count" name="件数" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
