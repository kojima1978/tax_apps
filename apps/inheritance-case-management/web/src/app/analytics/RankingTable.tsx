import { formatCurrency } from "@/lib/analytics-utils"

type RankingColumnDef = {
    label: string
    align?: "left" | "right" | "center"
    sortKey?: string
}

interface RankingTableProps {
    data: { name: string; feeTotal: number; count: number }[]
    columns: [RankingColumnDef, RankingColumnDef, RankingColumnDef]
    onSort?: (col: string) => void
    sortState?: { col: string; desc: boolean }
}

export function RankingTable({ data, columns: [nameCol, feeCol, countCol], onSort, sortState }: RankingTableProps) {
    const renderTh = (col: RankingColumnDef) => {
        const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
        const sortable = onSort && col.sortKey
        const indicator = sortable && sortState?.col === col.sortKey
            ? (sortState.desc ? " ▼" : " ▲")
            : ""

        return (
            <th
                key={col.label}
                className={`p-3 ${align} ${sortable ? "cursor-pointer hover:text-foreground" : ""}`}
                onClick={sortable ? () => onSort(col.sortKey!) : undefined}
            >
                {col.label}{indicator}
            </th>
        )
    }

    return (
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                    <tr>
                        {renderTh(nameCol)}
                        {renderTh(feeCol)}
                        {renderTh(countCol)}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.map(r => (
                        <tr key={r.name}>
                            <td className="p-3 font-medium">{r.name}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                            <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
