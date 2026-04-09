import type { InheritanceCase } from "@/types/shared"
import { formatReferrerLabel } from "@/types/shared"
import { isCompleted } from "@/types/constants"
import { STEP_NAMES } from "../progress-utils"
import { calcNet, calcNetPersonal, calcReferralFee, LABEL_NONE, LABEL_UNSET } from "./calculations"

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
    group?: string
    assignedFee?: number
    assignedCount?: number
    referralFee?: number
    referralCount?: number
}

export type CompanyRankingData = RankingData & {
    departments: RankingData[]
}

export type AggregationResult = {
    annualData: AnnualData[]
    assigneeRanking: RankingData[]
    departmentTotals: RankingData[]
    referrerRanking: RankingData[]
    companyRanking: CompanyRankingData[]
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
    const companyDeptMap = new Map<string, Map<string, RankingData>>()

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

        let personalNet = 0
        let referralFee = 0
        let baseType: "fee" | "estimate" | null = null
        if (isCompleted(c.status)) {
            baseType = "fee"
            personalNet = calcNetPersonal(c, "fee")
            referralFee = calcReferralFee(c, "fee")
        } else if (c.status === "手続中" && c.acceptanceStatus === "受託可") {
            baseType = "estimate"
            personalNet = calcNetPersonal(c, "estimate")
            referralFee = calcReferralFee(c, "estimate")
        }

        // 担当者の担当売上
        const assigneeName = c.assignee?.name || LABEL_UNSET
        if (!assigneeMap.has(assigneeName)) assigneeMap.set(assigneeName, { name: assigneeName, feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0 })
        const assigneeEntry = assigneeMap.get(assigneeName)!
        assigneeEntry.feeTotal += personalNet
        assigneeEntry.count++
        assigneeEntry.assignedFee! += personalNet
        assigneeEntry.assignedCount! ++

        // 社内紹介者の紹介売上 → internalReferrer で紐づいた担当者に加算
        if (referralFee > 0 && c.internalReferrerId != null) {
            const refAssigneeName = c.internalReferrer?.name || LABEL_UNSET
            if (!assigneeMap.has(refAssigneeName)) assigneeMap.set(refAssigneeName, { name: refAssigneeName, feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0 })
            const refAssigneeEntry = assigneeMap.get(refAssigneeName)!
            refAssigneeEntry.feeTotal += referralFee
            refAssigneeEntry.referralFee! += referralFee
            refAssigneeEntry.referralCount! ++
        }

        // 部門別（担当売上）
        const deptName = deptMap.get(assigneeName) || LABEL_UNSET
        if (!deptRankingMap.has(deptName)) deptRankingMap.set(deptName, { name: deptName, feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0 })
        const deptEntry = deptRankingMap.get(deptName)!
        deptEntry.feeTotal += personalNet
        deptEntry.count++
        deptEntry.assignedFee! += personalNet
        deptEntry.assignedCount! ++

        // 部門別（社内紹介売上）
        if (referralFee > 0 && c.internalReferrerId != null) {
            const refAssigneeName2 = c.internalReferrer?.name || LABEL_UNSET
            const refDeptName = deptMap.get(refAssigneeName2) || LABEL_UNSET
            if (!deptRankingMap.has(refDeptName)) deptRankingMap.set(refDeptName, { name: refDeptName, feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0 })
            const refDeptEntry = deptRankingMap.get(refDeptName)!
            refDeptEntry.feeTotal += referralFee
            refDeptEntry.referralFee! += referralFee
            refDeptEntry.referralCount! ++
        }

        // 紹介者ランキング（社外紹介者のみ + 社内紹介者）
        if (c.referrer) {
            const referrerKey = formatReferrerLabel(c.referrer)
            accumulateRanking(referrerMap, referrerKey, c.referralFeeAmount || 0)
            const refEntry = referrerMap.get(referrerKey)
            if (refEntry) refEntry.group = c.referrer.company.name
            const companyName = c.referrer.company.name
            accumulateRanking(companyMap, companyName, c.referralFeeAmount || 0)
            const refDept = c.referrer.branch?.name
            if (refDept) {
                if (!companyDeptMap.has(companyName)) companyDeptMap.set(companyName, new Map())
                const deptMap2 = companyDeptMap.get(companyName)!
                accumulateRanking(deptMap2, refDept, c.referralFeeAmount || 0)
            }
        } else if (!c.referrer && !c.internalReferrerId) {
            accumulateRanking(referrerMap, LABEL_NONE, c.referralFeeAmount || 0)
            accumulateRanking(companyMap, LABEL_NONE, c.referralFeeAmount || 0)
        }
    })

    return {
        annualData: Array.from(annualMap.values()).sort((a, b) => b.year - a.year),
        assigneeRanking: Array.from(assigneeMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        departmentTotals: Array.from(deptRankingMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        referrerRanking: Array.from(referrerMap.values()).sort((a, b) => b.feeTotal - a.feeTotal),
        companyRanking: Array.from(companyMap.values())
            .map(c => ({
                ...c,
                departments: companyDeptMap.has(c.name)
                    ? Array.from(companyDeptMap.get(c.name)!.values()).sort((a, b) => b.feeTotal - a.feeTotal)
                    : [],
            }))
            .sort((a, b) => b.feeTotal - a.feeTotal),
    }
}
