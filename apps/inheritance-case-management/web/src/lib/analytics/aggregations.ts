import type { InheritanceCase } from "@/types/shared"
import { formatReferrerLabel } from "@/types/shared"
import { isAccepted, isAnalyticsConfirmedStatus, isCompleted } from "@/types/constants"
import { calcNet, calcNetPersonal, calcReferralFee, getAnalyticsBaseType, LABEL_NONE, LABEL_UNSET } from "./calculations"

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
    confirmedFee?: number
    estimateFee?: number
    assignedConfirmedFee?: number
    assignedEstimateFee?: number
    referralConfirmedFee?: number
    referralEstimateFee?: number
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

function accumulateRanking(map: Map<string, RankingData>, key: string, fee: number, baseType?: "fee" | "estimate" | null) {
    if (!map.has(key)) map.set(key, { name: key, feeTotal: 0, count: 0, confirmedFee: 0, estimateFee: 0 })
    const d = map.get(key)!
    d.feeTotal += fee
    d.count++
    if (baseType === "fee") d.confirmedFee! += fee
    else if (baseType === "estimate") d.estimateFee! += fee
}

/** 移動年計データ（月ごとの直近12ヶ月累計） */
export type RollingAnnualPoint = {
    label: string       // "2025/04"
    year: number
    month: number
    monthStart: string  // "2025-04-01"
    monthEnd: string    // 翌月初日（排他的上限）
    monthlyFee: number
    monthlyCount: number
    feeTotal: number    // 確定売上の12ヶ月累計
    count: number       // 件数の12ヶ月累計
}

/** 入金済み案件を月別に集計し、移動年計を算出（基準: 入金日 paidDate） */
type MonthlyRollup = { fee: number; count: number }

function addMonthlyRollup(map: Map<string, MonthlyRollup>, key: string, fee: number, count = 1) {
    if (!map.has(key)) map.set(key, { fee: 0, count: 0 })
    const m = map.get(key)!
    m.fee += fee
    m.count += count
}

function assigneeDepartmentName(name: string | null | undefined, deptMap: Map<string, string>): string {
    if (!name) return LABEL_UNSET
    return deptMap.get(name) || LABEL_UNSET
}

export function computeRollingAnnual(
    cases: InheritanceCase[],
    baseMonth?: string,
    departmentName?: string,
    deptMap: Map<string, string> = new Map(),
): RollingAnnualPoint[] {
    const monthlyMap = new Map<string, { fee: number; count: number }>()
    cases.forEach(c => {
        if (!isAnalyticsConfirmedStatus(c.status)) return
        if (!c.paidDate) return
        const d = new Date(c.paidDate)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

        if (!departmentName) {
            addMonthlyRollup(monthlyMap, key, calcNet(c, "fee"))
            return
        }

        const assignedDeptName = assigneeDepartmentName(c.assignee?.name, deptMap)
        if (assignedDeptName === departmentName) {
            addMonthlyRollup(monthlyMap, key, calcNetPersonal(c, "fee"))
        }

        const referralFee = calcReferralFee(c, "fee")
        if (referralFee > 0 && c.internalReferrerId != null) {
            const refDeptName = assigneeDepartmentName(c.internalReferrer?.name, deptMap)
            if (refDeptName === departmentName) {
                addMonthlyRollup(monthlyMap, key, referralFee)
            }
        }
    })

    const now = new Date()
    const validBaseMonth = baseMonth?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
    const baseYear = validBaseMonth ? Number(validBaseMonth[1]) : now.getFullYear()
    const baseMonthNumber = validBaseMonth ? Number(validBaseMonth[2]) : now.getMonth() + 1
    const baseDate = new Date(baseYear, baseMonthNumber - 1, 1)

    const toMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
    }

    const result: RollingAnnualPoint[] = []
    for (let offset = -23; offset <= 0; offset++) {
        const pointDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1)
        const point = toMonth(pointDate)
        const monthly = monthlyMap.get(point.key) || { fee: 0, count: 0 }
        let feeTotal = 0, count = 0
        for (let windowOffset = -11; windowOffset <= 0; windowOffset++) {
            const windowDate = new Date(point.year, point.month - 1 + windowOffset, 1)
            const data = monthlyMap.get(toMonth(windowDate).key)
            if (data) { feeTotal += data.fee; count += data.count }
        }
        const nextMonth = toMonth(new Date(point.year, point.month, 1))
        result.push({
            label: `${point.year}/${String(point.month).padStart(2, '0')}`,
            year: point.year,
            month: point.month,
            monthStart: `${point.key}-01`,
            monthEnd: `${nextMonth.key}-01`,
            monthlyFee: monthly.fee,
            monthlyCount: monthly.count,
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

        const baseType = getAnalyticsBaseType(c)

        if (baseType === "fee") {
            annual.feeTotal += calcNet(c, "fee")
            annual.count++
        } else if (baseType === "estimate") {
            annual.estimateTotal += calcNet(c, "estimate")
            annual.count++
        }

        if (isAccepted(c.status)) {
            if (isCompleted(c.status)) annual.statusCounts.completed++
            else if (c.status === "手続中" || c.status === "最終確認") annual.statusCounts.ongoing++
            else if (c.status === "受託") annual.statusCounts.notStarted++
        }

        if (isAccepted(c.status)) annual.acceptanceCounts.accepted++
        else if (c.status === "見送り") annual.acceptanceCounts.rejected++
        else annual.acceptanceCounts.undecided++

        let personalNet = 0
        let referralFee = 0
        if (baseType) {
            personalNet = calcNetPersonal(c, baseType)
            referralFee = calcReferralFee(c, baseType)
        }

        const initRanking = (name: string): RankingData => ({ name, feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0, confirmedFee: 0, estimateFee: 0, assignedConfirmedFee: 0, assignedEstimateFee: 0, referralConfirmedFee: 0, referralEstimateFee: 0 })

        const addAssigned = (entry: RankingData, amount: number) => {
            entry.feeTotal += amount
            entry.assignedFee! += amount
            entry.assignedCount! ++
            if (baseType === "fee") { entry.confirmedFee! += amount; entry.assignedConfirmedFee! += amount }
            else if (baseType === "estimate") { entry.estimateFee! += amount; entry.assignedEstimateFee! += amount }
        }

        const addReferral = (entry: RankingData, amount: number) => {
            entry.feeTotal += amount
            entry.referralFee! += amount
            entry.referralCount! ++
            if (baseType === "fee") { entry.confirmedFee! += amount; entry.referralConfirmedFee! += amount }
            else if (baseType === "estimate") { entry.estimateFee! += amount; entry.referralEstimateFee! += amount }
        }

        // 担当者・部門別も売上集計と同じ対象ステータスだけを数える
        if (baseType) {
            const assigneeName = c.assignee?.name || LABEL_UNSET
            if (!assigneeMap.has(assigneeName)) assigneeMap.set(assigneeName, initRanking(assigneeName))
            const assigneeEntry = assigneeMap.get(assigneeName)!
            addAssigned(assigneeEntry, personalNet)
            assigneeEntry.count++

            // 社内紹介者の紹介売上 → internalReferrer で紐づいた担当者に加算
            if (referralFee > 0 && c.internalReferrerId != null) {
                const refAssigneeName = c.internalReferrer?.name || LABEL_UNSET
                if (!assigneeMap.has(refAssigneeName)) assigneeMap.set(refAssigneeName, initRanking(refAssigneeName))
                addReferral(assigneeMap.get(refAssigneeName)!, referralFee)
            }

            const deptName = deptMap.get(assigneeName) || LABEL_UNSET
            if (!deptRankingMap.has(deptName)) deptRankingMap.set(deptName, initRanking(deptName))
            const deptEntry = deptRankingMap.get(deptName)!
            addAssigned(deptEntry, personalNet)
            deptEntry.count++

            if (referralFee > 0 && c.internalReferrerId != null) {
                const refAssigneeName = c.internalReferrer?.name || LABEL_UNSET
                const refDeptName = deptMap.get(refAssigneeName) || LABEL_UNSET
                if (!deptRankingMap.has(refDeptName)) deptRankingMap.set(refDeptName, initRanking(refDeptName))
                addReferral(deptRankingMap.get(refDeptName)!, referralFee)
            }
        }

        // 紹介者ランキング（社外紹介者のみ + 社内紹介者）— 完了・手続中のみ集計
        if (baseType) {
            const refFee = calcReferralFee(c, baseType)
            if (c.referrer) {
                const referrerKey = formatReferrerLabel(c.referrer)
                accumulateRanking(referrerMap, referrerKey, refFee, baseType)
                const refEntry = referrerMap.get(referrerKey)
                if (refEntry) refEntry.group = c.referrer.company.name
                const companyName = c.referrer.company.name
                accumulateRanking(companyMap, companyName, refFee, baseType)
                const refDept = c.referrer.branch?.name
                if (refDept) {
                    if (!companyDeptMap.has(companyName)) companyDeptMap.set(companyName, new Map())
                    const deptMap2 = companyDeptMap.get(companyName)!
                    accumulateRanking(deptMap2, refDept, refFee, baseType)
                }
            } else if (!c.referrer && !c.internalReferrerId) {
                accumulateRanking(referrerMap, LABEL_NONE, refFee, baseType)
                accumulateRanking(companyMap, LABEL_NONE, refFee, baseType)
            }
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
