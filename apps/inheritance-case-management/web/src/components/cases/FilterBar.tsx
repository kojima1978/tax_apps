"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import { Search, X, Filter, SlidersHorizontal } from "lucide-react"
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
    assignees: Assignee[]
    departments: Department[]
    totalCount?: number
    hasFilters: boolean
}

const STATIC_FILTER_DEFS: FilterDef[] = [
    { key: "fiscalYear", placeholder: "年度", options: FILTER_YEAR_OPTIONS.map(y => ({ value: y, label: `${y}年度` })) },
    { key: "status", placeholder: "ステータス", options: CASE_STATUS_FILTER_OPTIONS, multiSelect: true },
]

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onClearAll, assignees, departments, totalCount, hasFilters,
}: FilterBarProps) {
    const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(
        queryParams.department || queryParams.assigneeId || queryParams.internalReferrerId
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
        status: (v) => `ステータス: ${v}`,
        fiscalYear: (v) => `年度: ${v}年度`,
        fiscalYears: (v) => `年度: ${String(v).split(',').join('・')}`,
        department: (v) => `部門: ${v}`,
        assigneeId: (v) => `担当: ${assignees.find(a => a.id === v)?.name || v}`,
        internalReferrerId: (v) => `紹介者: ${assignees.find(a => a.id === v)?.name || v}`,
        staffId: (v) => `担当・紹介: ${assignees.find(a => a.id === v)?.name || v}`,
        referrerCompany: (v) => `紹介会社: ${v}`,
        deadlineSoon: () => `期限間近`,
        unassigned: () => `担当者: 未設定`,
        noReferrer: () => `紹介者: なし`,
    }

    const CHIP_STYLES: Record<string, string> = {
        internalReferrerId: "border border-black/10 bg-white text-black",
    }
    const DEFAULT_CHIP_STYLE = "border border-black/10 bg-white text-black"

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
            onClear: () => key === 'search' ? setSearchInput('') : onFilterChange(key as keyof CasesQueryParams, undefined),
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
        queryParams.assigneeId,
        queryParams.internalReferrerId,
    ].filter(Boolean).length

    return (
        <section className="mb-4 space-y-3" aria-label="案件の検索と絞り込み">
            {/* Row 1: 検索 + 件数表示 */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
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

                {hasFilters && totalCount !== undefined && (
                    <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" aria-live="polite">
                        <Filter className="h-3 w-3" />
                        {totalCount}件表示
                    </span>
                )}
            </div>

            {/* フィルターチップ */}
            {activeFilters.length > 0 && (
                <div className="flex gap-1.5 flex-wrap items-center">
                    {activeFilters.map(f => (
                        <span key={f.key} className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-0.5 text-[11px] font-medium ${f.chipStyle}`}>
                            {f.label}
                            <button
                                onClick={f.onClear}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-black/10"
                                aria-label={`${f.label}を解除`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button onClick={onClearAll} className="min-h-11 cursor-pointer rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        すべてクリア
                    </button>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {filterDefs.slice(0, 2).map(renderFilter)}
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
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {advancedFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {advancedOpen && (
                <div id="advanced-case-filters" className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
                    <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">詳細条件</span>
                    {filterDefs.slice(2).map(renderFilter)}
                </div>
            )}
        </section>
    )
}
