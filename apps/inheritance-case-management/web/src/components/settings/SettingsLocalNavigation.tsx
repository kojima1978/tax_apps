"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import {
    Briefcase,
    ChevronDown,
    Contact,
    HardDriveDownload,
    Network,
    Settings,
    Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SETTINGS_LINKS = [
    { href: "/settings", label: "設定トップ", icon: Settings },
    { href: "/settings/staff", label: "担当者管理", icon: Users },
    { href: "/settings/referral-sources", label: "紹介元管理", icon: Network },
    { href: "/settings/heir-persons", label: "相続人マスタ", icon: Contact },
    { href: "/settings/related-party-persons", label: "関係者マスタ", icon: Briefcase },
    { href: "/settings/backup", label: "バックアップ", icon: HardDriveDownload },
] as const

function isCurrentPath(pathname: string, href: string) {
    return href === "/settings" ? pathname === href : pathname.startsWith(href)
}

function SettingsLinks({ pathname }: { pathname: string }) {
    return (
        <nav aria-label="設定メニュー" className="space-y-1">
            {SETTINGS_LINKS.map(({ href, label, icon: Icon }) => {
                const isCurrent = isCurrentPath(pathname, href)
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                            "flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:min-h-10",
                            isCurrent
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                    </Link>
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
                <div className="sticky top-20 rounded-lg border bg-card p-2 shadow-sm">
                    <div className="px-3 pb-2 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">設定</p>
                    </div>
                    <SettingsLinks pathname={pathname} />
                </div>
            </aside>

            <details ref={mobileDetailsRef} className="group rounded-lg border bg-card shadow-sm lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2.5">
                        <CurrentIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{current.label}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t p-2">
                    <SettingsLinks pathname={pathname} />
                </div>
            </details>
        </>
    )
}
