import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Column } from "@tanstack/react-table"

export function SortIcon({ direction }: { direction: "asc" | "desc" | false | null }) {
    if (direction === "asc") return <ArrowUp className="ml-1 h-3.5 w-3.5" />
    if (direction === "desc") return <ArrowDown className="ml-1 h-3.5 w-3.5" />
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
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
            className="h-7 -ml-1.5 px-1.5 text-[11px]"
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
