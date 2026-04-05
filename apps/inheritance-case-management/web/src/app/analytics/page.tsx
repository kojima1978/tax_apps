"use client"

import { useEffect, useState, useMemo } from "react"
import { getAllCases } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import type { InheritanceCase, Assignee } from "@/types/shared"
import type { RankingData } from "@/lib/analytics-utils"
import { calcNet, calcReferralFee, aggregateCases, computeRollingAnnual } from "@/lib/analytics-utils"
import { isCompleted } from "@/types/constants"
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
    const [assigneesData, setAssigneesData] = useState<Assignee[]>([])
    const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map())
    const currentYear = new Date().getFullYear()
    const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set([currentYear]))
    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const [years, setYears] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const isAllYears = selectedYears.size === 0

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const [cases, assignees] = await Promise.all([getAllCases(), getAssignees()])
                setData(cases)
                setAssigneesData(assignees)

                const map = new Map<string, string>()
                assignees.forEach(a => map.set(a.name, a.department?.name || ""))
                setDeptMap(map)

                const uniqueYears = Array.from(new Set(cases.map(c => c.fiscalYear))).sort((a, b) => b - a)
                setYears(uniqueYears)
                const cy = new Date().getFullYear()
                if (!uniqueYears.includes(cy)) {
                    setSelectedYears(uniqueYears.length > 0 ? new Set([uniqueYears[0]]) : new Set())
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
        return data.filter(c => selectedYears.has(c.fiscalYear))
    }, [data, selectedYears, isAllYears])

    const yearLabel = useMemo(() => {
        if (isAllYears) return "全期間"
        const sorted = [...selectedYears].sort((a, b) => a - b)
        if (sorted.length === 1) return `${sorted[0]}年度`
        return `${sorted[0]}〜${sorted[sorted.length - 1]}年度`
    }, [selectedYears, isAllYears])

    const aggregation = useMemo(
        () => aggregateCases(filteredData, deptMap),
        [filteredData, deptMap]
    )

    const rollingAnnualData = useMemo(() => computeRollingAnnual(data), [data])

    const { sorted: sortedCompanyRanking, sort: companySort, handleSort: handleCompanySort } = useRankingSort(aggregation.companyRanking)

    // 部門→担当者の階層グループを構築
    const departmentGroups = useMemo(() => {
        const rankingMap = new Map<string, RankingData>()
        aggregation.assigneeRanking.forEach((r: RankingData) => rankingMap.set(r.name, r))

        // 担当者をid順で部門ごとにグループ化
        type GroupEntry = { departmentName: string; sortOrder: number; assignees: { id: number; ranking: RankingData }[] }
        const groups = new Map<string, GroupEntry>()

        assigneesData.forEach((a: Assignee) => {
            const deptName = a.department?.name || "未設定"
            const sortOrder = a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER
            const ranking = rankingMap.get(a.name)
            if (!ranking) return // この担当者にデータなし
            if (!groups.has(deptName)) {
                groups.set(deptName, { departmentName: deptName, sortOrder, assignees: [] })
            }
            groups.get(deptName)!.assignees.push({ id: a.id, ranking })
        })

        // assigneeRankingにあるがassigneesDataにない名前（「未設定」等）を拾う
        aggregation.assigneeRanking.forEach((r: RankingData) => {
            const found = assigneesData.some((a: Assignee) => a.name === r.name)
            if (!found) {
                const deptName = "未設定"
                if (!groups.has(deptName)) {
                    groups.set(deptName, { departmentName: deptName, sortOrder: Number.MAX_SAFE_INTEGER, assignees: [] })
                }
                groups.get(deptName)!.assignees.push({ id: Number.MAX_SAFE_INTEGER, ranking: r })
            }
        })

        return Array.from(groups.values())
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(g => ({
                departmentName: g.departmentName,
                assignees: g.assignees.sort((a, b) => a.id - b.id).map(a => ({ ...a.ranking, assigneeId: a.id })),
            }))
    }, [aggregation.assigneeRanking, assigneesData])

    const summaryTotals = useMemo(() => {
        const acceptedCases = filteredData.filter(c => c.acceptanceStatus === "受託可")
        const completedCases = acceptedCases.filter(c => isCompleted(c.status))
        const ongoingCases = acceptedCases.filter(c => c.status === "手続中")

        const salesTotalNet = completedCases.reduce((sum, c) => sum + calcNet(c, "fee"), 0)
        const salesTotalGross = completedCases.reduce((sum, c) => sum + (c.feeAmount || 0), 0)
        const estimateTotalNet = ongoingCases.reduce((sum, c) => sum + calcNet(c, "estimate"), 0)
        const estimateTotalGross = ongoingCases.reduce((sum, c) => sum + (c.estimateAmount || 0), 0)

        const calcInternalExternal = (cases: InheritanceCase[], baseType: "fee" | "estimate") => {
            let internal = 0, external = 0
            for (const c of cases) {
                const fee = calcReferralFee(c, baseType)
                if (fee === 0) continue
                if (c.internalReferrerId != null) {
                    internal += fee
                } else {
                    external += fee
                }
            }
            return { internal, external }
        }

        const salesReferral = calcInternalExternal(completedCases, "fee")
        const estimateReferral = calcInternalExternal(ongoingCases, "estimate")

        return {
            salesTotalNet, salesTotalGross, salesCount: completedCases.length,
            salesReferralInternal: salesReferral.internal, salesReferralExternal: salesReferral.external,
            estimateTotalNet, estimateTotalGross, estimateCount: ongoingCases.length,
            estimateReferralInternal: estimateReferral.internal, estimateReferralExternal: estimateReferral.external,
            grandTotalNet: salesTotalNet + estimateTotalNet,
            grandTotalGross: salesTotalGross + estimateTotalGross,
            grandCount: completedCases.length + ongoingCases.length,
            grandReferralInternal: salesReferral.internal + estimateReferral.internal,
            grandReferralExternal: salesReferral.external + estimateReferral.external,
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
                <div className="flex items-center gap-1 flex-wrap">
                    <button
                        onClick={() => setSelectedYears(new Set())}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer ${isAllYears ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"}`}
                    >
                        全期間
                    </button>
                    {years.map(y => {
                        const active = selectedYears.has(y)
                        return (
                            <button
                                key={y}
                                onClick={() => {
                                    const next = new Set(selectedYears)
                                    if (active) {
                                        next.delete(y)
                                    } else {
                                        next.add(y)
                                    }
                                    setSelectedYears(next)
                                }}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"}`}
                            >
                                {y}
                            </button>
                        )
                    })}
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
                    departmentGroups={departmentGroups}
                    selectedYears={selectedYears}
                />
            )}

            {activeTab === "referrer" && (
                <ReferrerTab
                    sortedCompanyRanking={sortedCompanyRanking}
                    companySort={companySort}
                    onCompanySort={handleCompanySort}
                    selectedYears={selectedYears}
                />
            )}
        </div>
    )
}
