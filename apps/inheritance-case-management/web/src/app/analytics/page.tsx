"use client"

import { useEffect, useState, useMemo } from "react"
import { getAllCases } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import type { InheritanceCase } from "@/types/shared"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { calcNet, formatCurrency, aggregateCases, type AnnualData } from "@/lib/analytics-utils"
import { RankingTable } from "./RankingTable"

type TabId = "overview" | "breakdown" | "referrer"
type StatusTableConfig = {
    title: string
    columns: { label: string; highlight?: boolean }[]
    getValues: (d: AnnualData) => number[]
}

const YEAR_SELECT_CLASS = "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "経営概況" },
    { id: "breakdown", label: "部門・担当者" },
    { id: "referrer", label: "紹介者" },
]

export default function AnalyticsPage() {
    const [data, setData] = useState<InheritanceCase[]>([])
    const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map())
    const [selectedYear, setSelectedYear] = useState<string>("all")
    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const [years, setYears] = useState<number[]>([])
    const [referrerSort, setReferrerSort] = useState<{ col: "feeTotal" | "count" | "name"; desc: boolean }>({ col: "count", desc: true })

    useEffect(() => {
        const load = async () => {
            try {
                const [cases, assignees] = await Promise.all([getAllCases(), getAssignees()])
                setData(cases)

                const map = new Map<string, string>()
                assignees.forEach(a => map.set(a.name, a.department || ""))
                setDeptMap(map)

                const uniqueYears = Array.from(new Set(cases.map(c => c.fiscalYear))).sort((a, b) => a - b)
                setYears(uniqueYears)
            } catch (error) {
                console.error("Failed to load analytics data:", error)
            }
        }
        load()
    }, [])

    const filteredData = useMemo(() => {
        if (selectedYear === "all") return data
        return data.filter(c => c.fiscalYear === Number(selectedYear))
    }, [data, selectedYear])

    const aggregation = useMemo(
        () => aggregateCases(filteredData, deptMap),
        [filteredData, deptMap]
    )

    const summaryTotals = useMemo(() => {
        const acceptedCases = filteredData.filter(c => c.acceptanceStatus === "受託可")
        const completedCases = acceptedCases.filter(c => c.status === "完了")
        const ongoingCases = acceptedCases.filter(c => c.status === "進行中")

        const salesTotalNet = completedCases.reduce((sum, c) => sum + calcNet(c, "fee"), 0)
        const salesTotalGross = completedCases.reduce((sum, c) => sum + (c.feeAmount || 0), 0)
        const estimateTotalNet = ongoingCases.reduce((sum, c) => sum + calcNet(c, "estimate"), 0)
        const estimateTotalGross = ongoingCases.reduce((sum, c) => sum + (c.estimateAmount || 0), 0)

        return {
            salesTotalNet, salesTotalGross, salesCount: completedCases.length,
            estimateTotalNet, estimateTotalGross, estimateCount: ongoingCases.length,
            grandTotalNet: salesTotalNet + estimateTotalNet,
            grandTotalGross: salesTotalGross + estimateTotalGross,
            grandCount: completedCases.length + ongoingCases.length,
        }
    }, [filteredData])

    const sortedReferrerRanking = useMemo(() => {
        return [...aggregation.referrerRanking].sort((a, b) => {
            const { col, desc } = referrerSort
            const res = col === "name" ? a.name.localeCompare(b.name, "ja") : a[col] - b[col]
            return desc ? -res : res
        })
    }, [aggregation.referrerRanking, referrerSort])

    const handleReferrerSort = (col: "feeTotal" | "count" | "name") => {
        setReferrerSort(prev => ({ col, desc: prev.col === col ? !prev.desc : true }))
    }

    const { annualData, assigneeRanking, departmentTotals } = aggregation
    const { salesTotalNet, salesTotalGross, salesCount, estimateTotalNet, estimateTotalGross, estimateCount, grandTotalNet, grandTotalGross, grandCount } = summaryTotals

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/"><Button variant="outline" size="sm">一覧へ戻る</Button></Link>
                    <h1 className="text-3xl font-bold">経営分析ダッシュボード</h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">表示年度:</span>
                    <select
                        className={YEAR_SELECT_CLASS}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="all">全期間</option>
                        {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "事業総額 (売上 + 見込)", badge: "手取り実額", badgeClass: "bg-primary/10 text-primary", cardClass: "bg-white border-2 border-primary/20", valueClass: "text-3xl font-bold text-primary", hasIcon: true, net: grandTotalNet, count: grandCount, gross: grandTotalGross, footnote: "※請求総額" },
                            { title: "売上実績 (完了案件)", badge: "手取り実額", badgeClass: "bg-muted text-foreground", cardClass: "bg-card border", valueClass: "text-2xl font-bold", hasIcon: false, net: salesTotalNet, count: salesCount, gross: salesTotalGross, footnote: "※請求総額" },
                            { title: "見込額 (進行中のみ)", badge: "予測実額", badgeClass: "bg-muted text-foreground", cardClass: "bg-card border", valueClass: "text-2xl font-bold", hasIcon: false, net: estimateTotalNet, count: estimateCount, gross: estimateTotalGross, footnote: "※見積総額" },
                        ].map((card) => (
                            <div key={card.title} className={`p-6 rounded-lg shadow-sm ${card.cardClass} ${card.hasIcon ? "relative overflow-hidden" : ""}`}>
                                {card.hasIcon && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                    </div>
                                )}
                                <div className="text-sm font-medium text-muted-foreground mb-2">{card.title} <span className={`text-xs ${card.badgeClass} px-1 rounded`}>{card.badge}</span></div>
                                <div className="flex items-baseline gap-2">
                                    <div className={card.valueClass}>{formatCurrency(card.net)}</div>
                                    <div className="text-sm text-muted-foreground">/ {card.count} 件</div>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">{card.footnote}: {formatCurrency(card.gross)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Annual Performance */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">
                            {selectedYear === "all" ? "年度別 業績推移" : `${selectedYear}年度 業績詳細`}
                        </h2>
                        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
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
                            {([
                                { title: "年度別 受託ステータス内訳", columns: [{ label: "受託可", highlight: true }, { label: "受託不可" }, { label: "未判定" }], getValues: (d: AnnualData) => [d.acceptanceCounts.accepted, d.acceptanceCounts.rejected, d.acceptanceCounts.undecided] },
                                { title: "年度別 進行ステータス内訳", columns: [{ label: "完了", highlight: true }, { label: "手続中" }, { label: "未着手" }], getValues: (d: AnnualData) => [d.statusCounts.completed, d.statusCounts.ongoing, d.statusCounts.notStarted] },
                            ] satisfies StatusTableConfig[]).map((table) => (
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
            )}

            {/* Breakdown Tab */}
            {activeTab === "breakdown" && (
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
            )}

            {/* Referrer Tab */}
            {activeTab === "referrer" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-semibold border-b pb-2">紹介者分析</h2>
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">紹介者別 実績</h3>
                            <RankingTable
                                data={sortedReferrerRanking}
                                columns={[
                                    { label: "紹介者名" },
                                    { label: "紹介料合計", align: "right", sortKey: "feeTotal" },
                                    { label: "件数", align: "center", sortKey: "count" },
                                ]}
                                onSort={(col) => handleReferrerSort(col as "feeTotal" | "count" | "name")}
                                sortState={referrerSort}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
