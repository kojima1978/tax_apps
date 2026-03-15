import type { InheritanceCase } from "@/types/shared"
import { isCompleted } from "@/types/constants"
import { STEP_NAMES } from "./progress-utils"

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

/** 移動年計データ（月ごとの直近12ヶ月累計） */
export type RollingAnnualPoint = {
    label: string       // "2025/04"
    year: number
    month: number
    feeTotal: number    // 確定売上の12ヶ月累計
    count: number       // 件数の12ヶ月累計
}

/** 完了案件を月別に集計し、移動年計を算出（基準: 進捗「請求（済）」の日付） */
export function computeRollingAnnual(cases: InheritanceCase[]): RollingAnnualPoint[] {
    // 受託可 かつ 完了系の案件で、「請求（済）」に日付がある案件
    const monthlyMap = new Map<string, { fee: number; count: number }>()
    cases.forEach(c => {
        if (c.acceptanceStatus !== "受託可" || !isCompleted(c.status)) return
        const billingStep = c.progress?.find(p => p.name === STEP_NAMES.BILLING)
        if (!billingStep?.date) return
        const d = new Date(billingStep.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyMap.has(key)) monthlyMap.set(key, { fee: 0, count: 0 })
        const m = monthlyMap.get(key)!
        m.fee += calcNet(c, "fee")
        m.count++
    })

    if (monthlyMap.size === 0) return []

    // 全月リストを生成（最古月〜現在月）
    const sortedKeys = Array.from(monthlyMap.keys()).sort()
    const [startY, startM] = sortedKeys[0].split('-').map(Number)
    const now = new Date()
    const endY = now.getFullYear()
    const endM = now.getMonth() + 1

    const allMonths: { year: number; month: number; key: string }[] = []
    let y = startY, m = startM
    while (y < endY || (y === endY && m <= endM)) {
        allMonths.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` })
        m++
        if (m > 12) { m = 1; y++ }
    }

    // 移動年計: 各月で直近12ヶ月の合計
    const result: RollingAnnualPoint[] = []
    for (let i = 11; i < allMonths.length; i++) {
        let feeTotal = 0, count = 0
        for (let j = i - 11; j <= i; j++) {
            const data = monthlyMap.get(allMonths[j].key)
            if (data) { feeTotal += data.fee; count += data.count }
        }
        const { year: py, month: pm } = allMonths[i]
        result.push({
            label: `${py}/${String(pm).padStart(2, '0')}`,
            year: py, month: pm,
            feeTotal, count,
        })
    }

    return result
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
            } else if (c.status === "手続中") {
                annual.estimateTotal += calcNet(c, "estimate")
                annual.count++
            }
        }

        if (c.acceptanceStatus === "受託可") {
            if (isCompleted(c.status)) annual.statusCounts.completed++
            else if (c.status === "手続中") annual.statusCounts.ongoing++
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
        } else if (c.status === "手続中" && c.acceptanceStatus === "受託可") {
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
