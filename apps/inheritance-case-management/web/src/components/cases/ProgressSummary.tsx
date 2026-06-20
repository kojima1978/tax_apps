import type { CaseListItem, CaseStatus } from "@/types/shared"
import { STATUS_STYLES } from "@/types/constants"

const STATUS_FLOW: readonly CaseStatus[] = ["見積前", "見積中", "受託", "手続中", "最終確認", "申告済", "請求済", "入金済"]

export function ProgressSummary({ caseData }: { caseData: CaseListItem }) {
    const currentIndex = caseData.status === "見送り"
        ? STATUS_FLOW.indexOf("見積中")
        : STATUS_FLOW.indexOf(caseData.status)
    const reachedStages = Math.max(currentIndex + 1, 1)
    const statusStyle = STATUS_STYLES[caseData.status as CaseStatus]

    return (
        <div className="min-w-0 space-y-px leading-none">
            <span className={`inline-flex items-center gap-1 rounded-full border border-black/10 px-1 py-px text-[8px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`h-1 w-1 rounded-full ${statusStyle.dot}`} />
                {caseData.status}
            </span>
            <div className="flex h-1.5 items-center gap-1">
                <div
                    role="progressbar"
                    aria-label={`${caseData.deceasedName}様の案件ステータス進捗`}
                    aria-valuemin={1}
                    aria-valuemax={STATUS_FLOW.length}
                    aria-valuenow={reachedStages}
                    aria-valuetext={caseData.status}
                    className="flex h-1.5 w-12 shrink-0 gap-px overflow-hidden rounded-full border border-black/15 bg-gray-100"
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
                <span className="shrink-0 text-[7px] font-medium tabular-nums text-muted-foreground">
                    {reachedStages}/{STATUS_FLOW.length}
                </span>
            </div>
        </div>
    )
}
