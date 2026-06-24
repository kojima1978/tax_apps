"use client"

import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import type { RollingAnnualPoint } from "@/lib/analytics-utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface AnnualTrendTabProps {
    data: RollingAnnualPoint[]
    baseMonth: string
    onBaseMonthChange: (value: string) => void
    departmentOptions: string[]
    selectedDepartment: string
    onDepartmentChange: (value: string) => void
}

const ALL_DEPARTMENTS_VALUE = "__all__"

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

function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(value: string, delta: number): string {
    const [year, month] = value.split("-").map(Number)
    const shifted = new Date(year, month - 1 + delta, 1)
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`
}

function buildMonthHref(point: RollingAnnualPoint): string {
    const params = new URLSearchParams({
        status: "入金済",
        paidFrom: point.monthStart,
        paidTo: point.monthEnd,
    })
    return `/?${params.toString()}`
}

export function AnnualTrendTab({
    data,
    baseMonth,
    onBaseMonthChange,
    departmentOptions,
    selectedDepartment,
    onDepartmentChange,
}: AnnualTrendTabProps) {

    const xInterval = Math.max(0, Math.floor(data.length / 12) - 1)
    const currentMonth = getCurrentMonth()
    const newestFirst = [...data].reverse()

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">年計表（移動年計）</h2>
                        <p className="mt-1 text-sm text-muted-foreground">基準月を含む過去24か月の月間実績と直近12か月累計</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-1.5">
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground" htmlFor="annual-department">
                            部門
                            <select
                                id="annual-department"
                                value={selectedDepartment}
                                onChange={event => onDepartmentChange(event.target.value)}
                                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value={ALL_DEPARTMENTS_VALUE}>全体</option>
                                {departmentOptions.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={() => onBaseMonthChange(shiftMonth(baseMonth, -1))}
                            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="基準月を1か月戻す"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground" htmlFor="annual-base-month">
                            基準月
                            <span className="relative">
                                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                                <input
                                    id="annual-base-month"
                                    type="month"
                                    value={baseMonth}
                                    max={currentMonth}
                                    onChange={event => onBaseMonthChange(event.target.value)}
                                    className="h-9 rounded-md border bg-background pl-8 pr-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={() => onBaseMonthChange(shiftMonth(baseMonth, 1))}
                            disabled={baseMonth >= currentMonth}
                            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="基準月を1か月進める"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onBaseMonthChange(currentMonth)}
                            disabled={baseMonth === currentMonth}
                            className="h-9 cursor-pointer rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            当月
                        </button>
                    </div>
                </div>

                <details className="group rounded-lg border bg-muted/30 text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3 font-medium">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        集計ルール
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <ul className="list-disc space-y-1 border-t px-4 py-3 pl-8 text-muted-foreground">
                        <li>対象: 入金済案件で<span className="font-medium text-foreground">入金日</span>が入力済みのもの</li>
                        <li>計上月: <span className="font-medium text-foreground">入金日</span>の年月</li>
                        <li>金額: 確定報酬額 −（社外）紹介料 ※社内紹介は控除なし（見積額ではなく確定額）</li>
                        <li>表示期間: 選択した基準月を含む過去24ヶ月</li>
                        <li>年計値: 各月を基準とした<span className="font-medium text-foreground">直近12ヶ月の累計</span></li>
                        <li>データがない月も0円・0件で表示します</li>
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

                <section className="space-y-2" aria-labelledby="annual-monthly-list-heading">
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 id="annual-monthly-list-heading" className="text-lg font-medium">基準月から過去24か月</h3>
                        <span className="text-xs text-muted-foreground">月をクリックすると案件一覧を表示</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                        <table className="w-full table-fixed text-left text-xs">
                            <colgroup>
                                <col className="w-[16%]" />
                                <col className="w-[23%]" />
                                <col className="w-[15%]" />
                                <col className="w-[28%]" />
                                <col className="w-[18%]" />
                            </colgroup>
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-2 py-2 font-medium">月</th>
                                    <th className="px-2 py-2 text-right font-medium">月間売上</th>
                                    <th className="px-2 py-2 text-right font-medium">月間件数</th>
                                    <th className="px-2 py-2 text-right font-medium">直近12か月売上</th>
                                    <th className="px-2 py-2 text-right font-medium">直近12か月件数</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {newestFirst.map(point => (
                                    <tr key={point.monthStart} className="transition-colors hover:bg-muted/40">
                                        <td className="px-2 py-2 font-medium">
                                            <Link
                                                href={buildMonthHref(point)}
                                                className="underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                {point.label}
                                            </Link>
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(point.monthlyFee)}</td>
                                        <td className="px-2 py-2 text-right tabular-nums">{point.monthlyCount}件</td>
                                        <td className="px-2 py-2 text-right font-medium tabular-nums">{formatCurrency(point.feeTotal)}</td>
                                        <td className="px-2 py-2 text-right font-medium tabular-nums">{point.count}件</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}
