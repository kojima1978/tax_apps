import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SETTINGS_GROUPS, SETTINGS_MENU } from "@/components/settings/settings-menu"

export default function SettingsMenuPage() {
    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:py-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">設定</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">案件で使う基本情報の管理と、データの保存・復元ができます。上のタブからも移動できます。</p>
            </div>
            <div className="space-y-7">
                {SETTINGS_GROUPS.map(group => {
                    const groupItems = SETTINGS_MENU.filter(item => item.group === group.id)
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
            </div>
        </div>
    )
}
