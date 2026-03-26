import type { InheritanceCase } from "@/types/shared"
import { isCompleted, isDeadlineSkip } from "@/types/constants"
import { getDeadlineDate } from "./deadline-utils"

export interface KPIData {
    total: number
    ongoing: number
    deadlineSoon: number
    completed: number
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

    return { total: allCases.length, ongoing, deadlineSoon, completed }
}
