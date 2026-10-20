import { Building2, ChevronDown } from "lucide-react"
import { AssigneeRow } from "./AssigneeRow"
import type { StaffGroup } from "./staff-utils"

interface StaffGroupListProps {
    groups: StaffGroup[]
    expandedDepts: Set<string>
    onToggleDeptExpanded: (key: string) => void
}

export function StaffGroupList({ groups, expandedDepts, onToggleDeptExpanded }: StaffGroupListProps) {
    if (groups.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">該当する担当者がいません</p>
    }

    return (
        <div className="space-y-4">
            {groups.map(({ dept, members }) => {
                const expandKey = dept ? String(dept.id) : "none"
                const isExpanded = expandedDepts.has(expandKey)

                return (
                    <div key={dept ? `dept-${dept.id}` : "no-dept"} className="border rounded-lg bg-card overflow-hidden">
                        <button
                            className={`flex items-center gap-2 w-full px-4 py-2.5 bg-muted/40 ${isExpanded ? "border-b" : ""}`}
                            onClick={() => onToggleDeptExpanded(expandKey)}
                        >
                            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                            <Building2 className="h-4 w-4 text-black/70 shrink-0" />
                            <span className="text-sm font-semibold truncate flex-1 text-left">{dept?.name || "部署なし"}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{members.length}名</span>
                        </button>

                        {isExpanded && (
                            <div className="divide-y">
                                {members.map(assignee => <AssigneeRow key={assignee.id} assignee={assignee} />)}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
