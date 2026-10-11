"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Bookmark, Clock } from "lucide-react"
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences"
import { useToast } from "@/components/ui/Toast"

export function CaseShortcuts() {
    const { preferences, updatePreferences } = useWorkspacePreferences()
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <Button variant="outline" onClick={() => setIsOpen(true)}>最近開いた案件・お気に入り</Button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="最近開いた案件・お気に入り" panelClassName="max-w-2xl">
            <div className="grid gap-3 py-2 md:grid-cols-2">
                {[{ label: "お気に入り", items: preferences.favorites, Icon: Bookmark }, { label: "最近開いた案件", items: preferences.recentCases, Icon: Clock }].map(({ label, items, Icon }) => (
                    <div key={label}>
                        <h2 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Icon className="h-4 w-4" />{label}</h2>
                        {items.length === 0 ? <p className="py-2 text-xs text-muted-foreground">{label === "お気に入り" ? "案件詳細で登録できます。" : "案件を開くとここに表示されます。"}</p> : (
                            <ul className="flex flex-wrap gap-1">{items.map(item => <li key={item.id} className="flex max-w-full rounded-md border"><Link href={`/${item.id}`} className="inline-flex min-h-10 min-w-0 items-center px-3 text-sm hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{item.name || "氏名未入力"}</span></Link><button type="button" aria-label={`${item.name}を${label}から削除`} className="min-h-10 shrink-0 px-3 text-muted-foreground hover:bg-muted" onClick={() => {
                                const key = label === "お気に入り" ? "favorites" : "recentCases"
                                if (!updatePreferences(p => ({ ...p, [key]: p[key].filter(c => c.id !== item.id) }))) toast.error("設定を保存できませんでした")
                            }}>×</button></li>)}</ul>
                        )}
                    </div>
                ))}
            </div>
            <p className="pb-1 text-xs text-muted-foreground">このブラウザに保存されます。</p>
            </Modal>
        </>
    )
}
