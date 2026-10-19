"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AssigneeFilter } from "./AssigneeFilter"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { Assignee, Department } from "@/types/shared"

const FILTER_SELECT_WRAPPER = "h-11 w-auto p-0 text-sm sm:h-10"
const REFERRER_SELECT_WRAPPER = "h-11 w-auto border-input p-0 text-sm sm:h-10"

type OptGroupDef = { label: string; options: readonly { value: string | number; label: string }[] }
type FilterableKey = Exclude<keyof CasesQueryParams, 'page' | 'pageSize' | 'sortBy' | 'sortOrder' | 'unassigned' | 'noReferrer'>
type FilterDef = { key: FilterableKey; placeholder: string; options: readonly { value: string | number; label: string }[]; optGroups?: OptGroupDef[]; multiSelect?: boolean; wrapperClassName?: string }
type ActiveFilterChip = { key: string; label: string; chipStyle: string; onClear: () => void }

function formatDateLabel(value: string | undefined): string {
    if (!value) return ""
    return value.replaceAll("-", "/")
}

function formatExclusiveDateRange(from: string | undefined, to: string | undefined): string {
    const fromLabel = formatDateLabel(from)
    if (!to) return fromLabel ? `${fromLabel}〜` : ""

    const endDate = new Date(`${to}T00:00:00.000Z`)
    endDate.setUTCDate(endDate.getUTCDate() - 1)
    const endLabel = formatDateLabel(endDate.toISOString().slice(0, 10))
    if (!fromLabel) return `〜${endLabel}`
    return `${fromLabel}〜${endLabel}`
}
interface FilterBarProps {
    queryParams: CasesQueryParams
    searchInput: string
    setSearchInput: (val: string) => void
    onSearch: () => void
    onFilterChange: (key: keyof CasesQueryParams, value: string | undefined) => void
    onClearAll: () => void
    onResetDefaults: () => void
    assignees: Assignee[]
    departments: Department[]
    totalCount?: number
    isUpdating?: boolean
    hasFilters: boolean
}

const STATIC_FILTER_DEFS: FilterDef[] = [
    { key: "fiscalYear", placeholder: "年度", options: FILTER_YEAR_OPTIONS.map(y => ({ value: y, label: `${y}年度` })) },
    { key: "status", placeholder: "ステータス", options: CASE_STATUS_FILTER_OPTIONS, multiSelect: true },
]

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onClearAll, onResetDefaults, assignees, departments, totalCount, isUpdating,
}: FilterBarProps) {
    const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(
        queryParams.department || queryParams.internalReferrerId
    ))
    const activeAssigneeOptions = useMemo(() => assignees.filter(a => a.active).map(a => ({ value: a.id, label: a.name })), [assignees])

    const assigneeOptGroups = useMemo((): OptGroupDef[] => {
        const active = assignees.filter(a => a.active)
        const deptMap = new Map<string, { sortOrder: number; items: { value: number; label: string }[] }>()

        active.forEach(a => {
            const deptName = a.department?.name || "未設定"
            const sortOrder = a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER
            if (!deptMap.has(deptName)) deptMap.set(deptName, { sortOrder, items: [] })
            deptMap.get(deptName)!.items.push({ value: a.id, label: a.name })
        })

        return Array.from(deptMap.entries())
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([name, { items }]) => ({
                label: name,
                options: items.sort((a, b) => a.value - b.value),
            }))
    }, [assignees])

    const filterDefs: FilterDef[] = useMemo(() => [
        ...STATIC_FILTER_DEFS,
        { key: "department" as const, placeholder: "部門", options: departments.filter(d => d.active).map(d => ({ value: d.name, label: d.name })) },
        { key: "assigneeId" as const, placeholder: "担当者", options: activeAssigneeOptions, optGroups: assigneeOptGroups },
        { key: "internalReferrerId" as const, placeholder: "紹介者（社内）", options: activeAssigneeOptions, optGroups: assigneeOptGroups, wrapperClassName: REFERRER_SELECT_WRAPPER },
    ], [activeAssigneeOptions, assigneeOptGroups, departments])

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

    // 即時検索（デバウンス300ms）
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            onSearch()
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    // searchInput変更時のみ発火
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput])

    const CHIP_LABELS: Record<string, (v: string | number) => string> = {
        search: (v) => `検索: ${v}`,
        status: (v) => `ステータス: ${String(v).split(',').join('・')}`,
        fiscalYear: (v) => `年度: ${v}年度`,
        fiscalYears: (v) => `年度: ${String(v).split(',').join('・')}`,
        department: (v) => `部門: ${v}`,
        assigneeId: (v) => `担当: ${assignees.find(a => a.id === v)?.name || v}`,
        internalReferrerId: (v) => `紹介者: ${assignees.find(a => a.id === v)?.name || v}`,
        staffId: (v) => `担当・紹介: ${assignees.find(a => a.id === v)?.name || v}`,
        referrerCompany: (v) => `紹介会社: ${v}`,
        deadlineSoon: () => `申告期限: 14日以内`,
        deadlineOverdue: () => `申告期限: 超過`,
        unassigned: () => `担当者: 未設定`,
        noReferrer: () => `紹介者: なし`,
    }

    const CHIP_STYLES: Record<string, string> = {
        internalReferrerId: "bg-slate-100 text-slate-700",
    }
    const DEFAULT_CHIP_STYLE = "bg-slate-100 text-slate-700"

    const activeFilters: ActiveFilterChip[] = []

    if (queryParams.caseAddedFrom || queryParams.caseAddedTo) {
        activeFilters.push({
            key: "caseAddedRange",
            label: `受託日: ${formatExclusiveDateRange(queryParams.caseAddedFrom, queryParams.caseAddedTo)}`,
            chipStyle: DEFAULT_CHIP_STYLE,
            onClear: () => {
                onFilterChange("caseAddedFrom", undefined)
                onFilterChange("caseAddedTo", undefined)
            },
        })
    }

    if (queryParams.caseCompletedFrom || queryParams.caseCompletedTo) {
        activeFilters.push({
            key: "caseCompletedRange",
            label: `申告完了日: ${formatExclusiveDateRange(queryParams.caseCompletedFrom, queryParams.caseCompletedTo)}`,
            chipStyle: DEFAULT_CHIP_STYLE,
            onClear: () => {
                onFilterChange("caseCompletedFrom", undefined)
                onFilterChange("caseCompletedTo", undefined)
            },
        })
    }

    if (queryParams.billedFrom || queryParams.billedTo) {
        activeFilters.push({
            key: "billedRange",
            label: `請求日: ${formatExclusiveDateRange(queryParams.billedFrom, queryParams.billedTo)}`,
            chipStyle: DEFAULT_CHIP_STYLE,
            onClear: () => {
                onFilterChange("billedFrom", undefined)
                onFilterChange("billedTo", undefined)
            },
        })
    }

    if (queryParams.paidFrom || queryParams.paidTo) {
        activeFilters.push({
            key: "paidRange",
            label: `入金日: ${formatExclusiveDateRange(queryParams.paidFrom, queryParams.paidTo)}`,
            chipStyle: DEFAULT_CHIP_STYLE,
            onClear: () => {
                onFilterChange("paidFrom", undefined)
                onFilterChange("paidTo", undefined)
            },
        })
    }

    activeFilters.push(...Object.entries(CHIP_LABELS)
        .filter(([key]) => queryParams[key as keyof CasesQueryParams])
        .map(([key, label]) => ({
            key,
            label: label(queryParams[key as keyof CasesQueryParams] as string | number),
            chipStyle: CHIP_STYLES[key] || DEFAULT_CHIP_STYLE,
            onClear: () => {
                if (key === 'search') setSearchInput('')
                onFilterChange(key as keyof CasesQueryParams, undefined)
            },
        })))

    const renderFilter = ({ key, placeholder, options, optGroups, multiSelect, wrapperClassName }: FilterDef) => {
        if (multiSelect) {
            const raw = queryParams[key] as string | undefined
            const selected = new Set(raw ? raw.split(',') : [])
            return (
                <MultiSelectDropdown
                    key={key}
                    placeholder={placeholder}
                    ariaLabel={`${placeholder}で絞り込み`}
                    options={options}
                    selected={selected}
                    onChange={(vals) => onFilterChange(key, vals.size > 0 ? Array.from(vals).join(',') : undefined)}
                />
            )
        }
        return (
            <SelectField
                key={key}
                aria-label={`${placeholder}で絞り込み`}
                wrapperClassName={wrapperClassName || FILTER_SELECT_WRAPPER}
                className="h-11 px-3 sm:h-10"
                value={String(queryParams[key] || "")}
                onChange={(e) => onFilterChange(key, e.target.value || undefined)}
            >
                <option value="">{placeholder}</option>
                {optGroups ? (
                    optGroups.map(group => (
                        <optgroup key={group.label} label={group.label}>
                            {group.options.map(({ value, label }) => (
                                <option key={String(value)} value={value}>{label}</option>
                            ))}
                        </optgroup>
                    ))
                ) : (
                    options.map(({ value, label }) => (
                        <option key={String(value)} value={value}>{label}</option>
                    ))
                )}
            </SelectField>
        )
    }

    const advancedFilterCount = [
        queryParams.department,
        queryParams.internalReferrerId,
    ].filter(Boolean).length

    const excludesClosed = queryParams.hideClosed && !queryParams.status && !queryParams.search
    if (excludesClosed) activeFilters.push({
        key: "hideClosed",
        label: "終了案件を除外（見送り・入金済）",
        chipStyle: DEFAULT_CHIP_STYLE,
        onClear: () => onFilterChange("hideClosed", "false"),
    })
    const canClear = activeFilters.length > 0 || Boolean(searchInput)
    const searchPending = searchInput !== (queryParams.search ?? "")

    return (
        <section className="space-y-3 p-3 sm:p-4" aria-label="案件の検索と絞り込み">
            {/* Row 1: 検索 + 件数表示 */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-0 basis-full sm:min-w-[240px] sm:basis-auto sm:flex-1">
                    <label htmlFor="case-search" className="sr-only">被相続人・相続人名で検索</label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="case-search"
                        type="search"
                        placeholder="被相続人・相続人名で検索..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="h-11 pl-9 pr-10 text-base sm:h-10 sm:text-sm"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput("")}
                            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="検索をクリア"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>


                {filterDefs.slice(0, 2).map(renderFilter)}
                <AssigneeFilter assignees={assignees} value={queryParams.assigneeId} onChange={value => onFilterChange("assigneeId", value)} />
                <button
                    type="button"
                    onClick={() => setAdvancedOpen((open) => !open)}
                    aria-expanded={advancedOpen}
                    aria-controls="advanced-case-filters"
                    className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    詳細条件
                    {advancedFilterCount > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                            {advancedFilterCount}
                        </span>
                    )}
                </button>

            </div>

            <section aria-label="現在の絞り込み条件" aria-busy={isUpdating || searchPending} className="border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex shrink-0 items-center gap-3">
                        <p role="status" className="whitespace-nowrap text-xs text-slate-600">{isUpdating || searchPending ? "検索結果を更新中…" : totalCount !== undefined ? <>検索結果 <strong className="text-sm font-semibold tabular-nums text-slate-900">{totalCount}件</strong></> : "検索結果を読み込み中…"}</p>
                        <div className="flex items-center gap-2" role="status">
                        <h2 className="text-xs font-medium text-slate-600">{activeFilters.length ? "絞り込み中" : "絞り込みなし"}</h2>
                        {activeFilters.length > 0 && <span className="text-xs font-semibold tabular-nums text-slate-600">{activeFilters.length}条件</span>}
                        </div>
                    </div>
                    {activeFilters.length > 0 ? <ul className="order-last flex min-w-0 basis-full flex-wrap items-center gap-x-2 gap-y-1 lg:order-none lg:flex-1 lg:basis-0">
                        {activeFilters.map(f => <li key={f.key} className={`inline-flex max-w-full items-center rounded-lg pl-2.5 text-xs font-medium ${f.chipStyle}`}>
                            <span className="min-w-0 break-all">{f.label}</span>
                            <button type="button" onClick={f.onClear} aria-label={`${f.label}を解除`}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r-lg transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </li>)}
                    </ul> : <p className="order-last min-w-0 basis-full text-xs text-slate-600 lg:order-none lg:flex-1 lg:basis-0">全年度・すべてのステータス</p>}
                    <div className="ml-auto flex max-w-full flex-wrap items-center gap-x-1">
                    <button type="button" onClick={onClearAll} disabled={!canClear} aria-label="条件をすべてクリア"
                        title="年度・担当者などを解除し、終了案件も含む全件を表示"
                        className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-default disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        <X className="h-3.5 w-3.5" aria-hidden="true" />条件をすべてクリア
                    </button>
                    <button type="button" onClick={() => { setAdvancedOpen(false); onResetDefaults() }} title="今年度・終了案件を除外した初期状態に戻す" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />初期表示に戻す
                    </button>

                    </div>
                </div>
            </section>


            {advancedOpen && (
                <div id="advanced-case-filters" className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
                    <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">詳細条件</span>
                    {filterDefs.slice(2).filter(f => f.key !== "assigneeId").map(renderFilter)}
                    <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={!queryParams.hideClosed} disabled={!!queryParams.status || !!queryParams.search}
                            onChange={e => onFilterChange("hideClosed", e.target.checked ? "false" : "true")}
                            className="h-4 w-4 accent-blue-700" />
                        終了案件も表示（見送り・入金済）
                    </label>
                    {(queryParams.status || queryParams.search) && <span className="text-xs text-slate-500">氏名・ステータス指定時は指定条件を優先します</span>}
                </div>
            )}
        </section>
    )
}
