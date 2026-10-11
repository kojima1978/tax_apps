"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import {
    ChevronDown,
    Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SETTINGS_GROUPS, SETTINGS_MENU } from "./settings-menu"

const SETTINGS_LINKS = [
    { href: "/settings", label: "設定トップ", icon: Settings },
    ...SETTINGS_MENU.map(item => ({ ...item, label: "navLabel" in item ? item.navLabel : item.title })),
] as const

function isCurrentPath(pathname: string, href: string) {
    return pathname === href || (href !== "/settings" && pathname.startsWith(`${href}/`))
}

function SettingsLinks({ pathname }: { pathname: string }) {
    return (
        <nav aria-label="設定メニュー" className="space-y-1">
            {SETTINGS_LINKS.map(({ href, label, icon: Icon }, index) => {
                const isCurrent = isCurrentPath(pathname, href)
                const group = SETTINGS_GROUPS.find(group => SETTINGS_MENU.find(item => item.href === href)?.group === group.id)
                const previousGroup = SETTINGS_MENU.find(item => item.href === SETTINGS_LINKS[index - 1]?.href)?.group
                return (
                    <div key={href}>
                        {group && group.id !== previousGroup && <p className="px-3 pb-1 pt-4 text-xs font-semibold text-slate-500">{group.title}</p>}
                        <Link
                            href={href}
                            aria-current={isCurrent ? "page" : undefined}
                            className={cn(
                                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                                isCurrent
                                    ? "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{label}</span>
                        </Link>
                    </div>
                )
            })}
        </nav>
    )
}

export function SettingsLocalNavigation() {
    const pathname = usePathname()
    const mobileDetailsRef = useRef<HTMLDetailsElement>(null)
    const current = SETTINGS_LINKS.find(({ href }) => isCurrentPath(pathname, href)) ?? SETTINGS_LINKS[0]
    const CurrentIcon = current.icon

    useEffect(() => {
        mobileDetailsRef.current?.removeAttribute("open")
    }, [pathname])

    return (
        <>
            <aside className="hidden lg:block" aria-label="設定ナビゲーション">
                <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="px-3 pb-2 pt-1">
                        <p className="text-sm font-semibold text-slate-800">設定メニュー</p>
                    </div>
                    <SettingsLinks pathname={pathname} />
                </div>
            </aside>

            <details ref={mobileDetailsRef} className="group rounded-lg border border-slate-200 bg-white shadow-sm lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2.5">
                        <CurrentIcon className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                        <span className="truncate">{current.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-slate-600">メニュー<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
                </summary>
                <div className="border-t p-2">
                    <SettingsLinks pathname={pathname} />
                </div>
            </details>
        </>
    )
}
