import type { InheritanceCase } from "@/types/shared"
import { isCompleted, isDeadlineSkip } from "@/types/constants"
import { getDeadlineDate } from "./deadline-utils"

export interface KPIData {
    total: number
    ongoing: number
    deadlineSoon: number
    completed: number
    addedThisMonth: number
    completedThisMonth: number
}

function isThisMonth(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`
    const endMonth = m === 11 ? 0 : m + 1
    const endYear = m === 11 ? y + 1 : y
    const end = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`
    return dateStr >= start && dateStr < end
}

export function computeKPI(allCases: InheritanceCase[]): KPIData {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const accepted = allCases.filter(c => c.acceptanceStatus === "受託可")

    const ongoing = accepted.filter(c => c.status === "手続中").length

    const deadlineSoon = accepted.filter(c => {
        if (isDeadlineSkip(c.status, c.handlingStatus)) return false
        const deadline = getDeadlineDate(c.dateOfDeath)
        return deadline <= in30Days && deadline >= now
    }).length

    const completed = accepted.filter(c => isCompleted(c.status)).length

    const addedThisMonth = allCases.filter(c => isThisMonth(c.caseAddedDate)).length
    const completedThisMonth = allCases.filter(c => isThisMonth(c.caseCompletedDate)).length

    return { total: allCases.length, ongoing, deadlineSoon, completed, addedThisMonth, completedThisMonth }
}
