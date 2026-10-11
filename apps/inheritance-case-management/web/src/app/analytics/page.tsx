"use client"

import { useCallback, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAllCases } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import type { Assignee } from "@/types/shared"
import type { RankingData } from "@/lib/analytics-utils"
import { calcNet, calcReferralFee, getAnalyticsBaseType, aggregateCases, computeRollingAnnual, LABEL_UNSET } from "@/lib/analytics-utils"
import { isAccepted } from "@/types/constants"
import { RefreshCw } from "lucide-react"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { Button } from "@/components/ui/Button"
import { parseError } from "@/hooks/use-error-handler"
import { useRankingSort } from "@/hooks/use-ranking-sort"
import { YearFilter } from "./YearFilter"
import { OverviewTab } from "./OverviewTab"
import { MonthlyCaseActivity } from "./MonthlyCaseActivity"
import { BreakdownTab } from "./BreakdownTab"
import { ReferrerTab } from "./ReferrerTab"
import dynamic from "next/dynamic"
const AnnualTrendTab = dynamic(() => import("./AnnualTrendTab").then(m => m.AnnualTrendTab), { ssr: false })

const ALL_DEPARTMENTS_VALUE = "__all__"

type TabId = "overview" | "trend" | "breakdown" | "referrer"

const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "売上・件数" },
    { id: "trend", label: "年計表" },
    { id: "breakdown", label: "部門・担当者" },
    { id: "referrer", label: "外部紹介者" },
]

function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function AnalyticsPage() {
    const { data: loaded, isPending: isLoading, isFetching, error: loadError, refetch } = useQuery({
        queryKey: ["cases", "analytics"],
        queryFn: async () => {
            const [cases, assignees] = await Promise.all([getAllCases(), getAssignees()])
            return { cases, assignees }
        },
    })
    const data = useMemo(() => loaded?.cases ?? [], [loaded])
    const assigneesData = useMemo(() => loaded?.assignees ?? [], [loaded])
    const deptMap = useMemo(() => new Map(assigneesData.map(a => [a.name, a.department?.name || LABEL_UNSET])), [assigneesData])
    const currentYear = new Date().getFullYear()
    const [requestedYears, setSelectedYears] = useState<Set<number>>(new Set([currentYear]))
    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const years = useMemo(() => Array.from(new Set(data.map(c => c.fiscalYear))).sort((a, b) => b - a), [data])
    const selectedYears = useMemo(() => {
        if (requestedYears.size === 0 || years.length === 0) return requestedYears
        const available = [...requestedYears].filter(year => years.includes(year))
        return new Set(available.length > 0 ? available : [years[0]])
    }, [requestedYears, years])
    const [annualBaseMonth, setAnnualBaseMonth] = useState(() => {
        const value = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("baseMonth") : null
        return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value <= getCurrentMonth() ? value : getCurrentMonth()
    })
    const [annualDepartment, setAnnualDepartment] = useState(ALL_DEPARTMENTS_VALUE)

    const isAllYears = selectedYears.size === 0

    const filteredData = useMemo(() => {
        if (isAllYears) return data
        return data.filter(c => selectedYears.has(c.fiscalYear))
    }, [data, selectedYears, isAllYears])

    const yearLabel = useMemo(() => {
        if (isAllYears) return "全期間"
        const sorted = [...selectedYears].sort((a, b) => a - b)
        if (sorted.length === 1) return `${sorted[0]}年度`
        return `${sorted.join("・")}年度`
    }, [selectedYears, isAllYears])

    const aggregation = useMemo(
        () => aggregateCases(filteredData, deptMap),
        [filteredData, deptMap]
    )

    const annualDepartmentOptions = useMemo(() => {
        const options = new Map<string, number>()
        const addOption = (name: string, sortOrder: number) => {
            const current = options.get(name)
            if (current == null || sortOrder < current) options.set(name, sortOrder)
        }

        assigneesData.forEach(a => {
            addOption(a.department?.name || LABEL_UNSET, a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER)
        })

        data.forEach(c => {
            if (!c.assignee?.department?.name || (c.internalReferrerId != null && !c.internalReferrer?.department?.name)) {
                addOption(LABEL_UNSET, Number.MAX_SAFE_INTEGER)
            }
        })

        return Array.from(options.entries())
            .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "ja"))
            .map(([name]) => name)
    }, [assigneesData, data])

    const annualDepartmentName = annualDepartment === ALL_DEPARTMENTS_VALUE ? undefined : annualDepartment

    const rollingAnnualData = useMemo(
        () => computeRollingAnnual(data, annualBaseMonth, annualDepartmentName, deptMap),
        [annualBaseMonth, annualDepartmentName, data, deptMap]
    )

    const handleAnnualBaseMonthChange = useCallback((value: string) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return
        const normalized = value > getCurrentMonth() ? getCurrentMonth() : value
        setAnnualBaseMonth(normalized)

        const url = new URL(window.location.href)
        if (normalized === getCurrentMonth()) url.searchParams.delete("baseMonth")
        else url.searchParams.set("baseMonth", normalized)
        window.history.replaceState(null, "", `${url.pathname}${url.search}`)
    }, [])

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
        const acceptedCases = filteredData.filter(c => isAccepted(c.status))

        let salesTotalNet = 0, salesTotalGross = 0, salesCount = 0
        let estimateTotalNet = 0, estimateTotalGross = 0, estimateCount = 0
        let salesReferralInternal = 0, salesReferralExternal = 0
        let estimateReferralInternal = 0, estimateReferralExternal = 0

        for (const c of acceptedCases) {
            const baseType = getAnalyticsBaseType(c)
            if (!baseType) continue

            const net = calcNet(c, baseType)
            const gross = baseType === "fee" ? (c.feeAmount || 0) : (c.estimateAmount || 0)
            const referral = calcReferralFee(c, baseType)
            const isInternal = c.internalReferrerId != null

            if (baseType === "fee") {
                salesTotalNet += net
                salesTotalGross += gross
                salesCount++
                if (isInternal) salesReferralInternal += referral
                else salesReferralExternal += referral
            } else {
                estimateTotalNet += net
                estimateTotalGross += gross
                estimateCount++
                if (isInternal) estimateReferralInternal += referral
                else estimateReferralExternal += referral
            }
        }

        return {
            salesTotalNet, salesTotalGross, salesCount,
            salesReferralInternal, salesReferralExternal,
            estimateTotalNet, estimateTotalGross, estimateCount,
            estimateReferralInternal, estimateReferralExternal,
            grandTotalNet: salesTotalNet + estimateTotalNet,
            grandTotalGross: salesTotalGross + estimateTotalGross,
            grandCount: salesCount + estimateCount,
            grandReferralInternal: salesReferralInternal + estimateReferralInternal,
            grandReferralExternal: salesReferralExternal + estimateReferralExternal,
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

    if (loadError) {
        return <div className="container mx-auto px-4 py-10"><h1 className="text-xl font-bold">経営分析ダッシュボード</h1><ErrorDisplay error={parseError(loadError)} onRetry={() => void refetch()} /></div>
    }

    return (
        <div className="case-workspace analytics-workspace mx-auto min-h-screen max-w-[1600px] space-y-3 px-3 py-4 text-sm lg:px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h1 className="text-xl font-bold">経営分析ダッシュボード</h1>
                <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />{isFetching ? "更新中…" : "データを更新"}</Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 border-b pb-2" aria-label="分析の表示切替">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                        className={`min-h-11 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200" : "text-muted-foreground hover:bg-white"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab !== "trend" && <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                <YearFilter years={years} selected={selectedYears} onChange={setSelectedYears} />
                {activeTab === "overview" && <MonthlyCaseActivity years={selectedYears} />}
            </div>}

            {activeTab === "overview" && (
                <OverviewTab
                    summaryTotals={summaryTotals}
                    annualData={aggregation.annualData}
                    yearLabel={yearLabel}
                />
            )}

            {activeTab === "trend" && (
                <AnnualTrendTab
                    data={rollingAnnualData}
                    baseMonth={annualBaseMonth}
                    onBaseMonthChange={handleAnnualBaseMonthChange}
                    departmentOptions={annualDepartmentOptions}
                    selectedDepartment={annualDepartment}
                    onDepartmentChange={setAnnualDepartment}
                />
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
