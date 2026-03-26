import { formatCurrency, LABEL_NONE } from "@/lib/analytics-utils"

type RankingColumnDef = {
    label: string
    align?: "left" | "right" | "center"
    sortKey?: string
}

type RankingItem = { name: string; feeTotal: number; count: number; group?: string; departments?: RankingItem[] }

interface RankingTableProps {
    data: RankingItem[]
    columns: [RankingColumnDef, RankingColumnDef, RankingColumnDef]
    onSort?: (col: string) => void
    sortState?: { col: string; desc: boolean }
    groupBy?: boolean
    showSubRows?: boolean
}

export function RankingTable({ data, columns: [nameCol, feeCol, countCol], onSort, sortState, groupBy, showSubRows }: RankingTableProps) {
    const renderTh = (col: RankingColumnDef) => {
        const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
        const sortable = onSort && col.sortKey
        const indicator = sortable && sortState?.col === col.sortKey
            ? (sortState?.desc ? " ▼" : " ▲")
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

    // Group rows by group field
    const rows: React.ReactNode[] = []
    if (groupBy) {
        let lastGroup: string | undefined
        const groupTotals = new Map<string, { feeTotal: number; count: number }>()
        data.forEach(r => {
            const g = r.group || LABEL_NONE
            const t = groupTotals.get(g) || { feeTotal: 0, count: 0 }
            t.feeTotal += r.feeTotal
            t.count += r.count
            groupTotals.set(g, t)
        })

        data.forEach(r => {
            const group = r.group || LABEL_NONE
            if (group !== lastGroup) {
                const totals = groupTotals.get(group)
                rows.push(
                    <tr key={`group-${group}`} className="bg-muted/60">
                        <td className="p-2 pl-3 font-semibold text-sm">{group}</td>
                        <td className="p-2 text-right text-sm font-semibold text-muted-foreground">{formatCurrency(totals?.feeTotal || 0)}</td>
                        <td className="p-2 text-center text-sm font-semibold text-muted-foreground">{totals?.count || 0}</td>
                    </tr>
                )
                lastGroup = group
            }
            // Display name without company prefix for grouped view
            const displayName = r.name.includes(" / ")
                ? r.name.substring(r.name.indexOf(" / ") + 3)
                : r.name
            rows.push(
                <tr key={r.name}>
                    <td className="p-3 pl-6 font-medium">{displayName || "（担当者なし）"}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                    <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                </tr>
            )
        })
    } else {
        data.forEach(r => {
            rows.push(
                <tr key={r.name}>
                    <td className={`p-3 font-medium ${showSubRows && r.departments && r.departments.length > 0 ? "font-semibold" : ""}`}>{r.name}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                    <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                </tr>
            )
            if (showSubRows && r.departments) {
                r.departments.forEach(dept => {
                    rows.push(
                        <tr key={`${r.name}-${dept.name}`} className="bg-muted/30">
                            <td className="p-2 pl-6 text-xs text-muted-foreground">{dept.name}</td>
                            <td className="p-2 text-right text-xs text-muted-foreground">{formatCurrency(dept.feeTotal)}</td>
                            <td className="p-2 text-center text-xs text-muted-foreground">{dept.count}</td>
                        </tr>
                    )
                })
            }
        })
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
                    {rows}
                </tbody>
            </table>
        </div>
    )
}
