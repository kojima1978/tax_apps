"use client"

import { useEffect, useState, useMemo } from "react"
import { getAllCases } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import type { InheritanceCase } from "@/types/shared"
import { calcNet, aggregateCases, computeRollingAnnual, LABEL_NONE, pinBottomCompare } from "@/lib/analytics-utils"
import { isCompleted } from "@/types/constants"
import { SelectField } from "@/components/ui/SelectField"
import { Button } from "@/components/ui/Button"
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
    const currentYear = new Date().getFullYear()
    const [yearFrom, setYearFrom] = useState<number | null>(currentYear)
    const [yearTo, setYearTo] = useState<number | null>(currentYear)
    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const [years, setYears] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const isAllYears = yearFrom === null && yearTo === null

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
                const cy = new Date().getFullYear()
                if (!uniqueYears.includes(cy)) {
                    const latest = uniqueYears[0] ?? null
                    setYearFrom(latest)
                    setYearTo(latest)
                }
            } catch (error) {
                console.error("Failed to load analytics data:", error)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const filteredData = useMemo(() => {
        if (isAllYears) return data
        return data.filter(c => {
            if (yearFrom !== null && c.fiscalYear < yearFrom) return false
            if (yearTo !== null && c.fiscalYear > yearTo) return false
            return true
        })
    }, [data, yearFrom, yearTo, isAllYears])

    const yearLabel = useMemo(() => {
        if (isAllYears) return "全期間"
        if (yearFrom === yearTo) return `${yearFrom}年度`
        return `${yearFrom ?? ""}〜${yearTo ?? ""}年度`
    }, [yearFrom, yearTo, isAllYears])

    const aggregation = useMemo(
        () => aggregateCases(filteredData, deptMap),
        [filteredData, deptMap]
    )

    const rollingAnnualData = useMemo(() => computeRollingAnnual(data), [data])

    const groupedReferrerRanking = useMemo(() => {
        const data = aggregation.referrerRanking
        return [...data].sort((a, b) => {
            const aGroup = a.group || LABEL_NONE
            const bGroup = b.group || LABEL_NONE
            const pin = pinBottomCompare(aGroup, bGroup)
            if (pin !== 0) return pin
            if (aGroup !== bGroup) return aGroup.localeCompare(bGroup, "ja")
            return b.feeTotal - a.feeTotal
        })
    }, [aggregation.referrerRanking])
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
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">表示期間:</span>
                    <SelectField
                        wrapperClassName={`h-10 w-auto ${isAllYears ? "opacity-40" : ""}`}
                        value={isAllYears ? (years[years.length - 1] ?? "") : (yearFrom ?? "")}
                        onChange={(e) => {
                            const v = Number(e.target.value)
                            if (isAllYears) {
                                setYearFrom(v)
                                setYearTo(years[0] ?? v)
                            } else {
                                setYearFrom(v)
                                if (yearTo !== null && v > yearTo) setYearTo(v)
                            }
                        }}
                    >
                        {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </SelectField>
                    <span className="text-sm text-muted-foreground">〜</span>
                    <SelectField
                        wrapperClassName={`h-10 w-auto ${isAllYears ? "opacity-40" : ""}`}
                        value={isAllYears ? (years[0] ?? "") : (yearTo ?? "")}
                        onChange={(e) => {
                            const v = Number(e.target.value)
                            if (isAllYears) {
                                setYearFrom(years[years.length - 1] ?? v)
                                setYearTo(v)
                            } else {
                                setYearTo(v)
                                if (yearFrom !== null && v < yearFrom) setYearFrom(v)
                            }
                        }}
                    >
                        {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </SelectField>
                    <Button
                        variant={isAllYears ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setYearFrom(null); setYearTo(null) }}
                    >
                        全期間
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <OverviewTab
                    summaryTotals={summaryTotals}
                    annualData={aggregation.annualData}
                    yearLabel={yearLabel}
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
                    groupedReferrerRanking={groupedReferrerRanking}
                    sortedCompanyRanking={sortedCompanyRanking}
                    companySort={companySort}
                    onCompanySort={handleCompanySort}
                />
            )}
        </div>
    )
}
