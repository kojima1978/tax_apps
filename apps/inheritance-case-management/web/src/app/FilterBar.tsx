"use client"

import { useEffect, useRef } from "react"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { Search, X, Filter } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, ACCEPTANCE_STATUS_FILTER_OPTIONS, SORT_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { Assignee } from "@/types/shared"

const FILTER_SELECT_WRAPPER = "h-10 w-auto"

type SortField = 'deceasedName' | 'dateOfDeath' | 'fiscalYear' | 'status' | 'taxAmount' | 'feeAmount' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

interface FilterBarProps {
    queryParams: CasesQueryParams
    searchInput: string
    setSearchInput: (val: string) => void
    onSearch: () => void
    onFilterChange: (key: keyof CasesQueryParams, value: string | undefined) => void
    onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void
    onClearAll: () => void
    assignees: Assignee[]
    totalCount?: number
    hasFilters: boolean
}

// Data-driven filter definitions
const FILTER_DEFS: { key: keyof CasesQueryParams; placeholder: string; options: readonly { value: string | number; label: string }[] }[] = [
    { key: "status", placeholder: "ステータス", options: CASE_STATUS_FILTER_OPTIONS },
    { key: "acceptanceStatus", placeholder: "受託状況", options: ACCEPTANCE_STATUS_FILTER_OPTIONS },
    { key: "fiscalYear", placeholder: "年度", options: FILTER_YEAR_OPTIONS.map(y => ({ value: y, label: `${y}年度` })) },
]

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onSortChange, onClearAll, assignees, totalCount, hasFilters,
}: FilterBarProps) {
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

    const ACTIVE_FILTER_DEFS: { key: keyof CasesQueryParams; label: (v: string | number) => string }[] = [
        { key: 'search', label: (v) => `検索: ${v}` },
        { key: 'status', label: (v) => `ステータス: ${v}` },
        { key: 'acceptanceStatus', label: (v) => `受託: ${v}` },
        { key: 'fiscalYear', label: (v) => `年度: ${v}年度` },
        { key: 'assigneeId', label: (v) => `担当: ${assignees.find(a => a.id === v)?.name || v}` },
    ]
    const activeFilters = ACTIVE_FILTER_DEFS
        .filter(({ key }) => queryParams[key])
        .map(({ key, label }) => ({ key, label: label(queryParams[key] as string | number) }))

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
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        すべてクリア
                    </button>
                </div>
            )}

            {/* Row 2: フィルター + ソート */}
            <div className="flex gap-2 flex-wrap">
                {FILTER_DEFS.map(({ key, placeholder, options }) => (
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
                ))}
                <SelectField
                    wrapperClassName={FILTER_SELECT_WRAPPER}
                    value={queryParams.assigneeId || ""}
                    onChange={(e) => onFilterChange("assigneeId", e.target.value)}
                >
                    <option value="">担当者</option>
                    {assignees.filter(a => a.active).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </SelectField>
                <SelectField
                    wrapperClassName={FILTER_SELECT_WRAPPER}
                    value={`${queryParams.sortBy || 'createdAt'}_${queryParams.sortOrder || 'desc'}`}
                    onChange={(e) => {
                        const [field, order] = e.target.value.split('_') as [SortField, SortOrder]
                        onSortChange(field, order)
                    }}
                >
                    {SORT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </SelectField>
            </div>
        </div>
    )
}
