"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import type { Assignee } from "@/types/shared"

export function AssigneeFilter({ assignees, value, onChange }: {
    assignees: Assignee[]
    value?: number
    onChange: (value: string | undefined) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const root = useRef<HTMLDivElement>(null)
    const trigger = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        if (!open) return
        const close = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener("pointerdown", close)
        return () => document.removeEventListener("pointerdown", close)
    }, [open])
    const selected = assignees.find(a => a.id === value)
    const options = assignees.filter(a => (a.active || a.id === value) && a.name.includes(search.trim()))
    const choose = (id?: number) => {
        onChange(id == null ? undefined : String(id))
        setOpen(false)
        setSearch("")
        trigger.current?.focus()
    }
    return (
        <div ref={root} className="relative" onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); trigger.current?.focus() }
        }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
            <button ref={trigger} type="button" aria-expanded={open} aria-controls="case-assignee-options"
                onClick={() => setOpen(v => !v)}
                className="flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                担当者{selected ? `: ${selected.name}` : ""}<ChevronDown className="h-4 w-4" />
            </button>
            {open && <div id="case-assignee-options" className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border bg-white p-2 shadow-lg" aria-label="担当者で絞り込み">
                <label className="flex items-center gap-2 rounded-lg border px-2">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input autoFocus aria-label="担当者名で検索" value={search} onChange={e => setSearch(e.target.value)} className="h-11 min-w-0 w-full bg-transparent text-base outline-none" placeholder="担当者名で検索" />
                </label>
                <div className="mt-2 max-h-64 overflow-y-auto">
                    <button type="button" className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => choose()}>すべての担当者</button>
                    {options.map(a => <button key={a.id} type="button" aria-pressed={a.id === value}
                        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 ${a.id === value ? "bg-blue-50 font-semibold text-blue-800" : ""}`}
                        onClick={() => choose(a.id)}>
                        <span>{a.name}</span><span className="text-xs text-slate-500">{a.department?.name}</span>
                    </button>)}
                    {options.length === 0 && <p className="p-3 text-sm text-slate-600">該当する担当者がいません</p>}
                </div>
            </div>}
        </div>
    )
}
