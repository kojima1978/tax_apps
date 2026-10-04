"use client"

import { Button } from "@/components/ui/Button"

/**
 * 一覧の読み込みに失敗したことを画面に出し続ける帯。
 *
 * 読み込みの失敗を握り潰す（`console.error` だけ・トーストだけ）と、残るのは空の一覧で、
 * 「まだ1件も登録していない」と「読めなかった」が画面で区別できない。トーストは消えるので、
 * 直す口（読み込み直す）と一緒に居座らせる。
 */
export function MasterLoadError({
    label,
    message,
    onReload,
}: {
    label: string
    message: string
    onReload?: () => void
}) {
    return (
        <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-destructive text-sm font-bold">{label}を読み込めませんでした。</p>
            <p className="text-muted-foreground text-xs">{message}</p>
            {onReload && (
                <Button variant="outline" size="sm" onClick={onReload} className="h-8 rounded-md px-3">
                    読み込み直す
                </Button>
            )}
        </div>
    )
}
