import { FileText, Clock, AlertTriangle, CheckCircle, PlusCircle, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KPIData } from "@/lib/kpi-utils"

export type KPICardFilterKey = "total" | "ongoing" | "completed" | "deadlineSoon" | "addedThisMonth" | "completedThisMonth"

const KPI_CARD_DEFS: readonly {
    key: keyof KPIData
    label: string
    icon: LucideIcon
    color: string
    filterKey?: KPICardFilterKey
}[] = [
    { key: "total", label: "総案件数", icon: FileText, color: "border-slate-200 bg-slate-50 text-slate-700", filterKey: "total" },
    { key: "ongoing", label: "進行中", icon: Clock, color: "border-blue-200 bg-blue-50 text-blue-700", filterKey: "ongoing" },
    { key: "deadlineSoon", label: "期限間近", icon: AlertTriangle, color: "border-amber-200 bg-amber-50 text-amber-800", filterKey: "deadlineSoon" },
    { key: "completed", label: "完了", icon: CheckCircle, color: "border-emerald-200 bg-emerald-50 text-emerald-700", filterKey: "completed" },
    { key: "addedThisMonth", label: "当月追加", icon: PlusCircle, color: "border-violet-200 bg-violet-50 text-violet-700", filterKey: "addedThisMonth" },
    { key: "completedThisMonth", label: "当月完了", icon: CheckCircle2, color: "border-teal-200 bg-teal-50 text-teal-700", filterKey: "completedThisMonth" },
] as const

interface KPICardsProps {
    data: KPIData
    activeFilter?: KPICardFilterKey | null
    onFilterClick?: (filter: KPICardFilterKey) => void
}

export function KPICards({ data, activeFilter, onFilterClick }: KPICardsProps) {
    return (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_CARD_DEFS.map(({ key, label, icon: Icon, color, filterKey }) => {
                const isClickable = !!filterKey && !!onFilterClick
                const isActive = !!filterKey && activeFilter === filterKey
                const className = [
                    "relative flex min-h-16 items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors",
                    isClickable ? "cursor-pointer hover:border-black/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "",
                    isActive ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-1" : "",
                ].filter(Boolean).join(" ")

                const content = (
                    <>
                        <div className={`rounded-md p-1.5 ${color}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-lg font-bold leading-none">{data[key]}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                        </div>
                        {isActive && (
                            <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                                選択中
                            </span>
                        )}
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
                            aria-label={`${label}で絞り込み${isActive ? "（選択中）" : ""}`}
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
