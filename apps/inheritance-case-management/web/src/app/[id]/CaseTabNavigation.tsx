"use client"

import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import type { CaseDetailTab, CaseDetailTabId, CaseDetailTabStatus } from "./case-detail-tabs"

export function getCaseTabButtonId(tab: CaseDetailTabId) {
    return `case-tab-${tab}`
}

export function getCaseTabPanelId(tab: CaseDetailTabId) {
    return `case-tabpanel-${tab}`
}

interface CaseTabNavigationProps {
    tabs: readonly CaseDetailTab[]
    activeTab: CaseDetailTabId
    statuses: Record<CaseDetailTabId, CaseDetailTabStatus>
    onSelect: (tab: CaseDetailTabId) => void
}

/**
 * 案件詳細のタブ。左右の矢印キー・Home・End で移動でき、
 * 未保存の変更があるタブと未入力があるタブには印が付く。
 */
export function CaseTabNavigation({ tabs, activeTab, statuses, onSelect }: CaseTabNavigationProps) {
    const moveFocus = (index: number) => {
        const tab = tabs[index]
        if (!tab) return
        // タブを先に切り替えてからフォーカスを移す（描画を待たずに済むよう同期で反映する）
        flushSync(() => onSelect(tab.id))
        document.getElementById(getCaseTabButtonId(tab.id))?.focus()
    }

    return (
        <div
            role="tablist"
            aria-label="案件詳細の区分"
            className="sticky top-14 z-30 -mx-3 flex items-stretch gap-1 overflow-x-auto border-y bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:-mx-3.5 lg:px-3.5"
        >
            {tabs.map((tab, index) => {
                const status = statuses[tab.id]
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
                            "flex min-h-11 shrink-0 flex-col items-start justify-center gap-0 rounded-md border px-2.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                            isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold">
                            {tab.label}
                            {status.hasChanges && (
                                <span className="rounded bg-amber-100 px-1 text-[11px] font-medium text-amber-900">未保存</span>
                            )}
                            {status.missingCount > 0 && (
                                <span className="rounded bg-red-100 px-1 text-[11px] font-medium text-red-900">要確認{status.missingCount}</span>
                            )}
                        </span>
                        {status.counts.length > 0 && (
                            <span className={cn("whitespace-nowrap text-[11px] font-normal", isActive ? "text-primary/80" : "text-muted-foreground")}>
                                {status.counts.join("・")}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
