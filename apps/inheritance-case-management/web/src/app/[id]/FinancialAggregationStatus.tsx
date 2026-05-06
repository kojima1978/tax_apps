import { BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import { isCompleted } from "@/types/constants"
import type { InheritanceCase } from "@/types/shared"

export function FinancialAggregationStatus({ formData }: { formData: InheritanceCase }) {
    const completed = isCompleted(formData.status)
    const ongoing = formData.status === "手続中" && formData.acceptanceStatus === "受託"

    if (completed) {
        const amount = formData.feeAmount || 0
        return (
            <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black sm:col-span-2">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>確定額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    if (ongoing) {
        const amount = formData.estimateAmount || 0
        return (
            <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black sm:col-span-2">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>見込額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    return (
        <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-muted-foreground sm:col-span-2">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>ダッシュボード集計: 集計対象外（進み具合が「手続中」以降、かつ受託の場合に集計されます）</span>
        </div>
    )
}
