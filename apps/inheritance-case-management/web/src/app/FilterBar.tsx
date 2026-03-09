import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Search, ArrowUpDown } from "lucide-react"
import type { CasesQueryParams } from "@/lib/api/cases"
import { CASE_STATUS_FILTER_OPTIONS, ACCEPTANCE_STATUS_FILTER_OPTIONS, SORT_OPTIONS, FILTER_YEAR_OPTIONS } from "@/types/constants"
import type { CaseStatus, AcceptanceStatus } from "@/types/shared"

const SELECT_CLASS = "border rounded px-3 py-2 text-sm"

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
}

export function FilterBar({
    queryParams, searchInput, setSearchInput, onSearch, onFilterChange, onSortChange, onClearAll,
}: FilterBarProps) {
    const hasFilters = !!(queryParams.search || queryParams.status || queryParams.acceptanceStatus || queryParams.fiscalYear)

    return (
        <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex gap-2">
                <Input
                    placeholder="被相続人名で検索..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    className="w-48 md:w-64"
                />
                <Button variant="outline" onClick={onSearch}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>
            <select
                className={SELECT_CLASS}
                value={queryParams.status || ""}
                onChange={(e) => onFilterChange("status", e.target.value as CaseStatus)}
            >
                <option value="">ステータス: すべて</option>
                {CASE_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
            <select
                className={SELECT_CLASS}
                value={queryParams.acceptanceStatus || ""}
                onChange={(e) => onFilterChange("acceptanceStatus", e.target.value as AcceptanceStatus)}
            >
                <option value="">受託状況: すべて</option>
                {ACCEPTANCE_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
            <select
                className={SELECT_CLASS}
                value={queryParams.fiscalYear || ""}
                onChange={(e) => onFilterChange("fiscalYear", e.target.value)}
            >
                <option value="">年度: すべて</option>
                {FILTER_YEAR_OPTIONS.map(year => (
                    <option key={year} value={year}>{year}年度</option>
                ))}
            </select>
            <div className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
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
            {hasFilters && (
                <Button variant="ghost" onClick={onClearAll}>
                    フィルタをクリア
                </Button>
            )}
        </div>
    )
}
