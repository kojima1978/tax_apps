
"use client"

import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { Users, UserPlus } from "lucide-react"

export default function SettingsMenuPage() {
    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-6">
                <Link href="/">
                    <Button variant="outline">
                        案件一覧に戻る
                    </Button>
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">設定</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/settings/assignees" className="block">
                    <div className="border rounded-xl p-6 hover:bg-muted/50 transition-colors h-full">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <Users className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-semibold">担当者管理</h2>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            案件を担当する社内メンバーの追加・編集・削除を行います。部署や社員IDの管理も可能です。
                        </p>
                    </div>
                </Link>

                <Link href="/settings/referrers" className="block">
                    <div className="border rounded-xl p-6 hover:bg-muted/50 transition-colors h-full">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-semibold">紹介者管理</h2>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            案件を紹介してくれる外部の紹介者の追加・編集・削除を行います。会社名ごとの管理が可能です。
                        </p>
                    </div>
                </Link>
            </div>
        </div>
    )
}
