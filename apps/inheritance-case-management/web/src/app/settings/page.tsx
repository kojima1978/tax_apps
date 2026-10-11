"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Search, X } from "lucide-react"
import { SETTINGS_GROUPS, SETTINGS_MENU } from "@/components/settings/settings-menu"

export default function SettingsMenuPage() {
    const [search, setSearch] = useState("")
    const terms = search.normalize("NFKC").toLocaleLowerCase("ja").trim().split(/\s+/).filter(Boolean)
    const items = SETTINGS_MENU.filter(item => {
        const text = `${item.title} ${item.description} ${item.action} ${item.keywords}`.normalize("NFKC").toLocaleLowerCase("ja")
        return terms.every(term => text.includes(term))
    })

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:py-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">設定</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">案件で使う基本情報の管理と、データの保存・復元ができます。</p>
            </div>
            <div className="mb-7 rounded-xl border border-slate-200 bg-white p-4">
                <label htmlFor="settings-search" className="mb-2 block text-sm font-semibold text-slate-800">設定を探す</label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input id="settings-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
                        placeholder="担当者、住所、バックアップなど" aria-describedby="settings-search-result"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-12 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
                    {search && <button type="button" onClick={() => { setSearch(""); document.getElementById("settings-search")?.focus() }}
                        aria-label="検索をクリア" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>}
                </div>
                <p id="settings-search-result" role="status" className="mt-2 text-xs text-slate-600">{terms.length ? `${items.length}件の設定が見つかりました` : "名称や操作内容で検索できます"}</p>
            </div>
            <div className="space-y-7">
                {SETTINGS_GROUPS.map(group => {
                    const groupItems = items.filter(item => item.group === group.id)
                    if (!groupItems.length) return null
                    return <section key={group.id} aria-labelledby={`settings-group-${group.id}`}>
                        <h2 id={`settings-group-${group.id}`} className="text-base font-semibold text-slate-900">{group.title}</h2>
                        <p className="mb-3 mt-1 text-sm text-slate-600">{group.description}</p>
                        <div className={`grid gap-3 ${groupItems.length > 1 ? "md:grid-cols-2" : ""}`}>
                            {groupItems.map(item => <Link key={item.href} href={item.href}
                                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><item.icon className="h-5 w-5" aria-hidden="true" /></span>
                                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                                </div>
                                <p className="mb-4 text-sm leading-relaxed text-slate-600">{item.description}</p>
                                <span className="mt-auto flex items-center justify-between gap-2 text-sm font-medium text-blue-700">{item.action}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span>
                            </Link>)}
                        </div>
                    </section>
                })}
                {!items.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                    <p className="font-medium text-slate-800">該当する設定がありません</p>
                    <p className="mt-2 text-sm text-slate-600">別のキーワードで検索してください。</p>
                    <button type="button" onClick={() => setSearch("")} className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800">すべての設定を表示</button>
                </div>}
            </div>
        </div>
    )
}
