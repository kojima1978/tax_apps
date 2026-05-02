
"use client"

import Link from "next/link"
import { Users, Network, HardDriveDownload, Contact, Briefcase } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const SETTINGS_MENU_ITEMS: { href: string; icon: LucideIcon; iconClass: string; title: string; description: string }[] = [
    {
        href: "/settings/staff",
        icon: Users,
        iconClass: "bg-white text-black border border-black/10",
        title: "担当者管理",
        description: "担当者と部署を一元管理します。部署ごとのグループ表示で、追加・編集・無効化がこの画面で完結します。",
    },
    {
        href: "/settings/referral-sources",
        icon: Network,
        iconClass: "bg-white text-black border border-black/10",
        title: "紹介元管理",
        description: "紹介元の会社・部門をツリー形式で一元管理します。紹介者としての有効/無効もこの画面で設定できます。",
    },
    {
        href: "/settings/heir-persons",
        icon: Contact,
        iconClass: "bg-white text-black border border-black/10",
        title: "相続人マスタ管理",
        description: "案件に紐づく相続人として登録される人物情報を一元管理します。氏名・電話番号・住所の編集や有効/無効の切り替えができます。",
    },
    {
        href: "/settings/related-party-persons",
        icon: Briefcase,
        iconClass: "bg-white text-black border border-black/10",
        title: "関係者マスタ管理",
        description: "税理士・弁護士・司法書士・葬儀社など、案件に関わる外部関係者の人物情報を一元管理します。",
    },
    {
        href: "/settings/backup",
        icon: HardDriveDownload,
        iconClass: "bg-white text-black border border-black/10",
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
