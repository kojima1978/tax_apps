import { FileText, Clock, AlertTriangle, CheckCircle, PlusCircle, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KPIData } from "@/lib/kpi-utils"

const KPI_CARD_DEFS: readonly { key: keyof KPIData; label: string; icon: LucideIcon; color: string }[] = [
    { key: "total", label: "総案件数", icon: FileText, color: "text-gray-600 bg-gray-100" },
    { key: "ongoing", label: "手続中", icon: Clock, color: "text-blue-600 bg-blue-100" },
    { key: "deadlineSoon", label: "期限間近", icon: AlertTriangle, color: "text-amber-600 bg-amber-100" },
    { key: "completed", label: "完了", icon: CheckCircle, color: "text-green-600 bg-green-100" },
    { key: "addedThisMonth", label: "当月追加", icon: PlusCircle, color: "text-purple-600 bg-purple-100" },
    { key: "completedThisMonth", label: "当月完了", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
] as const

export function KPICards({ data }: { data: KPIData }) {
    return (
        <div className="grid grid-cols-3 gap-2 mb-3 lg:grid-cols-6">
            {KPI_CARD_DEFS.map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2">
                    <div className={`rounded-md p-1.5 ${color}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-lg font-bold leading-none">{data[key]}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}
