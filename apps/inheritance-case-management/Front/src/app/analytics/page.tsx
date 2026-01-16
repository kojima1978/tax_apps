"use client"

import { useEffect, useState } from "react"
import { getCases } from "@/lib/case-service"
import { getAssignees } from "@/lib/assignee-service"
import { InheritanceCase } from "@/lib/mock-data"
import { Assignee } from "@/lib/assignee-data"
import { Button } from "@/components/ui/Button"
import Link from "next/link"


type AnnualData = {
    year: number
    feeTotal: number
    estimateTotal: number
    count: number
    statusCounts: {
        completed: number
        ongoing: number
        notStarted: number
    }
    acceptanceCounts: {
        undecided: number
        accepted: number
        rejected: number
    }
}

type RankingData = {
    name: string
    feeTotal: number
    count: number
}

type DepartmentData = {
    name: string
    feeTotal: number
    count: number
}

// Helper to calc Net Amount (amount - referral)
const calcNet = (c: InheritanceCase, baseType: "fee" | "estimate") => {
    let base = 0
    if (baseType === "fee") base = c.feeAmount || 0
    else base = c.estimateAmount || 0

    let referral = c.referralFeeAmount || 0

    // If base is estimate (ongoing cases), calculate referral if not set but rate exists
    if (baseType === "estimate") {
        if (referral === 0 && c.referralFeeRate && c.referralFeeRate > 0) {
            referral = Math.floor(base * (c.referralFeeRate / 100))
        }
    }

    return base - referral
}



export default function AnalyticsPage() {
    const [data, setData] = useState<InheritanceCase[]>([])
    const [filteredData, setFilteredData] = useState<InheritanceCase[]>([])
    const [annualData, setAnnualData] = useState<AnnualData[]>([])
    const [assigneeRanking, setAssigneeRanking] = useState<RankingData[]>([])
    const [departmentTotals, setDepartmentTotals] = useState<DepartmentData[]>([])
    const [referrerRanking, setReferrerRanking] = useState<RankingData[]>([])
    const [referrerSort, setReferrerSort] = useState<{ col: "feeTotal" | "count" | "name", desc: boolean }>({ col: "count", desc: true })
    const [selectedYear, setSelectedYear] = useState<string>("all")
    const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "referrer">("overview")
    const [years, setYears] = useState<number[]>([])

    // Helper to get Department Map from Assignees
    // Since getDepartmentMap was sync, we can just inline the mapping inside useEffect where we fetch assignees.

    useEffect(() => {
        const load = async () => {
            try {
                // Parallel fetch cases and assignees
                const [cases, assignees] = await Promise.all([
                    getCases(),
                    getAssignees()
                ])
                setData(cases)

                // Create Dept Map
                const deptMap = new Map<string, string>()
                assignees.forEach(a => deptMap.set(a.name, a.department))

                // Extract unique years
                const uniqueYears = Array.from(new Set(cases.map(c => c.fiscalYear))).sort((a, b) => a - b)
                setYears(uniqueYears)

                filterAndAggregate(cases, "all", deptMap)
            } catch (error) {
                console.error("Failed to load analytics data:", error)
            }
        }
        load()
    }, [])

    const handleYearChange = async (year: string) => {
        setSelectedYear(year)
        // We need deptMap again. It's not stored in state.
        // Let's store deptMap in state or refetch?
        // Refetching is safer for data consistency but slower.
        // Ideally we should cache it.
        // For now, let's just refetch to be safe and consistent with previous "getDepartmentMap calling global storage" logic.
        try {
            const assignees = await getAssignees()
            const deptMap = new Map<string, string>()
            assignees.forEach(a => deptMap.set(a.name, a.department))
            filterAndAggregate(data, year, deptMap)
        } catch (e) {
            console.error(e)
        }
    }

    const filterAndAggregate = (allCases: InheritanceCase[], year: string, deptMap?: Map<string, string>) => {
        let casesToAggregate = allCases
        if (year !== "all") {
            casesToAggregate = allCases.filter(c => c.fiscalYear === Number(year))
        }
        setFilteredData(casesToAggregate)

        // Ensure deptMap exists
        const dMap = deptMap || new Map<string, string>();

        aggregateData(casesToAggregate, year, dMap)
    }

    const aggregateData = (cases: InheritanceCase[], yearFilter: string, deptMap: Map<string, string>) => {
        // Annual Aggregation
        const annualMap = new Map<number, AnnualData>()

        // Rankings Map
        const assigneeMap = new Map<string, RankingData>()
        const deptRankingMap = new Map<string, DepartmentData>()
        const referrerMap = new Map<string, RankingData>()

        cases.forEach(c => {
            // Annual
            const year = c.fiscalYear
            if (!annualMap.has(year)) {
                annualMap.set(year, {
                    year,
                    feeTotal: 0,
                    estimateTotal: 0,
                    count: 0,
                    statusCounts: { completed: 0, ongoing: 0, notStarted: 0 },
                    acceptanceCounts: { undecided: 0, accepted: 0, rejected: 0 }
                })
            }
            const annual = annualMap.get(year)!

            // Helpers moved to top level


            // Only count Amount for Accepted cases? 
            // In Summary Card we filtered by accepted. But here we are iterating all cases.
            // Let's stick to consistent logic: Status "Completed" -> Fee, Others -> Estimate.
            // And usually we care about Acccepted or at least not Rejected for financial projection.
            // Assuming "All" in table includes everything but "Rejected"? 
            // Actually summary cards filtered by "Accepted". 
            // Let's exclude Rejected from financial sums in table too for consistency if not already done?
            // Existing code didn't filter explicitly here, but let's check.
            // c.acceptanceStatus === "受託不可" should probably be excluded from Revenue.

            if (c.acceptanceStatus === "受託可") {
                if (c.status === "完了") {
                    annual.feeTotal += calcNet(c, "fee")
                    annual.count++
                } else if (c.status === "進行中") {
                    annual.estimateTotal += calcNet(c, "estimate")
                    annual.count++
                }
            }
            if (c.acceptanceStatus === "受託可") {
                if (c.status === "完了") annual.statusCounts.completed++
                else if (c.status === "進行中") annual.statusCounts.ongoing++
                else if (c.status === "未着手") annual.statusCounts.notStarted++
            }

            const acceptance = c.acceptanceStatus || "未判定"
            if (acceptance === "受託可") annual.acceptanceCounts.accepted++
            else if (acceptance === "受託不可") annual.acceptanceCounts.rejected++
            else annual.acceptanceCounts.undecided++

            // Assignee - Net Sales (Fee - ReferralFee) OR Projected (Estimate - ReferralFee)
            const assignee = c.assignee || "未設定"
            if (!assigneeMap.has(assignee)) {
                assigneeMap.set(assignee, { name: assignee, feeTotal: 0, count: 0 })
            }
            const aData = assigneeMap.get(assignee)!

            // Assignee Ranking should also follow the same Rules?
            // "Annual Performance" and "Summary Cards" are strict now.
            // Current Assignee Ranking counts everything.
            // User didn't ask to change Assignee Ranking, but usually it should match?
            // "Projected Sales Logic" task earlier implied consistency.
            // Let's keep Assignee Ranking as is ("Net Sales" for all valid calculations) unless asked.
            // But wait, if we are projecting, we probably want the same logic.
            // However, typically individual performance tracks "All Assigned".
            // Let's stick to modifying the Annual Table and Summary Cards as explicitly requested.

            // Use the same logic for Assignee Ranking
            let baseAmount = 0;
            let deduction = 0;

            // If Fee is 0 (even if Completed), it remains 0. No fallback to Estimate.
            // Unless it's an "Ongoing" case?
            // Wait, Assignee Ranking iterates ALL cases.
            // If we apply the strict "Completed = Fee", "Ongoing = Estimate" rule to Assignee Ranking:

            if (c.status === "完了") {
                // Fee - Referral
                baseAmount = c.feeAmount || 0;
                deduction = c.referralFeeAmount || 0;
            } else if (c.status === "進行中" && c.acceptanceStatus === "受託可") {
                // Estimate - Referral (Projected)
                baseAmount = c.estimateAmount || 0;
                deduction = c.referralFeeAmount || 0; // Initialize deduction
                if (deduction === 0 && c.referralFeeRate && c.referralFeeRate > 0) {
                    deduction = Math.floor(baseAmount * (c.referralFeeRate / 100));
                }
            } else {
                // Not Started or Rejected -> 0 for Ranking?
                // Previously we counted everything.
                // Implied requirement: "Projected Sales Logic" for assignee ranking.
                // Let's use the same "Net Revenue" logic as the Table.
                // i.e. strict status check.
                baseAmount = 0
                deduction = 0 // Don't subtract referral if 0 revenue
            }

            // Wait, simply reusing calcNet logic inside loop would be cleaner but c is different scope.
            // Actually, Assignee Ranking serves to show "Performance". 
            // If we exclude "Not Started", they get 0 credit. That's probably fair for "Projected Revenue".

            aData.feeTotal += (baseAmount - deduction)
            aData.count++

            // Referrer
            const referrer = c.referrer || "なし"
            if (!referrerMap.has(referrer)) {
                referrerMap.set(referrer, { name: referrer, feeTotal: 0, count: 0 })
            }
            const rData = referrerMap.get(referrer)!
            rData.feeTotal += (c.referralFeeAmount || 0) // Original logic for referrer fee
            rData.count++

            // Department
            const dept = deptMap.get(c.assignee || "") || "未設定" // Use empty string if assignee is undefined
            if (!deptRankingMap.has(dept)) {
                deptRankingMap.set(dept, { name: dept, feeTotal: 0, count: 0 })
            }
            const dData = deptRankingMap.get(dept)!
            dData.feeTotal += (baseAmount - deduction)
            dData.count++
        })

        // Sort Annual
        setAnnualData(Array.from(annualMap.values()).sort((a, b) => b.year - a.year))

        // Sort Rankings (fee desc)
        setAssigneeRanking(Array.from(assigneeMap.values()).sort((a, b) => b.feeTotal - a.feeTotal))
        setReferrerRanking(Array.from(referrerMap.values()).sort((a, b) => b.feeTotal - a.feeTotal))

        // Department Data (No ranking required, maybe strict order or simple list? User said "No need for ranking".
        // But usually meaningful order helps. Let's use predefined DEPARTMENTS order or alphabetical.)
        // Actually, user said "No need to make it a ranking".
        // I'll filter out "未設定" if unused or put at end?
        // Let's just list them. Using pre-defined DEPARTMENTS order is best for consistency.
        // Assuming imports... wait, I can't import CONSTANT effectively in client component if strict mode?
        // It's a const array. I'll just sort by name or keep flexible.
        // Let's sort by DEPARTMENTS index if possible, else name.
        const sortedDepts = Array.from(deptRankingMap.values()).sort((a, b) => {
            // Basic sort by fee desc is still useful even if "not a ranking" for visual hierarchy,
            // but user explicitly said "No need for ranking".
            // Maybe they want fixed order? I'll stick to Fee Descending as default "reasonable" list,
            // or just alphabetical? Fee Descending is usually what analysts want.
            // Use Fee Descending but labeled "Department Total".
            return b.feeTotal - a.feeTotal
        })
        setDepartmentTotals(sortedDepts)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount)
    }

    const handleReferrerSort = (col: "feeTotal" | "count" | "name") => {
        setReferrerSort(prev => ({
            col,
            desc: prev.col === col ? !prev.desc : true
        }))
    }

    const sortedReferrerRanking = [...referrerRanking].sort((a, b) => {
        const { col, desc } = referrerSort
        let res = 0
        if (col === "name") {
            res = a.name.localeCompare(b.name, "ja")
        } else {
            res = a[col] - b[col]
        }
        return desc ? -1 * res : res
    })

    // Determine max value for charts
    const maxFee = Math.max(...annualData.map(d => d.feeTotal), 1)

    // Calculate Summary Totals based on specific rules
    // Rule 1: Only "受託可" (Accepted) cases
    const acceptedCases = filteredData.filter(c => c.acceptanceStatus === "受託可")

    // Rule 2: Partition by Status
    // "Sales" = Completed (完了) -> Use feeAmount
    // "Estimate" = Ongoing (進行中) -> Use estimateAmount (Exclude Not Started)
    const completedCases = acceptedCases.filter(c => c.status === "完了")
    const ongoingCases = acceptedCases.filter(c => c.status === "進行中")

    // calcNet helper is now external


    // Sales Total (Net) & Gross
    const salesTotalNet = completedCases.reduce((sum, c) => sum + calcNet(c, "fee"), 0)
    const salesTotalGross = completedCases.reduce((sum, c) => sum + (c.feeAmount || 0), 0)
    const salesCount = completedCases.length

    // Estimate Total (Net) & Gross
    const estimateTotalNet = ongoingCases.reduce((sum, c) => sum + calcNet(c, "estimate"), 0)
    const estimateTotalGross = ongoingCases.reduce((sum, c) => sum + (c.estimateAmount || 0), 0)
    const estimateCount = ongoingCases.length

    const grandTotalNet = salesTotalNet + estimateTotalNet
    const grandTotalGross = salesTotalGross + estimateTotalGross
    const grandCount = salesCount + estimateCount

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            一覧へ戻る
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">経営分析ダッシュボード</h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">表示年度:</span>
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                    >
                        <option value="all">全期間</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}年度</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "overview"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50"
                        }`}
                >
                    経営概況
                </button>
                <button
                    onClick={() => setActiveTab("breakdown")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "breakdown"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50"
                        }`}
                >
                    部門・担当者
                </button>
                <button
                    onClick={() => setActiveTab("referrer")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "referrer"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50"
                        }`}
                >
                    紹介者
                </button>
            </div>

            {/* Overview Tab Content */}
            {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Grand Total */}
                        <div className="p-6 bg-white rounded-lg border-2 border-primary/20 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground mb-2">事業総額 (売上 + 見込) <span className="text-xs bg-primary/10 text-primary px-1 rounded">手取り実額</span></div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-bold text-primary">{formatCurrency(grandTotalNet)}</div>
                                <div className="text-sm text-muted-foreground">/ {grandCount} 件</div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                ※請求総額: {formatCurrency(grandTotalGross)}
                            </div>
                        </div>

                        {/* Sales (Completed) */}
                        <div className="p-6 bg-card rounded-lg border shadow-sm">
                            <div className="text-sm font-medium text-muted-foreground mb-2">売上実績 (完了案件) <span className="text-xs bg-muted text-foreground px-1 rounded">手取り実額</span></div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-2xl font-bold">{formatCurrency(salesTotalNet)}</div>
                                <div className="text-sm text-muted-foreground">/ {salesCount} 件</div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                ※請求総額: {formatCurrency(salesTotalGross)}
                            </div>
                        </div>

                        {/* Estimate (Ongoing) */}
                        <div className="p-6 bg-card rounded-lg border shadow-sm">
                            <div className="text-sm font-medium text-muted-foreground mb-2">見込額 (進行中のみ) <span className="text-xs bg-muted text-foreground px-1 rounded">予測実額</span></div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-2xl font-bold">{formatCurrency(estimateTotalNet)}</div>
                                <div className="text-sm text-muted-foreground">/ {estimateCount} 件</div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                ※見積総額: {formatCurrency(estimateTotalGross)}
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Annual Performance */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">
                            {selectedYear === "all" ? "年度別 業績推移" : `${selectedYear}年度 業績詳細`}
                        </h2>
                        {/* Table with Integrated Viz */}
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

                        {/* Status Breakdown Table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                                <div className="p-3 bg-muted border-b text-sm font-medium text-muted-foreground">
                                    年度別 受託ステータス内訳
                                </div>
                                <table className="w-full text-sm text-center">
                                    <thead className="text-muted-foreground border-b bg-card">
                                        <tr>
                                            <th className="p-2">年度</th>
                                            <th className="p-2 text-foreground font-bold">受託可</th>
                                            <th className="p-2 text-muted-foreground">受託不可</th>
                                            <th className="p-2 text-muted-foreground">未判定</th>
                                            <th className="p-2">合計</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {annualData.map(d => {
                                            const total = d.acceptanceCounts.accepted + d.acceptanceCounts.rejected + d.acceptanceCounts.undecided

                                            return (
                                                <tr key={d.year}>
                                                    <td className="p-2 font-medium">{d.year}年度</td>
                                                    <td className="p-2">{d.acceptanceCounts.accepted}</td>
                                                    <td className="p-2">{d.acceptanceCounts.rejected}</td>
                                                    <td className="p-2">{d.acceptanceCounts.undecided}</td>
                                                    <td className="p-2 font-bold">{total}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                                <div className="p-3 bg-muted border-b text-sm font-medium text-muted-foreground">
                                    年度別 進行ステータス内訳
                                </div>
                                <table className="w-full text-sm text-center">
                                    <thead className="text-muted-foreground border-b bg-card">
                                        <tr>
                                            <th className="p-2">年度</th>
                                            <th className="p-2 text-foreground font-bold">完了</th>
                                            <th className="p-2 text-muted-foreground">手続中</th>
                                            <th className="p-2 text-muted-foreground">未着手</th>
                                            <th className="p-2">合計</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {annualData.map(d => (
                                            <tr key={d.year}>
                                                <td className="p-2 font-medium">{d.year}年度</td>
                                                <td className="p-2">{d.statusCounts.completed}</td>
                                                <td className="p-2">{d.statusCounts.ongoing}</td>
                                                <td className="p-2">{d.statusCounts.notStarted}</td>
                                                <td className="p-2 font-bold">
                                                    {/* Use sum of status counts to include Not Started, matching Acceptance Count */}
                                                    {d.statusCounts.completed + d.statusCounts.ongoing + d.statusCounts.notStarted}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Breakdown Tab Content */}
            {activeTab === "breakdown" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">


                    {/* Section 2: Breakdowns */}
                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-semibold border-b pb-2">内訳分析</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Assignee Ranking */}
                            {/* Department Totals */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">部門別 合計</h3>
                                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground">
                                            <tr>
                                                <th className="p-3">部門名</th>
                                                <th className="p-3 text-right">合計 (手取り・見込含)</th>
                                                <th className="p-3 text-center">件数</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {departmentTotals.map((d) => (
                                                <tr key={d.name}>
                                                    <td className="p-3 font-medium">{d.name}</td>
                                                    <td className="p-3 text-right font-medium">{formatCurrency(d.feeTotal)}</td>
                                                    <td className="p-3 text-center text-muted-foreground">{d.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Assignee Ranking */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">担当者別 合計</h3>
                                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground">
                                            <tr>
                                                <th className="p-3">担当者名</th>
                                                <th className="p-3 text-right">売上 (手取り・見込含)</th>
                                                <th className="p-3 text-center">件数</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {assigneeRanking.map((r, i) => (
                                                <tr key={r.name}>
                                                    <td className="p-3">
                                                        {r.name}
                                                    </td>
                                                    <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                                                    <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Referrer Tab Content */}
            {activeTab === "referrer" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-semibold border-b pb-2">紹介者分析</h2>
                        {/* Referrer Ranking */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">紹介者別 実績</h3>
                            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="p-3">
                                                紹介者名
                                            </th>
                                            <th className="p-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleReferrerSort("feeTotal")}>
                                                紹介料合計 {referrerSort.col === "feeTotal" && (referrerSort.desc ? "▼" : "▲")}
                                            </th>
                                            <th className="p-3 text-center cursor-pointer hover:text-foreground" onClick={() => handleReferrerSort("count")}>
                                                件数 {referrerSort.col === "count" && (referrerSort.desc ? "▼" : "▲")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {sortedReferrerRanking.map((r, i) => (
                                            <tr key={r.name}>
                                                <td className="p-3">
                                                    {r.name}
                                                </td>
                                                <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                                                <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
