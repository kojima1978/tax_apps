"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { formatCurrency, LABEL_NONE } from "@/lib/analytics-utils"

type RankingColumnDef = {
    label: string
    align?: "left" | "right" | "center"
    sortKey?: string
}

type RankingItem = { name: string; feeTotal: number; count: number; group?: string; departments?: RankingItem[]; confirmedFee?: number; estimateFee?: number }

interface RankingTableProps {
    data: RankingItem[]
    columns: [RankingColumnDef, RankingColumnDef, RankingColumnDef]
    onSort?: (col: string) => void
    sortState?: { col: string; desc: boolean }
    groupBy?: boolean
    showSubRows?: boolean
    showBreakdown?: boolean
    buildHref?: (name: string) => string
}

export function RankingTable({ data, columns: [nameCol, feeCol, countCol], onSort, sortState, groupBy, showSubRows, showBreakdown, buildHref }: RankingTableProps) {
    const breakdownColumns = showBreakdown && !groupBy
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const toggleSubRows = (name: string) => {
        setExpandedRows(current => {
            const next = new Set(current)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }

    const renderTh = (col: RankingColumnDef) => {
        const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
        const sortable = onSort && col.sortKey
        const indicator = sortable && sortState?.col === col.sortKey
            ? (sortState?.desc ? " ▼" : " ▲")
            : ""

        return (
            <th
                key={col.label}
                className={`p-3 ${align} ${sortable ? "cursor-pointer hover:text-foreground" : ""}`}
                aria-sort={sortable ? sortState?.col === col.sortKey ? sortState?.desc ? "descending" : "ascending" : "none" : undefined}
            >
                {sortable ? <button type="button" className="min-h-11 rounded px-1 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => onSort(col.sortKey!)}>{col.label}{indicator}</button> : col.label}
            </th>
        )
    }

    const renderName = (name: string, className?: string) => {
        if (buildHref) {
            return (
                <Link
                    href={buildHref(name)}
                    className={`underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary hover:decoration-primary transition-colors ${className || ""}`}
                >
                    {name}
                </Link>
            )
        }
        return <span className={className}>{name}</span>
    }

    // Group rows by group field
    const rows: React.ReactNode[] = []
    if (groupBy) {
        let lastGroup: string | undefined
        const groupTotals = new Map<string, { feeTotal: number; count: number }>()
        data.forEach(r => {
            const g = r.group || LABEL_NONE
            const t = groupTotals.get(g) || { feeTotal: 0, count: 0 }
            t.feeTotal += r.feeTotal
            t.count += r.count
            groupTotals.set(g, t)
        })

        data.forEach(r => {
            const group = r.group || LABEL_NONE
            if (group !== lastGroup) {
                const totals = groupTotals.get(group)
                rows.push(
                    <tr key={`group-${group}`} className="bg-muted/60">
                        <td className="p-2 pl-3 font-semibold text-sm">{group}</td>
                        <td className="p-2 text-right text-sm font-semibold text-muted-foreground">{formatCurrency(totals?.feeTotal || 0)}</td>
                        <td className="p-2 text-center text-sm font-semibold text-muted-foreground">{totals?.count || 0}</td>
                    </tr>
                )
                lastGroup = group
            }
            // Display name without company prefix for grouped view
            const displayName = r.name.includes(" / ")
                ? r.name.substring(r.name.indexOf(" / ") + 3)
                : r.name
            rows.push(
                <tr key={r.name}>
                    <td className="p-3 pl-6 font-medium">{displayName || "（担当者なし）"}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(r.feeTotal)}</td>
                    <td className="p-3 text-center text-muted-foreground">{r.count}</td>
                </tr>
            )
        })
    } else {
        data.forEach(r => {
            const hasSubRows = showSubRows && r.departments && r.departments.length > 0
            const isExpanded = expandedRows.has(r.name)
            rows.push(
                <tr key={r.name}>
                    <td className={`p-3 font-medium ${hasSubRows ? "font-semibold" : ""}`}>
                        <div className="flex items-center gap-1">
                            {hasSubRows ? (
                                <button
                                    type="button"
                                    className="-ml-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`${r.name}の支店を${isExpanded ? "非表示" : "表示"}`}
                                    aria-expanded={isExpanded}
                                    onClick={() => toggleSubRows(r.name)}
                                >
                                    <ChevronRight
                                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                        aria-hidden="true"
                                    />
                                </button>
                            ) : showSubRows ? (
                                <span className="w-7 shrink-0" aria-hidden="true" />
                            ) : null}
                            {renderName(r.name)}
                        </div>

                    </td>
                    {breakdownColumns && <>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(r.confirmedFee ?? 0)}</td>
                        <td className="p-3 text-right tabular-nums text-slate-600">{formatCurrency(r.estimateFee ?? 0)}</td>
                    </>}
                    <td className="p-3 text-right font-medium align-top">{formatCurrency(r.feeTotal)}</td>
                    <td className="p-3 text-center text-muted-foreground align-top">{r.count}</td>
                </tr>
            )
            if (showSubRows && isExpanded && r.departments) {
                r.departments.forEach(dept => {
                    rows.push(
                        <tr key={`${r.name}-${dept.name}`} className="bg-muted/30">
                            <td className="p-2 pl-6 text-xs text-muted-foreground">
                                <div>{dept.name}</div>

                            </td>
                            {breakdownColumns && <>
                                <td className="p-2 text-right tabular-nums">{formatCurrency(dept.confirmedFee ?? 0)}</td>
                                <td className="p-2 text-right tabular-nums text-slate-600">{formatCurrency(dept.estimateFee ?? 0)}</td>
                            </>}
                            <td className="p-2 text-right text-xs text-muted-foreground align-top">{formatCurrency(dept.feeTotal)}</td>
                            <td className="p-2 text-center text-xs text-muted-foreground align-top">{dept.count}</td>
                        </tr>
                    )
                })
            }
        })
    }

    return (
        <>
        <div className="space-y-3 md:hidden" aria-label="紹介者実績のモバイル表示">
            {onSort && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="紹介者の並べ替え"><span className="text-sm text-slate-600">並べ替え</span>{[feeCol, countCol].filter(col => col.sortKey).map(col => <button key={col.sortKey} type="button" aria-pressed={sortState?.col === col.sortKey} className="min-h-11 rounded-lg border bg-white px-3 text-sm text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => onSort(col.sortKey!)}>{col.label}{sortState?.col === col.sortKey ? sortState?.desc ? " ↓" : " ↑" : ""}</button>)}</div>}
            {data.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-600">選択年度の紹介者実績はありません。</p>}
            {data.map(row => <article key={row.name} className="rounded-xl border bg-white p-4">
                <h3 className="text-base font-semibold">{renderName(row.name)}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-600">{feeCol.label}</dt><dd className="font-bold tabular-nums text-blue-900">{formatCurrency(row.feeTotal)}</dd></div><div><dt className="text-slate-600">件数</dt><dd className="font-semibold">{row.count}件</dd></div>{breakdownColumns && <><div><dt className="text-slate-600">確定</dt><dd className="tabular-nums">{formatCurrency(row.confirmedFee ?? 0)}</dd></div><div><dt className="text-slate-600">見込</dt><dd className="tabular-nums">{formatCurrency(row.estimateFee ?? 0)}</dd></div></>}</dl>
                {showSubRows && !!row.departments?.length && <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 text-blue-800">支店の内訳（{row.departments.length}件）</summary><ul className="divide-y">{row.departments.map(dept => <li key={dept.name} className="flex flex-wrap justify-between gap-2 py-3"><span>{dept.name}</span><span className="tabular-nums">{formatCurrency(dept.feeTotal)} / {dept.count}件</span></li>)}</ul></details>}
            </article>)}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block" role="region" aria-label="紹介者別実績表" tabIndex={0}>
            <table className="min-w-[720px] w-full text-sm text-left">
                <colgroup>
                    <col />
                    {breakdownColumns && <><col className="w-[160px]" /><col className="w-[160px]" /></>}
                    <col className="w-[180px]" />
                    <col className="w-[80px]" />
                </colgroup>
                <thead className="bg-muted text-muted-foreground">
                    <tr>
                        {renderTh(nameCol)}
                        {breakdownColumns && <><th className="p-3 text-right">確定</th><th className="p-3 text-right">見込</th></>}
                        {renderTh(feeCol)}
                        {renderTh(countCol)}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.length === 0 && <tr><td colSpan={breakdownColumns ? 5 : 3} className="p-6 text-center text-slate-600">選択年度の紹介者実績はありません。</td></tr>}
                    {rows}
                </tbody>
            </table>
        </div>
        </>
    )
}
