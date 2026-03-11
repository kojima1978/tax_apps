import type { InheritanceCase } from "@/types/shared"
import { getDeadlineDate } from "./deadline-utils"

export interface KPIData {
    total: number
    ongoing: number
    deadlineSoon: number
    completedThisMonth: number
}

export function computeKPI(allCases: InheritanceCase[]): KPIData {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const accepted = allCases.filter(c => c.acceptanceStatus === "受託可")

    const ongoing = accepted.filter(c => c.status === "進行中").length

    const deadlineSoon = accepted.filter(c => {
        if (c.status === "完了") return false
        const deadline = getDeadlineDate(c.dateOfDeath)
        return deadline <= in30Days && deadline >= now
    }).length

    const completedThisMonth = accepted.filter(c => {
        if (c.status !== "完了") return false
        const updated = c.updatedAt ? new Date(c.updatedAt) : null
        return updated && updated.getMonth() === thisMonth && updated.getFullYear() === thisYear
    }).length

    return { total: allCases.length, ongoing, deadlineSoon, completedThisMonth }
}
