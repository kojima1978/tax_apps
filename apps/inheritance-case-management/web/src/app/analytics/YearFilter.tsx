"use client"

import { useState } from "react"

export function YearFilter({ years, selected, onChange }: {
    years: number[]
    selected: Set<number>
    onChange: (years: Set<number>) => void
}) {
    const [compare, setCompare] = useState(() => selected.size > 1)
    return <div className="flex flex-wrap items-center gap-3" aria-label="分析対象年度">
        {!compare && <label className="flex items-center gap-2 text-sm text-slate-600">
            対象年度
            <select aria-label="対象年度" className="h-11 rounded-lg border bg-white px-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                value={selected.size === 1 ? [...selected][0] : "all"}
                onChange={e => onChange(e.target.value === "all" ? new Set() : new Set([Number(e.target.value)]))}>
                <option value="all">全期間</option>
                {years.map(year => <option key={year} value={year}>{year}年度</option>)}
            </select>
        </label>}
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={compare} className="h-4 w-4 accent-blue-700" onChange={e => {
                setCompare(e.target.checked)
                if (!e.target.checked && selected.size > 1) onChange(new Set([Math.max(...selected)]))
            }} />複数年度で比較
        </label>
        {compare && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="比較する年度">
            {years.map(year => <label key={year} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm ${selected.has(year) ? "border-blue-300 bg-blue-50 text-blue-800" : "bg-white"}`}>
                <input type="checkbox" checked={selected.has(year)} className="accent-blue-700" onChange={() => {
                    const next = new Set(selected)
                    if (next.has(year)) next.delete(year); else next.add(year)
                    onChange(next)
                }} />{year}年度
            </label>)}
            {selected.size === 0 && <span className="text-xs text-slate-600">未選択：全期間を表示</span>}
        </div>}
    </div>
}
