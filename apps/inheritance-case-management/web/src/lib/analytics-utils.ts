import type { InheritanceCase } from "@/types/shared"
import { isCompleted } from "@/types/constants"

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
    companyRanking: RankingData[]
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

function accumulateRanking(map: Map<string, RankingData>, key: string, fee: number) {
    if (!map.has(key)) map.set(key, { name: key, feeTotal: 0, count: 0 })
    const d = map.get(key)!
    d.feeTotal += fee
    d.count++
}

export function aggregateCases(cases: InheritanceCase[], deptMap: Map<string, string>): AggregationResult {
    const annualMap = new Map<number, AnnualData>()
    const assigneeMap = new Map<string, RankingData>()
    const deptRankingMap = new Map<string, RankingData>()
    const referrerMap = new Map<string, RankingData>()
    const companyMap = new Map<string, RankingData>()

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
            if (isCompleted(c.status)) {
                annual.feeTotal += calcNet(c, "fee")
                annual.count++
            } else if (c.status === "進行中") {
                annual.estimateTotal += calcNet(c, "estimate")
                annual.count++
            }
        }

        if (c.acceptanceStatus === "受託可") {
            if (isCompleted(c.status)) annual.statusCounts.completed++
            else if (c.status === "進行中") annual.statusCounts.ongoing++
            else if (c.status === "未着手") annual.statusCounts.notStarted++
        }

        const acceptance = c.acceptanceStatus || "未判定"
        if (acceptance === "受託可") annual.acceptanceCounts.accepted++
        else if (acceptance === "受託不可") annual.acceptanceCounts.rejected++
        else annual.acceptanceCounts.undecided++

        // Net amount for rankings
        let netAmount = 0
        if (isCompleted(c.status)) {
            netAmount = calcNet(c, "fee")
        } else if (c.status === "進行中" && c.acceptanceStatus === "受託可") {
            netAmount = calcNet(c, "estimate")
        }

        // Rankings
        accumulateRanking(assigneeMap, c.assignee?.name || "未設定", netAmount)
        accumulateRanking(referrerMap, c.referrer ? `${c.referrer.company} / ${c.referrer.name}` : "なし", c.referralFeeAmount || 0)
        accumulateRanking(companyMap, c.referrer?.company || "なし", c.referralFeeAmount || 0)
        accumulateRanking(deptRankingMap, deptMap.get(c.assignee?.name || "") || "未設定", netAmount)
    })

    return {
        annualData: Array.from(annualMap.values()).sort((a, b) => b.year - a.year),
        assigneeRanking: Array.from(assigneeMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        departmentTotals: Array.from(deptRankingMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        referrerRanking: Array.from(referrerMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        companyRanking: Array.from(companyMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
    }
}
