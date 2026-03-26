"use client"

import { useEffect, useState, useMemo } from "react"
import { getAllCases } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import type { InheritanceCase } from "@/types/shared"
import { calcNet, aggregateCases, computeRollingAnnual } from "@/lib/analytics-utils"
import { isCompleted } from "@/types/constants"
import { SelectField } from "@/components/ui/SelectField"
import { RefreshCw } from "lucide-react"
import { useRankingSort } from "@/hooks/use-ranking-sort"
import { OverviewTab } from "./OverviewTab"
import { BreakdownTab } from "./BreakdownTab"
import { ReferrerTab } from "./ReferrerTab"
import dynamic from "next/dynamic"
const AnnualTrendTab = dynamic(() => import("./AnnualTrendTab").then(m => m.AnnualTrendTab), { ssr: false })

type TabId = "overview" | "trend" | "breakdown" | "referrer"

const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "売上・件数" },
    { id: "trend", label: "年計表" },
    { id: "breakdown", label: "部門・担当者" },
    { id: "referrer", label: "紹介者" },
]

export default function AnalyticsPage() {
    const [data, setData] = useState<InheritanceCase[]>([])
    const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map())
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const [years, setYears] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const [cases, assignees] = await Promise.all([getAllCases(), getAssignees()])
                setData(cases)

                const map = new Map<string, string>()
                assignees.forEach(a => map.set(a.name, a.department?.name || ""))
                setDeptMap(map)

                const uniqueYears = Array.from(new Set(cases.map(c => c.fiscalYear))).sort((a, b) => b - a)
                setYears(uniqueYears)
            } catch (error) {
                console.error("Failed to load analytics data:", error)
            } finally {
                setIsLoading(false)
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

    const rollingAnnualData = useMemo(() => computeRollingAnnual(data), [data])

    const { sorted: sortedReferrerRanking, sort: referrerSort, handleSort: handleReferrerSort } = useRankingSort(aggregation.referrerRanking)
    const { sorted: sortedCompanyRanking, sort: companySort, handleSort: handleCompanySort } = useRankingSort(aggregation.companyRanking)

    const summaryTotals = useMemo(() => {
        const acceptedCases = filteredData.filter(c => c.acceptanceStatus === "受託可")
        const completedCases = acceptedCases.filter(c => isCompleted(c.status))
        const ongoingCases = acceptedCases.filter(c => c.status === "手続中")

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

    if (isLoading) {
        return (
            <div className="container mx-auto py-10 px-4">
                <div className="flex items-center justify-center h-64">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        データを読み込み中...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">経営分析ダッシュボード</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">表示年度:</span>
                    <SelectField
                        wrapperClassName="h-10 w-auto"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="all">全期間</option>
                        {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </SelectField>
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

            {activeTab === "overview" && (
                <OverviewTab
                    summaryTotals={summaryTotals}
                    annualData={aggregation.annualData}
                    selectedYear={selectedYear}
                />
            )}

            {activeTab === "trend" && (
                <AnnualTrendTab data={rollingAnnualData} />
            )}

            {activeTab === "breakdown" && (
                <BreakdownTab
                    departmentTotals={aggregation.departmentTotals}
                    assigneeRanking={aggregation.assigneeRanking}
                />
            )}

            {activeTab === "referrer" && (
                <ReferrerTab
                    sortedReferrerRanking={sortedReferrerRanking}
                    referrerSort={referrerSort}
                    onSort={handleReferrerSort}
                    sortedCompanyRanking={sortedCompanyRanking}
                    companySort={companySort}
                    onCompanySort={handleCompanySort}
                />
            )}
        </div>
    )
}
