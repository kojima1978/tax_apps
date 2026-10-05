import type { CaseListItem, CaseStatus } from "@/types/shared"
import { STATUS_STYLES } from "@/types/constants"

const STATUS_FLOW: readonly CaseStatus[] = ["見積前", "見積中", "受託", "手続中", "最終確認", "申告済", "請求済", "入金済"]

/**
 * 以前は 48×6px の8分割バーで段階を表し、段階名は title 属性（ホバー）でしか
 * 読めなかった。タッチでもキーボードでも到達できないうえ、1マス6px では
 * 何段階目かも目視できない。段階数を文字で出すほうが情報量は落ちない。
 */
export function ProgressSummary({ caseData }: { caseData: CaseListItem }) {
    const statusStyle = STATUS_STYLES[caseData.status as CaseStatus]
    const isDeclined = caseData.status === "見送り"
    const reachedStages = Math.max(STATUS_FLOW.indexOf(caseData.status) + 1, 1)

    return (
        <div className="min-w-0 leading-tight">
            <span className={`inline-flex items-center gap-1 rounded-full border border-black/10 px-1.5 py-0.5 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`h-1 w-1 rounded-full ${statusStyle.dot}`} />
                {caseData.status}
            </span>
            {/* 見送りは段階を進まずに打ち切った案件なので、段階数を出すと誤解を生む */}
            {!isDeclined && (
                <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {reachedStages}/{STATUS_FLOW.length} 段階
                </div>
            )}
        </div>
    )
}
