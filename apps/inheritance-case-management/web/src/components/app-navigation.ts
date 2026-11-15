import { BarChart3, HelpCircle, List, Settings } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** ヘッダー（狭い画面）とサイドバー（広い画面）で同じ入口を使う */
export const APP_NAV_LINKS: { href: string, label: string, icon: LucideIcon }[] = [
    { href: "/", label: "案件一覧", icon: List },
    { href: "/analytics", label: "経営分析", icon: BarChart3 },
    { href: "/settings", label: "設定", icon: Settings },
    { href: "/help", label: "使い方", icon: HelpCircle },
]

/** ポータルは Next.js の basePath（/itcm）の外なので、通常のページ遷移で出る */
export const PORTAL_HREF = "/"

export const APP_NAV_FOCUS_STYLE =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"

export function isAppNavLinkActive(pathname: string, href: string): boolean {
    return href === "/"
        ? pathname === "/" || pathname === ""
        : pathname === href || pathname.startsWith(`${href}/`)
}
