export type Assignee = {
    id: string
    name: string
    employeeId?: string
    department: string
    active?: boolean // true = 有効, false = 無効化済み, undefined = true (下位互換性)
}

export const DEPARTMENTS = [
    "会計部",
    "医療部",
    "建設部",
    "資産税部",
] as const

export const initialAssignees: Assignee[] = [
    { id: "1", name: "鈴木 一郎", employeeId: "001", department: "会計部" },
    { id: "2", name: "田中 次郎", employeeId: "002", department: "資産税部" },
    { id: "3", name: "高橋 三郎", employeeId: "003", department: "資産税部" },
]
