"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useToast } from "@/components/ui/Toast"
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences"
import { LIST_COLUMN_OPTIONS, LIST_VIEWS } from "@/lib/workspace-preferences"
import type { CasesQueryParams } from "@/lib/api/cases"
import { parseCaseListUrlParams, toCaseListUrlSearch } from "./case-list-utils"

export function CaseListPreferences({ params, onApply }: { params: CasesQueryParams; onApply: (params: CasesQueryParams) => void }) {
    const { preferences, updatePreferences } = useWorkspacePreferences()
    const [name, setName] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const toast = useToast()
    const columns = preferences.columns ?? LIST_VIEWS[preferences.listView].columns
    const update: typeof updatePreferences = action => {
        const success = updatePreferences(action)
        if (!success) toast.error("ブラウザに設定を保存できませんでした")
        return success
    }
    return (
        <>
            <Button variant="outline" onClick={() => setIsOpen(true)}>検索条件の保存・表示設定</Button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="検索条件の保存・表示設定" panelClassName="max-w-2xl">
            <div className="space-y-3 py-2">
                <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-0"><span className="mb-1 block text-xs font-medium">条件名</span><Input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="例：今月の申告対象" className="w-full sm:w-60" /></label>
                    <Button type="button" variant="outline" disabled={!name.trim() || (preferences.savedSearches.length >= 30 && !preferences.savedSearches.some(item => item.name === name.trim()))} onClick={() => {
                        const query = toCaseListUrlSearch({ ...params, page: 1, search: params.search ?? "" })
                        if (update(p => ({ ...p, savedSearches: [...p.savedSearches.filter(item => item.name !== name.trim()), { id: p.savedSearches.find(item => item.name === name.trim())?.id ?? crypto.randomUUID(), name: name.trim(), query }] }))) {
                            setName(""); toast.success("検索条件を保存しました")
                        }
                    }}>現在の条件を保存</Button>
                </div>
                <ul className="flex flex-wrap gap-2">{preferences.savedSearches.map(item => <li key={item.id} className="flex max-w-full items-center rounded-md border">
                    <button type="button" className="min-h-11 min-w-0 px-3 text-sm hover:bg-blue-50" onClick={() => { onApply(parseCaseListUrlParams(new URLSearchParams(item.query), false)); setIsOpen(false) }}>{item.name}</button>
                    <button type="button" aria-label={`${item.name}の保存条件を削除`} className="min-h-11 px-3 text-muted-foreground hover:bg-red-50" onClick={() => update(p => ({ ...p, savedSearches: p.savedSearches.filter(s => s.id !== item.id) }))}>×</button>
                </li>)}</ul>
                <div className="flex flex-wrap gap-4">
                    <label className="text-xs font-medium">表示内容<select aria-label="一覧の表示内容" className="ml-2 min-h-11 rounded-md border bg-white px-2 text-sm" value={preferences.listView} onChange={e => update(p => ({ ...p, listView: e.target.value as keyof typeof LIST_VIEWS, columns: undefined }))}>{Object.entries(LIST_VIEWS).map(([key, view]) => <option key={key} value={key}>{view.label}</option>)}</select></label>
                    <label className="text-xs font-medium">表示密度<select aria-label="一覧の表示密度" className="ml-2 min-h-11 rounded-md border bg-white px-2 text-sm" value={preferences.density} onChange={e => update(p => ({ ...p, density: e.target.value as "standard" | "compact" }))}><option value="standard">標準（読みやすさ優先）</option><option value="compact">コンパクト</option></select></label>
                </div>
                <div className="flex flex-wrap gap-3" role="group" aria-label="表示する列">{LIST_COLUMN_OPTIONS.map(column => <label key={column.id} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={columns.includes(column.id)} onChange={e => update(p => ({ ...p, columns: e.target.checked ? [...columns, column.id] as typeof p.columns : columns.filter(id => id !== column.id) as typeof p.columns }))} />{column.label}</label>)}</div>
                <p className="text-xs text-muted-foreground">検索条件・表示設定はこのブラウザに保存されます。</p>
            </div>
            </Modal>
        </>
    )
}
