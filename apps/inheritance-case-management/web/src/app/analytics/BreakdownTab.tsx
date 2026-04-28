"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, ChevronsUpDown, Info } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import type { RankingData } from "@/lib/analytics-utils"

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
    if (selectedYears.size === 1) {
        params.set("fiscalYear", String([...selectedYears][0]))
    }
    return `/?${params.toString()}`
}

function buildUnassignedUrl(selectedYears: Set<number>): string {
    const params = new URLSearchParams()
    params.set("unassigned", "true")
    if (selectedYears.size === 1) {
        params.set("fiscalYear", String([...selectedYears][0]))
    }
    return `/?${params.toString()}`
}

export function BreakdownTab({ departmentGroups, selectedYears }: BreakdownTabProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const allNames = useMemo(() => departmentGroups.map(g => g.departmentName), [departmentGroups])
    const isAllExpanded = expanded.size === allNames.length
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4 pt-4">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,180px)_minmax(56px,80px)] items-end gap-3 border-b pb-2">
                    <div>
                        <h2 className="text-xl font-semibold">部門・担当者</h2>
                    </div>
                    <div className="text-right text-sm font-semibold text-foreground">
                        合計 {formatCurrency(staffTotal)}
                    </div>
                    <button
                        onClick={toggleAll}
                        className="flex items-center justify-self-end gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        {isAllExpanded ? "すべて閉じる" : "すべて開く"}
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-black" />確定 = 完了案件の報酬額ベース</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-black/60" />見込 = 手続中案件の見積額ベース</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />未着手・見送りは集計対象外</span>
                </div>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <colgroup>
                            <col />
                            <col className="w-[180px]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">部門 / 担当者</th>
                                <th className="p-3 text-right">
                                    <span className="group relative cursor-help">
                                        売上合計
                                        <Info className="inline-block ml-1 h-3.5 w-3.5 align-text-top" />
                                        <span className="invisible group-hover:visible absolute right-0 top-full mt-1 z-10 w-56 rounded-lg border bg-popover p-3 text-xs font-normal text-popover-foreground shadow-md leading-relaxed text-left">
                                            確定額（報酬額ベース）と見込額（見積額ベース）の合計です。各行の内訳で内訳を確認できます。
                                        </span>
                                    </span>
                                </th>
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
                onClick={onToggle}
            >
                <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                        <ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        />
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
                            <div className="text-xs text-muted-foreground font-normal mt-0.5 space-y-0.5">
                                <div>担当: {formatCurrency(totals.assignedFee)} / {totals.assignedCount}件（確定: {formatCurrency(totals.assignedConfirmedFee)}　見込: {formatCurrency(totals.assignedEstimateFee)}）</div>
                                <div>紹介: {formatCurrency(totals.referralFee)} / {totals.referralCount}件（確定: {formatCurrency(totals.referralConfirmedFee)}　見込: {formatCurrency(totals.referralEstimateFee)}）</div>
                            </div>
                        </div>
                    </div>
                </td>
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
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <div>担当: {formatCurrency(r.assignedFee ?? 0)} / {r.assignedCount ?? 0}件（確定: {formatCurrency(r.assignedConfirmedFee ?? 0)}　見込: {formatCurrency(r.assignedEstimateFee ?? 0)}）</div>
                                <div>紹介: {formatCurrency(r.referralFee ?? 0)} / {r.referralCount ?? 0}件（確定: {formatCurrency(r.referralConfirmedFee ?? 0)}　見込: {formatCurrency(r.referralEstimateFee ?? 0)}）</div>
                            </div>
                        </td>
                        <td className="p-3 text-right font-medium align-top">{formatCurrency(r.feeTotal)}</td>
                        <td className="p-3 text-center text-muted-foreground align-top">{r.count + (r.referralCount ?? 0)}</td>
                    </tr>
                )
            })}
        </>
    )
}
