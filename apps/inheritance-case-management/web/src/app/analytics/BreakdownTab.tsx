"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, ChevronsUpDown } from "lucide-react"
import { AnalyticsRules } from "./AnalyticsRules"
import { formatCurrency } from "@/lib/analytics-utils"
import type { RankingData } from "@/lib/analytics-utils"
import { appendAnalyticsStatuses, appendSelectedYears } from "./drilldown-utils"

export type AssigneeRankingData = RankingData & { assigneeId: number }

export type DepartmentGroup = {
    departmentName: string
    assignees: AssigneeRankingData[]
}

interface BreakdownTabProps {
    departmentGroups: DepartmentGroup[]
    selectedYears: Set<number>
}

type DeptTotals = {
    feeTotal: number
    count: number
    assignedFee: number
    assignedCount: number
    referralFee: number
    referralCount: number
    confirmedFee: number
    estimateFee: number
    assignedConfirmedFee: number
    assignedEstimateFee: number
    referralConfirmedFee: number
    referralEstimateFee: number
}

function calcDeptTotals(assignees: RankingData[]): DeptTotals {
    const t: DeptTotals = { feeTotal: 0, count: 0, assignedFee: 0, assignedCount: 0, referralFee: 0, referralCount: 0, confirmedFee: 0, estimateFee: 0, assignedConfirmedFee: 0, assignedEstimateFee: 0, referralConfirmedFee: 0, referralEstimateFee: 0 }
    for (const r of assignees) {
        t.feeTotal += r.feeTotal
        t.count += r.count + (r.referralCount ?? 0)
        t.assignedFee += r.assignedFee ?? 0
        t.assignedCount += r.assignedCount ?? 0
        t.referralFee += r.referralFee ?? 0
        t.referralCount += r.referralCount ?? 0
        t.confirmedFee += r.confirmedFee ?? 0
        t.estimateFee += r.estimateFee ?? 0
        t.assignedConfirmedFee += r.assignedConfirmedFee ?? 0
        t.assignedEstimateFee += r.assignedEstimateFee ?? 0
        t.referralConfirmedFee += r.referralConfirmedFee ?? 0
        t.referralEstimateFee += r.referralEstimateFee ?? 0
    }
    return t
}

function buildCaseListUrl(assigneeId: number, selectedYears: Set<number>): string {
    const params = new URLSearchParams()
    params.set("staffId", String(assigneeId))
    appendAnalyticsStatuses(params)
    appendSelectedYears(params, selectedYears)
    return `/?${params.toString()}`
}

function buildUnassignedUrl(selectedYears: Set<number>): string {
    const params = new URLSearchParams()
    params.set("unassigned", "true")
    appendAnalyticsStatuses(params)
    appendSelectedYears(params, selectedYears)
    return `/?${params.toString()}`
}

export function BreakdownTab({ departmentGroups, selectedYears }: BreakdownTabProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const allNames = useMemo(() => departmentGroups.map(g => g.departmentName), [departmentGroups])
    const isAllExpanded = allNames.length > 0 && allNames.every(name => expanded.has(name))
    const staffTotal = useMemo(
        () => calcDeptTotals(departmentGroups.flatMap(group => group.assignees)).feeTotal,
        [departmentGroups],
    )

    const toggleAll = () => {
        setExpanded(isAllExpanded ? new Set() : new Set(allNames))
    }

    const toggle = (name: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                    <div>
                        <h2 className="text-xl font-semibold">部門・担当者</h2>
                    </div>
                    <div className="text-right text-sm font-semibold text-foreground">
                        合計 {formatCurrency(staffTotal)}
                    </div>
                    <button
                        type="button"
                        disabled={allNames.length === 0}
                        onClick={toggleAll}
                        className="flex min-h-11 items-center justify-self-end gap-1 rounded-md px-3 text-sm text-muted-foreground hover:bg-blue-50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        {isAllExpanded ? "すべて閉じる" : "すべて開く"}
                    </button>
                </div>
                <AnalyticsRules />
                <p className="text-sm text-slate-600">担当分と社内紹介分を合算した部門売上です。件数は担当・紹介の延べ件数を表示します。</p>
                {departmentGroups.length === 0 && <div className="rounded-xl border bg-white p-8 text-center text-slate-600">選択年度の部門・担当者実績はありません。</div>}
                <div className="space-y-3 md:hidden" aria-label="部門・担当者のモバイル表示">{departmentGroups.map(group => {
                    const totals = calcDeptTotals(group.assignees)
                    const isOpen = expanded.has(group.departmentName)
                    return <section key={group.departmentName} className="overflow-hidden rounded-xl border bg-white">
                        <button type="button" className="flex min-h-14 w-full items-center justify-between gap-3 bg-slate-50 p-4 text-left font-semibold focus-visible:ring-2 focus-visible:ring-blue-600" aria-expanded={isOpen} aria-controls={`department-mobile-${encodeURIComponent(group.departmentName)}`} onClick={() => toggle(group.departmentName)}>{group.departmentName}<ChevronRight className={`h-4 w-4 shrink-0 ${isOpen ? "rotate-90" : ""}`} /></button>
                        <div className="p-4"><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-600">売上合計</dt><dd className="font-bold tabular-nums text-blue-900">{formatCurrency(totals.feeTotal)}</dd></div><div><dt className="text-slate-600">延べ件数</dt><dd className="font-semibold">{totals.count}件</dd></div><div><dt className="text-slate-600">確定</dt><dd className="tabular-nums">{formatCurrency(totals.confirmedFee)}</dd></div><div><dt className="text-slate-600">見込</dt><dd className="tabular-nums">{formatCurrency(totals.estimateFee)}</dd></div></dl></div>
                        <div id={`department-mobile-${encodeURIComponent(group.departmentName)}`} hidden={!isOpen} className="divide-y border-t">{group.assignees.map(row => <div key={row.name} className="p-4">
                            {row.assigneeId !== Number.MAX_SAFE_INTEGER ? <Link href={buildCaseListUrl(row.assigneeId, selectedYears)} className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline underline-offset-4">{row.name} →</Link> : <Link href={buildUnassignedUrl(selectedYears)} className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline underline-offset-4">{row.name} →</Link>}
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(row.feeTotal)} / {row.count + (row.referralCount ?? 0)}件</p>
                            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-slate-600">確定</dt><dd>{formatCurrency(row.confirmedFee ?? 0)}</dd></div><div><dt className="text-slate-600">見込</dt><dd>{formatCurrency(row.estimateFee ?? 0)}</dd></div></dl>
                            <details className="mt-2 text-sm text-slate-600"><summary className="min-h-11 cursor-pointer py-3">担当・紹介の内訳</summary><p>担当 {formatCurrency(row.assignedFee ?? 0)} / {row.assignedCount ?? 0}件</p><p>紹介 {formatCurrency(row.referralFee ?? 0)} / {row.referralCount ?? 0}件</p></details>
                        </div>)}</div>
                    </section>
                })}</div>
                <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block" role="region" aria-label="部門・担当者の実績表" tabIndex={0}>
                    <table className="min-w-[800px] w-full text-sm text-left">
                        <caption className="sr-only">部門・担当者別の確定売上・見込売上・延べ件数</caption>
                        <colgroup>
                            <col />
                            <col className="w-[160px]" />
                            <col className="w-[160px]" />
                            <col className="w-[180px]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">部門 / 担当者</th>
                                <th className="p-3 text-right">確定</th>
                                <th className="p-3 text-right">見込</th>
                                <th className="p-3 text-right">売上合計</th>
                                <th className="p-3 text-center">件数</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {departmentGroups.map(group => {
                                const isOpen = expanded.has(group.departmentName)
                                return (
                                    <DepartmentRows
                                        key={group.departmentName}
                                        group={group}
                                        isOpen={isOpen}
                                        onToggle={() => toggle(group.departmentName)}
                                        selectedYears={selectedYears}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function DepartmentRows({ group, isOpen, onToggle, selectedYears }: { group: DepartmentGroup; isOpen: boolean; onToggle: () => void; selectedYears: Set<number> }) {
    const totals = useMemo(() => calcDeptTotals(group.assignees), [group.assignees])
    const isUnset = group.departmentName === "未設定"

    return (
        <>
            <tr
                className="bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
            >
                <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-label={`${group.departmentName}の担当者を${isOpen ? "閉じる" : "表示"}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600"><ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        /></button>
                        <div>
                            <div>
                                {isUnset ? (
                                    <Link
                                        href={buildUnassignedUrl(selectedYears)}
                                        className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary hover:decoration-primary transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {group.departmentName}
                                    </Link>
                                ) : group.departmentName}
                            </div>
                            {isOpen && <div className="text-xs text-muted-foreground font-normal mt-0.5 space-y-0.5">
                                <div>担当: {formatCurrency(totals.assignedFee)} / {totals.assignedCount}件（確定: {formatCurrency(totals.assignedConfirmedFee)}　見込: {formatCurrency(totals.assignedEstimateFee)}）</div>
                                <div>紹介: {formatCurrency(totals.referralFee)} / {totals.referralCount}件（確定: {formatCurrency(totals.referralConfirmedFee)}　見込: {formatCurrency(totals.referralEstimateFee)}）</div>
                            </div>}
                        </div>
                    </div>
                </td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(totals.confirmedFee)}</td>
                <td className="p-3 text-right tabular-nums text-slate-600">{formatCurrency(totals.estimateFee)}</td>
                <td className="p-3 text-right font-semibold align-top">{formatCurrency(totals.feeTotal)}</td>
                <td className="p-3 text-center text-muted-foreground font-semibold align-top">{totals.count}</td>
            </tr>
            {isOpen && group.assignees.map(r => {
                const isValidId = r.assigneeId !== Number.MAX_SAFE_INTEGER
                return (
                    <tr key={r.name} className="group">
                        <td className="p-3 pl-10 font-medium">
                            <div>
                                {isValidId ? (
                                    <Link
                                        href={buildCaseListUrl(r.assigneeId, selectedYears)}
                                        className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary hover:decoration-primary transition-colors"
                                    >
                                        {r.name}
                                    </Link>
                                ) : (
                                    r.name
                                )}
                            </div>
                            <details className="text-xs text-muted-foreground mt-1 space-y-0.5"><summary className="min-h-9 cursor-pointer py-2">担当・紹介の内訳</summary>
                                <div>担当: {formatCurrency(r.assignedFee ?? 0)} / {r.assignedCount ?? 0}件（確定: {formatCurrency(r.assignedConfirmedFee ?? 0)}　見込: {formatCurrency(r.assignedEstimateFee ?? 0)}）</div>
                                <div>紹介: {formatCurrency(r.referralFee ?? 0)} / {r.referralCount ?? 0}件（確定: {formatCurrency(r.referralConfirmedFee ?? 0)}　見込: {formatCurrency(r.referralEstimateFee ?? 0)}）</div>
                            </details>
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(r.confirmedFee ?? 0)}</td>
                        <td className="p-3 text-right tabular-nums text-slate-600">{formatCurrency(r.estimateFee ?? 0)}</td>
                        <td className="p-3 text-right font-medium align-top">{formatCurrency(r.feeTotal)}</td>
                        <td className="p-3 text-center text-muted-foreground align-top">{r.count + (r.referralCount ?? 0)}</td>
                    </tr>
                )
            })}
        </>
    )
}
