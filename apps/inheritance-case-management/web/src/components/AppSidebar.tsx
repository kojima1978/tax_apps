"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { APP_NAV_FOCUS_STYLE, APP_NAV_LINKS, PORTAL_HREF, isAppNavLinkActive } from "./app-navigation"

const ITEM_CLASS = "flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors"

/**
 * 広い画面の入口。ほかのアプリ（必要書類管理・贈与税シミュレーター等）と同じ左の固定サイドバー。
 * 上の帯が無くなるぶん、案件一覧の表と案件詳細のタブが画面の上から始まる。
 * 狭い画面では出さず、`AppHeader` の横並びのままにする（縦を帯2本に使わない）。
 */
export function AppSidebar() {
    const pathname = usePathname()

    return (
        <aside
            aria-label="アプリ内メニュー"
            className="no-print fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col items-center border-r border-slate-200 bg-white py-3 shadow-sm lg:flex"
        >
            <div className="mb-3 flex w-14 flex-col items-center gap-1 text-[10px] font-bold text-slate-700">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white" aria-hidden="true">
                    <Scale className="h-5 w-5" />
                </span>
                <span>案件管理</span>
            </div>
            <nav aria-label="メインナビゲーション" className="flex flex-1 flex-col items-center gap-1">
                {APP_NAV_LINKS.map(({ href, label, icon: Icon }) => {
                    const isActive = isAppNavLinkActive(pathname, href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                ITEM_CLASS,
                                isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                APP_NAV_FOCUS_STYLE,
                            )}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>
            <a
                href={PORTAL_HREF}
                className={cn(ITEM_CLASS, "text-slate-600 hover:bg-slate-100 hover:text-blue-800", APP_NAV_FOCUS_STYLE)}
            >
                <Home className="h-5 w-5" aria-hidden="true" />
                <span>ポータル</span>
            </a>
        </aside>
    )
}
