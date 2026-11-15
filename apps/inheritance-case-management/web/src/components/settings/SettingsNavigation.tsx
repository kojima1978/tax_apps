"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"
import { SETTINGS_NAV_LINKS, isSettingsPathCurrent } from "./settings-menu"

function navLinkId(href: string) {
    return `settings-nav-${href.replace(/\//g, "-")}`
}

/**
 * 設定の中の移動。アプリ内の入口は左のサイドバーが持つので、ここは**横1行のタブ**にして
 * サイドバーを二重にしない（案件詳細のタブ行と同じ作法・見出しは短い名前だけで幅をそろえる）。
 */
export function SettingsNavigation() {
    const pathname = usePathname()
    const rowRef = useRef<HTMLElement>(null)

    // 画面が狭いと行が横スクロールする。いまの画面のタブが見えない位置にあるときだけ横へ寄せる
    useEffect(() => {
        const row = rowRef.current
        const current = SETTINGS_NAV_LINKS.find(link => isSettingsPathCurrent(pathname, link.href))
        const link = current && row?.querySelector<HTMLElement>(`#${CSS.escape(navLinkId(current.href))}`)
        if (!row || !link) return
        const rowRect = row.getBoundingClientRect()
        const linkRect = link.getBoundingClientRect()
        const margin = 16 // 端にぴったり付けず、隣のタブが続いていると分かる余白を残す
        if (linkRect.left < rowRect.left + margin) row.scrollLeft -= rowRect.left + margin - linkRect.left
        else if (linkRect.right > rowRect.right - margin) row.scrollLeft += linkRect.right - rowRect.right + margin
    }, [pathname])

    return (
        <div className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 lg:top-0">
            <nav ref={rowRef} aria-label="設定メニュー" className="overflow-x-auto px-4 py-1.5 lg:px-6">
                <div className="mx-auto flex w-max items-stretch gap-1">
                    {SETTINGS_NAV_LINKS.map(({ href, label }) => {
                        const isCurrent = isSettingsPathCurrent(pathname, href)
                        return (
                            <Link
                                key={href}
                                id={navLinkId(href)}
                                href={href}
                                aria-current={isCurrent ? "page" : undefined}
                                className={cn(
                                    "flex min-h-10 w-28 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1",
                                    isCurrent
                                        ? "border-blue-200 bg-blue-50 text-blue-800"
                                        : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                )}
                            >
                                {label}
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
