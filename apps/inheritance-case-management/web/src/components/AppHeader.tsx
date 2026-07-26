"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, BarChart3, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/analytics", label: "経営分析", icon: BarChart3 },
    { href: "/settings", label: "設定", icon: Settings },
] as const
const PORTAL_HREF = "/"

export function AppHeader() {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/" || pathname === ""
        return pathname.startsWith(href)
    }

    return (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
                {/* Left: Home + App Name */}
                <div className="flex items-center gap-3">
                    <a
                        href={PORTAL_HREF}
                        aria-label="ポータル"
                        className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary md:h-auto md:w-auto md:justify-start"
                    >
                        <Home className="h-5 w-5" />
                        <span className="hidden md:inline text-sm font-medium">ポータル</span>
                    </a>
                    <Link
                        href="/"
                        aria-label="案件一覧"
                        aria-current={isActive("/") ? "page" : undefined}
                        className={cn(
                            "flex h-11 w-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors md:h-auto md:w-auto md:px-3 md:py-1.5",
                            isActive("/")
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <List className="h-4 w-4" />
                        <span className="hidden md:inline">案件一覧</span>
                    </Link>
                </div>

                {/* Center: Navigation Links */}
                <nav className="flex items-center gap-1">
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-label={label}
                            aria-current={isActive(href) ? "page" : undefined}
                            className={cn(
                                "flex h-11 w-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors md:h-auto md:w-auto md:px-3 md:py-1.5",
                                isActive(href)
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden md:inline">{label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Right: New Case Button */}
                <Link
                    href="/new"
                    aria-label="新規案件"
                    aria-current={pathname === "/new" ? "page" : undefined}
                    className={cn(
                        "flex h-11 w-11 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors sm:h-auto sm:w-auto sm:px-3 sm:py-1.5",
                        pathname === "/new"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border"
                    )}
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">新規案件</span>
                </Link>
            </div>
        </header>
    )
}
