"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, BarChart3, Settings, Plus, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/", label: "案件一覧", icon: List },
    { href: "/analytics", label: "経営分析", icon: BarChart3 },
    { href: "/settings", label: "設定", icon: Settings },
] as const

const FOCUS_STYLE = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
// The portal is outside Next.js's /itcm base path; use a normal document navigation.
const PORTAL_HREF = "/"

export function AppHeader() {
    const pathname = usePathname()
    const isActive = (href: string) => href === "/"
        ? pathname === "/" || pathname === ""
        : pathname === href || pathname.startsWith(`${href}/`)

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
            <div className="container mx-auto flex h-14 items-center gap-2 px-3 md:gap-5 md:px-4">
                <a
                    href={PORTAL_HREF}
                    aria-label="ポータルへ戻る"
                    title="ポータルへ戻る"
                    className={cn("flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:w-auto md:px-2", FOCUS_STYLE)}
                >
                    <Home className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden text-sm font-medium xl:inline">ポータル</span>
                </a>
                <div className="hidden items-center gap-2 border-l border-slate-200 pl-5 lg:flex">
                    <FolderKanban className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-800">相続案件管理</span>
                </div>
                <nav aria-label="メインナビゲーション" className="flex min-w-0 items-center gap-1 md:gap-2">
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive(href) ? "page" : undefined}
                            className={cn(
                                "flex h-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium transition-colors md:flex-row md:gap-2 md:px-3 md:text-sm",
                                isActive(href)
                                    ? "bg-blue-50 font-semibold text-blue-800 ring-1 ring-inset ring-blue-200"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                FOCUS_STYLE
                            )}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="whitespace-nowrap">{label}</span>
                        </Link>
                    ))}
                </nav>
                <Link
                    href="/new"
                    aria-label="新規案件"
                    aria-current={pathname === "/new" ? "page" : undefined}
                    className={cn("ml-auto flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-blue-700 px-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 md:gap-2 md:px-4", FOCUS_STYLE)}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span className="sm:hidden">新規</span>
                    <span className="hidden sm:inline">新規案件</span>
                </Link>
            </div>
        </header>
    )
}
