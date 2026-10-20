import type { Assignee, Department } from "@/types/shared"

export type StaffGroup = { dept: Department | null; members: Assignee[] }

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
