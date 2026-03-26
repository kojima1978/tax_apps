"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, BarChart3, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/analytics", label: "経営分析", icon: BarChart3 },
    { href: "/settings", label: "設定", icon: Settings },
] as const

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
                    <a href="/" title="ポータルに戻る" className="text-muted-foreground hover:text-primary transition-colors">
                        <Home className="h-5 w-5" />
                    </a>
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
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
