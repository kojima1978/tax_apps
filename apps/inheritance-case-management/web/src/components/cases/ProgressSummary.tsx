import type { InheritanceCase, CaseStatus } from "@/types/shared"
import { STATUS_STYLES } from "@/types/constants"
import { StatusBadge } from "@/components/ui/StatusBadge"

const STATUS_FLOW: readonly CaseStatus[] = ["見積前", "見積中", "受託", "手続中", "申告済", "請求済", "入金済"]

export function ProgressSummary({ caseData }: { caseData: InheritanceCase }) {
    const currentIndex = caseData.status === "見送り"
        ? STATUS_FLOW.indexOf("見積中")
        : STATUS_FLOW.indexOf(caseData.status)
    const reachedStages = Math.max(currentIndex + 1, 1)

    return (
        <div className="min-w-0 space-y-1.5 py-0.5">
            <StatusBadge label={caseData.status} style={STATUS_STYLES[caseData.status as CaseStatus]} />
            <div className="flex items-center gap-1.5">
                <div
                    role="progressbar"
                    aria-label={`${caseData.deceasedName}様の案件ステータス進捗`}
                    aria-valuemin={1}
                    aria-valuemax={STATUS_FLOW.length}
                    aria-valuenow={reachedStages}
                    aria-valuetext={caseData.status}
                    className="flex h-2.5 w-16 shrink-0 gap-px overflow-hidden rounded-full border border-black/15 bg-gray-100 p-px"
                >
                    {STATUS_FLOW.map((status, index) => (
                        <span
                            key={status}
                            title={`${index + 1}. ${status}`}
                            className={`h-full min-w-0 flex-1 cursor-help first:rounded-l-full last:rounded-r-full ${
                                index < reachedStages ? "bg-black" : "bg-gray-200"
                            }`}
                            aria-hidden="true"
                        />
                    ))}
                </div>
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {reachedStages}/{STATUS_FLOW.length}
                </span>
            </div>
        </div>
    )
}
