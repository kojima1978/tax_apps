import type { Assignee, Department } from "@/types/shared"

export type EditingAssignee = { id: number; name: string; employeeId: string; departmentId: string }
export type NewAssigneeDraft = { name: string; employeeId: string }
export type StaffGroup = { dept: Department | null; members: Assignee[] }

export function formatEmployeeId(value: string) {
    if (!value) return ""
    const num = parseInt(value, 10)
    if (isNaN(num)) return value
    return num.toString().padStart(3, "0")
}

export function isValidEmployeeId(value: string) {
    if (!value) return true
    const num = parseInt(value, 10)
    return !isNaN(num) && num >= 0 && num <= 999
}

export function getGroupedAssignees({
    assignees,
    activeDepts,
    showInactive,
    filterDept,
}: {
    assignees: Assignee[]
    activeDepts: Department[]
    showInactive: boolean
    filterDept: string
}): StaffGroup[] {
    const visibleAssignees = showInactive ? assignees : assignees.filter(a => a.active)
    const deptFiltered = filterDept
        ? visibleAssignees.filter(a => filterDept === "none" ? !a.departmentId : a.departmentId === Number(filterDept))
        : visibleAssignees

    const deptOrder = filterDept
        ? (filterDept === "none" ? [null] : activeDepts.filter(d => d.id === Number(filterDept)))
        : [...activeDepts, null]

    const groups: StaffGroup[] = []
    for (const dept of deptOrder) {
        const deptObj = dept && typeof dept === "object" ? dept : null
        const members = deptFiltered
            .filter(a => deptObj ? a.departmentId === deptObj.id : !a.departmentId)
            .sort((a, b) => (a.employeeId || "999").localeCompare(b.employeeId || "999") || a.name.localeCompare(b.name))
        if (members.length > 0 || (deptObj && !filterDept)) {
            groups.push({ dept: deptObj, members })
        }
    }

    return groups
}
