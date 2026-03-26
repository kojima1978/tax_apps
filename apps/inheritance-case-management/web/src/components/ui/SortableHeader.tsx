import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Column } from "@tanstack/react-table"

export function SortIcon({ direction }: { direction: "asc" | "desc" | false | null }) {
    if (direction === "asc") return <ArrowUp className="ml-1 h-4 w-4" />
    if (direction === "desc") return <ArrowDown className="ml-1 h-4 w-4" />
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
            className="h-8 text-xs -ml-2 px-2"
        >
            {children}
            <SortIcon direction={column.getIsSorted()} />
        </Button>
    )

    if (className) {
        return <div className={className}>{button}</div>
    }

    return button
}
