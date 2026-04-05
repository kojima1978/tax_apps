"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, ChevronsUpDown } from "lucide-react"
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
}

function calcDeptTotals(assignees: RankingData[]): DeptTotals {
    let feeTotal = 0, count = 0, assignedFee = 0, assignedCount = 0, referralFee = 0, referralCount = 0
    for (const r of assignees) {
        feeTotal += r.feeTotal
        count += r.count + (r.referralCount ?? 0)
        assignedFee += r.assignedFee ?? 0
        assignedCount += r.assignedCount ?? 0
        referralFee += r.referralFee ?? 0
        referralCount += r.referralCount ?? 0
    }
    return { feeTotal, count, assignedFee, assignedCount, referralFee, referralCount }
}

function buildCaseListUrl(assigneeId: number, selectedYears: Set<number>): string {
    const params = new URLSearchParams()
    params.set("staffId", String(assigneeId))
    if (selectedYears.size === 1) {
        params.set("fiscalYear", String([...selectedYears][0]))
    }
    return `/?${params.toString()}`
}

export function BreakdownTab({ departmentGroups, selectedYears }: BreakdownTabProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const allNames = useMemo(() => departmentGroups.map(g => g.departmentName), [departmentGroups])
    const isAllExpanded = expanded.size === allNames.length

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
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-xl font-semibold">担当者合計</h2>
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        {isAllExpanded ? "すべて閉じる" : "すべて開く"}
                    </button>
                </div>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">部門 / 担当者</th>
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
                            <div>{group.departmentName}</div>
                            <div className="text-xs text-muted-foreground font-normal mt-0.5 space-y-0.5">
                                <div>担当: {formatCurrency(totals.assignedFee)} / {totals.assignedCount}件</div>
                                <div>紹介: {formatCurrency(totals.referralFee)} / {totals.referralCount}件</div>
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
                                <div>担当: {formatCurrency(r.assignedFee ?? 0)} / {r.assignedCount ?? 0}件</div>
                                <div>紹介: {formatCurrency(r.referralFee ?? 0)} / {r.referralCount ?? 0}件</div>
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
