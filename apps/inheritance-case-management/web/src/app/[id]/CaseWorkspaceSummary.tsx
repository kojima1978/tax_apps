"use client"

import { useEffect } from "react"
import { Bookmark } from "lucide-react"
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences"
import { addRecentCase, toggleFavorite } from "@/lib/workspace-preferences"
import { useToast } from "@/components/ui/Toast"
import type { InheritanceCase } from "@/types/shared"
import { getMissingCaseInputs, type MissingCaseInput } from "./case-workspace-utils"

export function CaseWorkspaceSummary({ data, savedName, isCreateMode, onNavigate }: { data: InheritanceCase; savedName: string; isCreateMode: boolean; onNavigate: (item: MissingCaseInput) => void }) {
    const { preferences, updatePreferences } = useWorkspacePreferences()
    const toast = useToast()
    // Record the displayed name; recent entries and favorites share the latest name.
    const id = data.id, name = savedName
    useEffect(() => {
        if (!isCreateMode && id > 0) updatePreferences(p => addRecentCase(p, { id, name }))
    }, [id, name, isCreateMode, updatePreferences])
    const favorite = preferences.favorites.some(c => c.id === id)
    const missing = getMissingCaseInputs(data)
    const actions = missing.filter(item => item.priority !== "review")
    const reviews = missing.filter(item => item.priority === "review")
    return (
        <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">入力チェック <span className="font-normal text-muted-foreground">{missing.length > 0 ? `${missing.length}項目を確認` : "不足項目はありません"}</span></h2>
                {!isCreateMode && <button type="button" aria-pressed={favorite} className="flex min-h-10 items-center gap-1 rounded-md border px-3 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => {
                    if (!updatePreferences(p => toggleFavorite(p, { id, name }))) toast.error("お気に入りを保存できませんでした")
                }}><Bookmark className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />{favorite ? "お気に入り登録済み" : "お気に入りに登録"}</button>}
            </div>
            {missing.length > 0 && <div className="space-y-2" aria-label="入力不足の確認項目">
                {actions.length > 0 && <div><p className="mb-1 text-sm font-medium text-amber-900">要対応 · {actions.length}項目</p><div className="flex flex-wrap gap-1">{actions.slice(0, 3).map(item => <button key={item.label} type="button" className="min-h-11 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-sm text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate(item)}>{item.label} →</button>)}</div>
                    {actions.length > 3 && <details className="mt-1"><summary className="min-h-11 cursor-pointer py-2 text-sm text-amber-900">残り{actions.length - 3}項目を表示</summary><div className="flex flex-wrap gap-1">{actions.slice(3).map(item => <button key={item.label} type="button" className="min-h-11 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-sm text-amber-900 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate(item)}>{item.label} →</button>)}</div></details>}
                </div>}
                {reviews.length > 0 && <details><summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">確認事項 · {reviews.length}項目</summary><div className="flex flex-wrap gap-1">{reviews.map(item => <button key={item.label} type="button" className="min-h-11 rounded-md border bg-slate-50 px-2.5 text-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate(item)}>{item.label} →</button>)}</div></details>}
            </div>}
            {missing.length > 0 && <p className="text-xs text-muted-foreground">要対応を優先して表示しています。各項目から入力欄へ移動できます。</p>}
        </div>
    )
}
