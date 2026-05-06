import type { ReactNode } from "react"

export type MasterListItem = { id: number; active: boolean }

export interface ColumnDef<T> {
    key: string
    label: string
    width?: string
    cellClassName?: string
    renderCell?: (item: T) => ReactNode
}
