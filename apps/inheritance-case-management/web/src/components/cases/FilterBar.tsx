"use client"

import { useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import { Search, X, Filter } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, HANDLING_STATUS_FILTER_OPTIONS, ACCEPTANCE_STATUS_FILTER_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { Assignee, Department } from "@/types/shared"

const FILTER_SELECT_WRAPPER = "h-9 w-auto px-2 py-1 text-xs"
const REFERRER_SELECT_WRAPPER = "h-9 w-auto border-input px-2 py-1 text-xs"

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
    { key: "acceptanceStatus", placeholder: "受託状況", options: ACCEPTANCE_STATUS_FILTER_OPTIONS, multiSelect: true },
    { key: "status", placeholder: "進み具合", options: CASE_STATUS_FILTER_OPTIONS, multiSelect: true },
    { key: "handlingStatus", placeholder: "対応状況", options: HANDLING_STATUS_FILTER_OPTIONS, multiSelect: true },
]

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onClearAll, assignees, departments, totalCount, hasFilters,
}: FilterBarProps) {
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
        status: (v) => `進み具合: ${v}`,
        handlingStatus: (v) => `対応状況: ${v}`,
        acceptanceStatus: (v) => `受託: ${v}`,
        fiscalYear: (v) => `年度: ${v}年度`,
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

    activeFilters.push(...Object.entries(CHIP_LABELS)
        .filter(([key]) => queryParams[key as keyof CasesQueryParams])
        .map(([key, label]) => ({
            key,
            label: label(queryParams[key as keyof CasesQueryParams] as string | number),
            chipStyle: CHIP_STYLES[key] || DEFAULT_CHIP_STYLE,
            onClear: () => key === 'search' ? setSearchInput('') : onFilterChange(key as keyof CasesQueryParams, undefined),
        })))

    return (
        <div className="space-y-2 mb-3">
            {/* Row 1: 検索 + 件数表示 */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-44 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="被相続人名で検索..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="h-9 pl-9 pr-8 text-xs"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            aria-label="検索をクリア"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {hasFilters && totalCount !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
                                className="hover:bg-black/10 rounded-full p-1 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                                aria-label={`${f.label}を解除`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button onClick={onClearAll} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        すべてクリア
                    </button>
                </div>
            )}

            {/* Row 2: フィルター + ソート */}
            <div className="flex gap-1.5 flex-wrap items-center">
                {filterDefs.map(({ key, placeholder, options, optGroups, multiSelect, wrapperClassName }) => {
                    if (multiSelect) {
                        const raw = queryParams[key] as string | undefined
                        const selected = new Set(raw ? raw.split(',') : [])
                        return (
                            <MultiSelectDropdown
                                key={key}
                                placeholder={placeholder}
                                options={options}
                                selected={selected}
                                onChange={(vals) => onFilterChange(key, vals.size > 0 ? Array.from(vals).join(',') : undefined)}
                            />
                        )
                    }
                    return (
                        <SelectField
                            key={key}
                            wrapperClassName={wrapperClassName || FILTER_SELECT_WRAPPER}
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
                })}
            </div>
        </div>
    )
}
