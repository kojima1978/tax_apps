import type { Assignee } from "@tax-apps/shared"

export { DEPARTMENTS } from "@tax-apps/shared"
export type { Assignee } from "@tax-apps/shared"

export const initialAssignees: Assignee[] = [
    { id: "1", name: "鈴木 一郎", employeeId: "001", department: "会計部", active: true },
    { id: "2", name: "田中 次郎", employeeId: "002", department: "資産税部", active: true },
    { id: "3", name: "高橋 三郎", employeeId: "003", department: "資産税部", active: true },
]
