import type { InheritanceCase } from "@tax-apps/shared"

export type AnnualData = {
    year: number
    feeTotal: number
    estimateTotal: number
    count: number
    statusCounts: { completed: number; ongoing: number; notStarted: number }
    acceptanceCounts: { undecided: number; accepted: number; rejected: number }
}

export type RankingData = {
    name: string
    feeTotal: number
    count: number
}

export type AggregationResult = {
    annualData: AnnualData[]
    assigneeRanking: RankingData[]
    departmentTotals: RankingData[]
    referrerRanking: RankingData[]
}

export function calcNet(c: InheritanceCase, baseType: "fee" | "estimate"): number {
    const base = baseType === "fee" ? (c.feeAmount || 0) : (c.estimateAmount || 0)
    let referral = c.referralFeeAmount || 0

    if (baseType === "estimate" && referral === 0 && c.referralFeeRate && c.referralFeeRate > 0) {
        referral = Math.floor(base * (c.referralFeeRate / 100))
    }

    return base - referral
}

const currencyFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })

export function formatCurrency(amount: number): string {
    return currencyFormatter.format(amount)
}

export function aggregateCases(cases: InheritanceCase[], deptMap: Map<string, string>): AggregationResult {
    const annualMap = new Map<number, AnnualData>()
    const assigneeMap = new Map<string, RankingData>()
    const deptRankingMap = new Map<string, RankingData>()
    const referrerMap = new Map<string, RankingData>()

    cases.forEach(c => {
        const year = c.fiscalYear
        if (!annualMap.has(year)) {
            annualMap.set(year, {
                year,
                feeTotal: 0,
                estimateTotal: 0,
                count: 0,
                statusCounts: { completed: 0, ongoing: 0, notStarted: 0 },
                acceptanceCounts: { undecided: 0, accepted: 0, rejected: 0 },
            })
        }
        const annual = annualMap.get(year)!

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

        // Assignee ranking
        const assignee = c.assignee || "未設定"
        if (!assigneeMap.has(assignee)) {
            assigneeMap.set(assignee, { name: assignee, feeTotal: 0, count: 0 })
        }
        const aData = assigneeMap.get(assignee)!

        let netAmount = 0
        if (c.status === "完了") {
            netAmount = calcNet(c, "fee")
        } else if (c.status === "進行中" && c.acceptanceStatus === "受託可") {
            netAmount = calcNet(c, "estimate")
        }

        aData.feeTotal += netAmount
        aData.count++

        // Referrer
        const referrer = c.referrer || "なし"
        if (!referrerMap.has(referrer)) {
            referrerMap.set(referrer, { name: referrer, feeTotal: 0, count: 0 })
        }
        const rData = referrerMap.get(referrer)!
        rData.feeTotal += (c.referralFeeAmount || 0)
        rData.count++

        // Department
        const dept = deptMap.get(c.assignee || "") || "未設定"
        if (!deptRankingMap.has(dept)) {
            deptRankingMap.set(dept, { name: dept, feeTotal: 0, count: 0 })
        }
        const dData = deptRankingMap.get(dept)!
        dData.feeTotal += netAmount
        dData.count++
    })

    return {
        annualData: Array.from(annualMap.values()).sort((a, b) => b.year - a.year),
        assigneeRanking: Array.from(assigneeMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        departmentTotals: Array.from(deptRankingMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        referrerRanking: Array.from(referrerMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
    }
}
