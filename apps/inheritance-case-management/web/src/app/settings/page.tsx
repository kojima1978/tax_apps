
"use client"

import Link from "next/link"
import { Users, UserPlus, Building2, Briefcase, HardDriveDownload } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const SETTINGS_MENU_ITEMS: { href: string; icon: LucideIcon; iconClass: string; title: string; description: string }[] = [
    {
        href: "/settings/departments",
        icon: Building2,
        iconClass: "bg-purple-100 text-purple-600",
        title: "部署管理",
        description: "社内の部署の追加・編集・削除を行います。担当者の所属部署として使用されます。",
    },
    {
        href: "/settings/assignees",
        icon: Users,
        iconClass: "bg-blue-100 text-blue-600",
        title: "担当者管理",
        description: "案件を担当する社内メンバーの追加・編集・削除を行います。部署や社員IDの管理も可能です。",
    },
    {
        href: "/settings/companies",
        icon: Briefcase,
        iconClass: "bg-amber-100 text-amber-600",
        title: "会社管理",
        description: "紹介者の所属会社の追加・編集・削除を行います。紹介者の所属先として使用されます。",
    },
    {
        href: "/settings/referrers",
        icon: UserPlus,
        iconClass: "bg-green-100 text-green-600",
        title: "紹介者管理",
        description: "案件を紹介してくれる外部の紹介者の追加・編集・削除を行います。会社ごとの管理が可能です。",
    },
    {
        href: "/settings/backup",
        icon: HardDriveDownload,
        iconClass: "bg-slate-100 text-slate-600",
        title: "バックアップ / リストア",
        description: "全データのJSONエクスポートおよびインポートによるバックアップ・復元を行います。",
    },
]

export default function SettingsMenuPage() {
    return (
        <div className="container mx-auto py-10 max-w-2xl px-4">
            <h1 className="text-2xl font-bold mb-6">設定</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SETTINGS_MENU_ITEMS.map((item) => (
                    <Link key={item.href} href={item.href} className="block cursor-pointer">
                        <div className="border rounded-xl p-6 hover:bg-muted/50 transition-colors h-full">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-lg ${item.iconClass}`}>
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-semibold">{item.title}</h2>
                            </div>
                            <p className="text-muted-foreground text-sm">{item.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
