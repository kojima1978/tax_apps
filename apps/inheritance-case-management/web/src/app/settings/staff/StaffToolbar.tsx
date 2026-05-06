import { ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField } from "@/components/ui/SelectField"
import type { Department } from "@/types/shared"

interface StaffToolbarProps {
    activeDepts: Department[]
    filterDept: string
    showInactive: boolean
    allExpanded: boolean
    onFilterDeptChange: (value: string) => void
    onToggleShowInactive: () => void
    onToggleExpandAll: () => void
    onStartAddDepartment: () => void
}

export function StaffToolbar({
    activeDepts,
    filterDept,
    showInactive,
    allExpanded,
    onFilterDeptChange,
    onToggleShowInactive,
    onToggleExpandAll,
    onStartAddDepartment,
}: StaffToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            <SelectField
                value={filterDept}
                onChange={e => onFilterDeptChange(e.target.value)}
                className="w-48 h-9 text-sm"
            >
                <option value="">すべての部署</option>
                {activeDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                <option value="none">部署なし</option>
            </SelectField>

            <Button variant="outline" size="sm" onClick={onToggleShowInactive}>
                {showInactive ? "有効のみ表示" : "すべて表示"}
            </Button>

            <Button variant="outline" size="sm" onClick={onToggleExpandAll}>
                <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                {allExpanded ? "全て閉じる" : "全て開く"}
            </Button>

            <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={onStartAddDepartment}>
                    <Plus className="h-3.5 w-3.5 mr-1" />部署追加
                </Button>
            </div>
        </div>
    )
}
