import { FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KPIData } from "@/lib/kpi-utils"

const KPI_CARD_DEFS: readonly { key: keyof KPIData; label: string; icon: LucideIcon; color: string }[] = [
    { key: "total", label: "総案件数", icon: FileText, color: "text-gray-600 bg-gray-100" },
    { key: "ongoing", label: "進行中", icon: Clock, color: "text-blue-600 bg-blue-100" },
    { key: "deadlineSoon", label: "期限間近", icon: AlertTriangle, color: "text-amber-600 bg-amber-100" },
    { key: "completedThisMonth", label: "今月完了", icon: CheckCircle, color: "text-green-600 bg-green-100" },
] as const

export function KPICards({ data }: { data: KPIData }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {KPI_CARD_DEFS.map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                    <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data[key]}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}
