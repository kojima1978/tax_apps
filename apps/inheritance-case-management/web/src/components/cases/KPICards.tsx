import { Clock, AlertTriangle, CheckCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KPIData } from "@/lib/kpi-utils"

export type KPICardFilterKey = "total" | "ongoing" | "completed" | "deadlineSoon" | "deadlineOverdue" | "addedThisMonth" | "completedThisMonth"

const KPI_CARD_DEFS: readonly {
    key: keyof KPIData
    label: string
    icon: LucideIcon
    color: string
    filterKey?: KPICardFilterKey
}[] = [
    { key: "ongoing", label: "進行中", icon: Clock, color: "border-blue-200 bg-blue-50 text-blue-700", filterKey: "ongoing" },
    { key: "deadlineOverdue", label: "期限超過", icon: AlertTriangle, color: "border-red-200 bg-red-50 text-red-700", filterKey: "deadlineOverdue" },
    { key: "deadlineSoon", label: "14日以内", icon: AlertTriangle, color: "border-amber-200 bg-amber-50 text-amber-800", filterKey: "deadlineSoon" },
    { key: "completed", label: "完了", icon: CheckCircle, color: "border-emerald-200 bg-emerald-50 text-emerald-700", filterKey: "completed" },
] as const

interface KPICardsProps {
    data: KPIData
    scopeLabel: string
    activeFilter?: KPICardFilterKey | null
    onFilterClick?: (filter: KPICardFilterKey) => void
}

export function KPICards({ data, scopeLabel, activeFilter, onFilterClick }: KPICardsProps) {
    return (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 border-b pb-2">
            <div className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap">
            {KPI_CARD_DEFS.map(({ key, label, icon: Icon, color, filterKey }) => {
                const isClickable = !!filterKey && !!onFilterClick
                const isActive = !!filterKey && activeFilter === filterKey
                const className = [
                    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                    isClickable ? "cursor-pointer hover:border-black/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "",
                    isActive ? "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-300" : "",
                ].filter(Boolean).join(" ")

                const content = (
                    <>
                        <div className={`rounded p-1 ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex min-w-0 items-baseline gap-2">
                            <span className="whitespace-nowrap text-sm">{label}</span>
                            <span className="text-base font-semibold tabular-nums">{data[key]}</span>
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
            <span className="py-2 text-xs text-slate-500" title="検索・年度などの基本条件に一致する総件数です。終了案件を含み、上の状態・期限の選択では変わりません。">
                {scopeLabel} · 全{data.total}件（終了含む）
            </span>
        </div>
    )
}
