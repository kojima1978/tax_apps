"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Search, X, Filter } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, ACCEPTANCE_STATUS_FILTER_OPTIONS, SORT_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { CaseStatus, AcceptanceStatus, Assignee } from "@/types/shared"

const SELECT_CLASS = "border rounded px-3 py-2 text-sm bg-background"

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
}

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onSortChange, onClearAll, assignees, totalCount,
}: FilterBarProps) {
    const hasFilters = !!(queryParams.search || queryParams.status || queryParams.acceptanceStatus || queryParams.fiscalYear || queryParams.assignee)
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

    const activeFilterCount = [
        queryParams.search,
        queryParams.status,
        queryParams.acceptanceStatus,
        queryParams.fiscalYear,
        queryParams.assignee,
    ].filter(Boolean).length

    return (
        <div className="space-y-3 mb-4">
            {/* Row 1: 検索 + フィルターバッジ */}
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

                {hasFilters && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                            <Filter className="h-3 w-3" />
                            {activeFilterCount}件の絞り込み
                            {totalCount !== undefined && (
                                <span className="text-primary/70">({totalCount}件表示)</span>
                            )}
                        </span>
                        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 px-2 text-xs">
                            <X className="h-3 w-3 mr-1" />
                            クリア
                        </Button>
                    </div>
                )}
            </div>

            {/* Row 2: フィルター + ソート */}
            <div className="flex gap-2 flex-wrap">
                <select
                    className={SELECT_CLASS}
                    value={queryParams.status || ""}
                    onChange={(e) => onFilterChange("status", e.target.value as CaseStatus)}
                >
                    <option value="">ステータス</option>
                    {CASE_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.acceptanceStatus || ""}
                    onChange={(e) => onFilterChange("acceptanceStatus", e.target.value as AcceptanceStatus)}
                >
                    <option value="">受託状況</option>
                    {ACCEPTANCE_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.fiscalYear || ""}
                    onChange={(e) => onFilterChange("fiscalYear", e.target.value)}
                >
                    <option value="">年度</option>
                    {FILTER_YEAR_OPTIONS.map(year => (
                        <option key={year} value={year}>{year}年度</option>
                    ))}
                </select>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.assignee || ""}
                    onChange={(e) => onFilterChange("assignee", e.target.value)}
                >
                    <option value="">担当者</option>
                    {assignees.filter(a => a.active).map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                </select>
                <select
                    className={SELECT_CLASS}
                    value={`${queryParams.sortBy || 'createdAt'}_${queryParams.sortOrder || 'desc'}`}
                    onChange={(e) => {
                        const [field, order] = e.target.value.split('_') as [SortField, SortOrder]
                        onSortChange(field, order)
                    }}
                >
                    {SORT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
