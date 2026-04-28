import { FileText, Clock, AlertTriangle, CheckCircle, PlusCircle, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KPIData } from "@/lib/kpi-utils"

export type KPICardFilterKey = "addedThisMonth" | "completedThisMonth"

const KPI_CARD_DEFS: readonly {
    key: keyof KPIData
    label: string
    icon: LucideIcon
    color: string
    filterKey?: KPICardFilterKey
}[] = [
    { key: "total", label: "総案件数", icon: FileText, color: "text-black bg-white border border-black/10" },
    { key: "ongoing", label: "手続中", icon: Clock, color: "text-black bg-white border border-black/10" },
    { key: "deadlineSoon", label: "期限間近", icon: AlertTriangle, color: "text-black bg-white border border-black/10" },
    { key: "completed", label: "完了", icon: CheckCircle, color: "text-black bg-white border border-black/10" },
    { key: "addedThisMonth", label: "当月追加", icon: PlusCircle, color: "text-black bg-white border border-black/10", filterKey: "addedThisMonth" },
    { key: "completedThisMonth", label: "当月完了", icon: CheckCircle2, color: "text-black bg-white border border-black/10", filterKey: "completedThisMonth" },
] as const

interface KPICardsProps {
    data: KPIData
    activeFilter?: KPICardFilterKey | null
    onFilterClick?: (filter: KPICardFilterKey) => void
}

export function KPICards({ data, activeFilter, onFilterClick }: KPICardsProps) {
    return (
        <div className="grid grid-cols-3 gap-2 mb-3 lg:grid-cols-6">
            {KPI_CARD_DEFS.map(({ key, label, icon: Icon, color, filterKey }) => {
                const isClickable = !!filterKey && !!onFilterClick
                const isActive = !!filterKey && activeFilter === filterKey
                const className = [
                    "flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors",
                    isClickable ? "cursor-pointer hover:border-black/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "",
                    isActive ? "border-black bg-muted/50 ring-1 ring-black" : "",
                ].filter(Boolean).join(" ")

                const content = (
                    <>
                        <div className={`rounded-md p-1.5 ${color}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-lg font-bold leading-none">{data[key]}</div>
                            <div className="text-xs text-muted-foreground">{label}</div>
                        </div>
                    </>
                )

                if (isClickable && filterKey) {
                    return (
                        <button
                            key={key}
                            type="button"
                            className={className}
                            onClick={() => onFilterClick(filterKey)}
                            aria-pressed={isActive}
                            title={`${label}で絞り込み`}
                        >
                            {content}
                        </button>
                    )
                }

                return (
                    <div key={key} className={className}>
                        {content}
                    </div>
                )
            })}
        </div>
    )
}
