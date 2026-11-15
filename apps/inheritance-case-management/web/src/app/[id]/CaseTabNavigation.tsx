"use client"

import { useEffect, useRef } from "react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import type { CaseDetailTab, CaseDetailTabId } from "./case-detail-tabs"

export function getCaseTabButtonId(tab: CaseDetailTabId) {
    return `case-tab-${tab}`
}

export function getCaseTabPanelId(tab: CaseDetailTabId) {
    return `case-tabpanel-${tab}`
}

interface CaseTabNavigationProps {
    tabs: readonly CaseDetailTab[]
    activeTab: CaseDetailTabId
    onSelect: (tab: CaseDetailTabId) => void
}

/**
 * 案件詳細のタブ。区分ごとに1つで、見出しは区分名だけ・幅をそろえた1行。
 * 件数や未保存・要確認の印はタブには出さない（区分名だけの方が並びが読みやすい。
 * 未保存は下部の保存バー、未入力は保存時の一覧で分かる）。
 * 左右の矢印キー・Home・End で移動できる。
 */
export function CaseTabNavigation({ tabs, activeTab, onSelect }: CaseTabNavigationProps) {
    const rowRef = useRef<HTMLDivElement>(null)

    // 画面が狭いと行が横スクロールする。選んでいるタブが見えない位置にあるときだけ横へ寄せる
    // （`?tab=` 付きのリンクを開いた直後がこれ）。縦には触らないので scrollIntoView は使わない
    useEffect(() => {
        const row = rowRef.current
        const button = row?.querySelector<HTMLElement>(`#${CSS.escape(getCaseTabButtonId(activeTab))}`)
        if (!row || !button) return
        const right = button.offsetLeft + button.offsetWidth
        if (button.offsetLeft < row.scrollLeft) row.scrollLeft = button.offsetLeft
        else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth
    }, [activeTab])

    const moveFocus = (index: number) => {
        const tab = tabs[index]
        if (!tab) return
        // タブを先に切り替えてからフォーカスを移す（描画を待たずに済むよう同期で反映する）
        flushSync(() => onSelect(tab.id))
        document.getElementById(getCaseTabButtonId(tab.id))?.focus()
    }

    return (
        <div
            ref={rowRef}
            role="tablist"
            aria-label="案件詳細の区分"
            className="sticky top-14 z-30 lg:top-0 -mx-3 flex items-stretch gap-1 overflow-x-auto border-y bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:-mx-3.5 lg:px-3.5"
        >
            {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        type="button"
                        id={getCaseTabButtonId(tab.id)}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={getCaseTabPanelId(tab.id)}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onSelect(tab.id)}
                        onKeyDown={(event) => {
                            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
                                : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
                                : event.key === "Home" ? 0
                                : event.key === "End" ? tabs.length - 1
                                : null
                            if (next === null) return
                            event.preventDefault()
                            moveFocus(next)
                        }}
                        className={cn(
                            "flex min-h-10 w-20 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-1 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                            isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
