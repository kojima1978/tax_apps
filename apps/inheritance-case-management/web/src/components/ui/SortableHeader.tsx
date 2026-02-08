import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Column } from "@tanstack/react-table"

function SortIcon<T>({ column }: { column: Column<T, unknown> }) {
    const sorted = column.getIsSorted()
    if (sorted === "asc") return <ArrowUp className="ml-1 h-4 w-4" />
    if (sorted === "desc") return <ArrowDown className="ml-1 h-4 w-4" />
    return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
}

interface SortableHeaderProps<T> {
    column: Column<T, unknown>
    children: React.ReactNode
    className?: string
}

export function SortableHeader<T>({ column, children, className }: SortableHeaderProps<T>) {
    const button = (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-xs px-2"
        >
            {children}
            <SortIcon column={column} />
        </Button>
    )

    if (className) {
        return <div className={className}>{button}</div>
    }

    return button
}
