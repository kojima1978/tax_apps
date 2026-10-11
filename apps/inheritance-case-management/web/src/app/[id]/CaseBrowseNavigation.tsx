"use client"

import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/Button"
import { readCaseListNavigation } from "@/lib/case-list-navigation"

const subscribe = () => () => {}
const getSnapshot = () => {
    const context = readCaseListNavigation()
    return context ? JSON.stringify(context) : null
}
const getServerSnapshot = () => null

export function CaseBrowseNavigation({ id, disabled, onNavigate }: { id: number; disabled: boolean; onNavigate: (href: string) => void }) {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const context = raw ? JSON.parse(raw) as NonNullable<ReturnType<typeof readCaseListNavigation>> : null
    const index = context?.cases.findIndex(item => item.id === id) ?? -1
    const previous = context && index > 0 ? context.cases[index - 1] : null
    const next = context && index >= 0 ? context.cases[index + 1] : null
    return <nav aria-label="案件の移動" className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={disabled} onClick={() => onNavigate(index >= 0 && context ? `/${context.query ? `?${context.query}` : ""}` : "/")}>一覧に戻る</Button>
        {index >= 0 && <>
            <Button variant="ghost" disabled={disabled || !previous} title={previous?.name} onClick={() => previous && onNavigate(`/${previous.id}?sections=closed`)}>← 前の案件</Button>
            <span className="text-xs text-muted-foreground">このページの {index + 1} / {context?.cases.length} 件</span>
            <Button variant="ghost" disabled={disabled || !next} title={next?.name} onClick={() => next && onNavigate(`/${next.id}?sections=closed`)}>次の案件 →</Button>
        </>}
    </nav>
}
