"use client"

import { useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import { Search, X, Filter } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, HANDLING_STATUS_FILTER_OPTIONS, ACCEPTANCE_STATUS_FILTER_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { Assignee, Department } from "@/types/shared"

const FILTER_SELECT_WRAPPER = "h-10 w-auto"

type FilterDef = { key: keyof CasesQueryParams; placeholder: string; options: readonly { value: string | number; label: string }[]; multiSelect?: boolean }
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
    const filterDefs: FilterDef[] = useMemo(() => [
        ...STATIC_FILTER_DEFS,
        { key: "department" as const, placeholder: "部門", options: departments.filter(d => d.active).map(d => ({ value: d.name, label: d.name })) },
        { key: "assigneeId" as const, placeholder: "担当者", options: assignees.filter(a => a.active).map(a => ({ value: a.id, label: a.name })) },
    ], [assignees, departments])

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
    }
    const activeFilters = Object.entries(CHIP_LABELS)
        .filter(([key]) => queryParams[key as keyof CasesQueryParams])
        .map(([key, label]) => ({ key, label: label(queryParams[key as keyof CasesQueryParams] as string | number) }))

    return (
        <div className="space-y-3 mb-4">
            {/* Row 1: 検索 + 件数表示 */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="被相続人名で検索..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9 pr-8"
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
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                        <Filter className="h-3 w-3" />
                        {totalCount}件表示
                    </span>
                )}
            </div>

            {/* フィルターチップ */}
            {activeFilters.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                    {activeFilters.map(f => (
                        <span key={f.key} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs pl-2.5 pr-1 py-1 rounded-full font-medium">
                            {f.label}
                            <button
                                onClick={() => f.key === 'search' ? setSearchInput('') : onFilterChange(f.key as keyof CasesQueryParams, undefined)}
                                className="hover:bg-primary/20 rounded-full p-1.5 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                                aria-label={`${f.label}を解除`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        すべてクリア
                    </button>
                </div>
            )}

            {/* Row 2: フィルター + ソート */}
            <div className="flex gap-2 flex-wrap items-center">
                {filterDefs.map(({ key, placeholder, options, multiSelect }) => {
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
                            wrapperClassName={FILTER_SELECT_WRAPPER}
                            value={queryParams[key] || ""}
                            onChange={(e) => onFilterChange(key, e.target.value || undefined)}
                        >
                            <option value="">{placeholder}</option>
                            {options.map(({ value, label }) => (
                                <option key={String(value)} value={value}>{label}</option>
                            ))}
                        </SelectField>
                    )
                })}
            </div>
        </div>
    )
}
