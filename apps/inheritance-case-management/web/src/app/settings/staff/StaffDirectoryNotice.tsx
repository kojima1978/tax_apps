import { useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { StaffDirectorySyncResult } from "@/lib/api/staff-directory"

interface StaffDirectoryNoticeProps {
    sync: StaffDirectorySyncResult | null
    onResync: () => Promise<void>
}

// 担当者・部署は社員台帳が正で、ここは写しを見せるだけ。直す場所と、写しがいつのものかを出す
export function StaffDirectoryNotice({ sync, onResync }: StaffDirectoryNoticeProps) {
    const [busy, setBusy] = useState(false)

    const handleResync = async () => {
        setBusy(true)
        try {
            await onResync()
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="mb-6 rounded-lg border bg-card px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm flex-1 min-w-[16rem]">
                    担当者・部署は<strong>社員台帳</strong>で管理しています。追加・修正・退職は社員台帳で行ってください（数分以内にここへ反映されます）。
                </p>
                <a
                    href="/staff-directory/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2"
                >
                    社員台帳を開く<ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button variant="outline" size="sm" onClick={handleResync} disabled={busy}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${busy ? "animate-spin" : ""}`} />今すぐ読み直す
                </Button>
            </div>

            {sync && (
                <p className="text-xs text-muted-foreground">
                    最後に読み込んだ日時: {new Date(sync.at).toLocaleString("ja-JP")}
                </p>
            )}
            {sync && !sync.ok && (
                <p className="text-xs text-red-700">
                    社員台帳を読めませんでした（{sync.error}）。前回までの写しを表示しています。
                </p>
            )}
            {sync && sync.unlinkedAssignees.length > 0 && (
                <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p className="font-medium">社員台帳と結び付いていない担当者が {sync.unlinkedAssignees.length} 名います（台帳の変更が反映されません）:</p>
                    <p className="mt-1">{sync.unlinkedAssignees.map(a => a.name).join("、")}</p>
                    <p className="mt-1">
                        社員台帳で <code className="font-mono">npm run import:itcm -- --yes</code> を流すと結び付きます。
                    </p>
                </div>
            )}
        </div>
    )
}
